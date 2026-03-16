import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SelectedExtra {
  id: string;
  description: string;
  price: number;
  qty: number;
}

// Split % by subscription product ID
const PLAN_SPLITS: Record<string, number> = {
  "prod_U8PSBb6bJj3mQV": 5,  // Starter
  "prod_U8PXjCdBxWHHvT": 3,  // Pro
  "prod_U8PYo2ocBqxIFO": 1,  // Studio
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      bookingId: existingBookingId,
      sessionId,
      slotId,
      bookedDate,
      startTime,
      clientEmail,
      clientName,
      selectedExtras = [],
    } = await req.json();

    // Format booking date & time for display (12-hour AM/PM)
    const formatBookedDate = (dateStr: string): string => {
      const [y, m, d] = dateStr.split("-").map(Number);
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    };
    const formatTime12 = (time: string): string => {
      const [h, min] = time.split(":").map(Number);
      const period = h >= 12 ? "PM" : "AM";
      const hour12 = h % 12 || 12;
      return `${hour12}:${String(min).padStart(2, "0")} ${period}`;
    };
    const bookingDateLabel = bookedDate ? formatBookedDate(bookedDate) : null;
    const bookingTimeLabel = startTime ? formatTime12(startTime) : null;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch session data
    const { data: sessionData, error: sessionError } = await supabase
      .from("sessions")
      .select("title, price, photographer_id, deposit_enabled, deposit_amount, deposit_type, tax_rate, duration_minutes, location")
      .eq("id", sessionId)
      .single();

    if (sessionError || !sessionData) {
      throw new Error("Session not found");
    }

    // Fetch photographer data
    const { data: photoData } = await supabase
      .from("photographers")
      .select("store_slug, stripe_account_id, email")
      .eq("id", sessionData.photographer_id)
      .single();

    const storeSlug = photoData?.store_slug ?? "";
    let stripeAccountId = (photoData as any)?.stripe_account_id as string | null;

    const origin = req.headers.get("origin") ?? "https://localhost:5173";
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
      apiVersion: "2025-08-27.basil",
    });

    // ── Create or reuse booking (service role bypasses RLS) ──
    let bookingId = existingBookingId as string | undefined;
    if (!bookingId) {
      const { data: newBooking, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          session_id: sessionId,
          availability_id: slotId,
          photographer_id: sessionData.photographer_id,
          client_name: clientName,
          client_email: clientEmail,
          status: "pending",
          payment_status: "pending",
          booked_date: bookedDate,
        })
        .select("id")
        .single();
      if (bookingError || !newBooking) {
        throw new Error(bookingError?.message ?? "Failed to create booking");
      }
      bookingId = newBooking.id;
    }

    // ── Lazy Connect: auto-create account on first checkout ──
    let onboardingRequired = false;
    if (!stripeAccountId) {
      const photographerEmail = (photoData as any)?.email as string | undefined;
      const account = await stripe.accounts.create({
        type: "custom",
        email: photographerEmail,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
      stripeAccountId = account.id;
      onboardingRequired = true;
      // Persist the new account id (no stripe_connected_at yet — onboarding still pending)
      await supabase
        .from("photographers")
        .update({ stripe_account_id: stripeAccountId } as any)
        .eq("id", sessionData.photographer_id);
    }

    // ── Sync photographer branding to Stripe Connect account ──
    try {
      const { data: siteData } = await supabase
        .from("photographer_site")
        .select("logo_url, accent_color")
        .eq("photographer_id", sessionData.photographer_id)
        .single();

      if (siteData?.logo_url && stripeAccountId) {
        const imgResp = await fetch(siteData.logo_url);
        if (imgResp.ok) {
          const imgBlob = await imgResp.blob();
          const uploadedFile = await stripe.files.create(
            { purpose: "business_logo", file: imgBlob },
            { stripeAccount: stripeAccountId }
          );
          const brandingParams: Record<string, string> = { logo: uploadedFile.id };
          if (siteData.accent_color) {
            const hex = siteData.accent_color.startsWith("#")
              ? siteData.accent_color
              : `#${siteData.accent_color}`;
            brandingParams.primary_color = hex;
          }
          await stripe.accounts.update(stripeAccountId, {
            settings: { branding: brandingParams as any },
          });
        }
      }
    } catch (_brandingErr) {
      // Non-fatal: branding failure must not block checkout
    }

    // Determine split % from photographer's platform subscription
    let splitPercent = 5; // default
    try {
      const photographerEmail = (photoData as any)?.email;
      if (photographerEmail) {
        const platformCustomers = await stripe.customers.list({ email: photographerEmail, limit: 1 });
        if (platformCustomers.data.length > 0) {
          const subs = await stripe.subscriptions.list({
            customer: platformCustomers.data[0].id,
            status: "active",
            limit: 1,
          });
          if (subs.data.length > 0) {
            const productId = subs.data[0].items.data[0].price.product as string;
            if (PLAN_SPLITS[productId] !== undefined) {
              splitPercent = PLAN_SPLITS[productId];
            }
          }
        }
      }
    } catch (_) { /* non-fatal — use default */ }

    // Check for existing Stripe customer on the connected account
    const customers = await stripe.customers.list(
      { email: clientEmail, limit: 1 },
      { stripeAccount: stripeAccountId }
    );
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // ── Helper: format BRL cents to readable string ──
    const fmt = (cents: number) =>
      (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    // ── Build line items ──
    const extras: SelectedExtra[] = selectedExtras ?? [];
    const extrasTotal = extras.reduce((sum: number, e: SelectedExtra) => sum + e.price * e.qty, 0);
    const sessionPrice = sessionData.price as number;
    const subtotal = sessionPrice + extrasTotal;
    const taxRate = (sessionData.tax_rate as number) ?? 0;
    const taxAmount = Math.round(subtotal * (taxRate / 100));
    const fullTotal = subtotal + taxAmount;

    const durationMin = (sessionData.duration_minutes as number) ?? null;
    const location = (sessionData.location as string) ?? null;

    const isDeposit = sessionData.deposit_enabled as boolean;
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    // Build session meta line for description
    const sessionMeta = [
      durationMin ? `${durationMin} min` : null,
      location ?? null,
    ].filter(Boolean).join(" · ");

    // ── Local variable for deposit custom_text (set in deposit branch) ──
    let remainingBalance: number | undefined;

    // ── Short description: date + time + location (Stripe renders description inline, no line breaks) ──
    const shortDesc = [
      bookingDateLabel && bookingTimeLabel
        ? `📅 ${bookingDateLabel} at ${bookingTimeLabel}`
        : bookingDateLabel
        ? `📅 ${bookingDateLabel}`
        : null,
      sessionMeta ? `📍 ${sessionMeta}` : null,
    ].filter(Boolean).join("  ·  ") || undefined;

    if (isDeposit) {
      const depositType = sessionData.deposit_type as string;
      const isPercentDeposit = depositType === "percent" || depositType === "percentage";
      const depositBase = isPercentDeposit
        ? Math.round(fullTotal * ((sessionData.deposit_amount as number) / 100))
        : (sessionData.deposit_amount as number);
      remainingBalance = fullTotal - depositBase;

      lineItems.push({
        price_data: {
          currency: "brl",
          product_data: {
            name: `${sessionData.title} — Deposit`,
            description: shortDesc,
            metadata: { booking_id: bookingId, session_id: sessionId },
          },
          unit_amount: depositBase,
        },
        quantity: 1,
      });
    } else {
      // Full payment: each line item is its own row → natural column layout ✓
      lineItems.push({
        price_data: {
          currency: "brl",
          product_data: {
            name: sessionData.title,
            description: shortDesc,
            metadata: { booking_id: bookingId, session_id: sessionId },
          },
          unit_amount: sessionPrice,
        },
        quantity: 1,
      });

      for (const extra of extras) {
        lineItems.push({
          price_data: {
            currency: "brl",
            product_data: {
              name: extra.description,
              description: extra.qty > 1
                ? `${extra.qty} units × ${fmt(extra.price)} each`
                : undefined,
            },
            unit_amount: extra.price,
          },
          quantity: extra.qty,
        });
      }

      if (taxAmount > 0) {
        lineItems.push({
          price_data: {
            currency: "brl",
            product_data: {
              name: `Tax (${taxRate}%)`,
              description: `Applied on subtotal of ${fmt(subtotal)}`,
            },
            unit_amount: taxAmount,
          },
          quantity: 1,
        });
      }
    }

    // Calculate total for application fee
    const checkoutTotal = lineItems.reduce((sum, item) => {
      const unitAmount = (item.price_data as any)?.unit_amount ?? 0;
      const qty = item.quantity ?? 1;
      return sum + unitAmount * qty;
    }, 0);
    const applicationFeeAmount = Math.round(checkoutTotal * (splitPercent / 100));

    // ── custom_text: financial breakdown in column format (markdown supported) ──
    // For deposits: show the full breakdown above the Pay button since description is inline-only
    let customText: Record<string, { message: string }> | undefined;
    if (isDeposit && remainingBalance !== undefined) {
      const depositBase = fullTotal - remainingBalance;
      const rows = [
        `Session: **${fmt(sessionPrice)}**`,
        extrasTotal > 0 ? `Add-ons: **${fmt(extrasTotal)}**` : null,
        taxAmount > 0 ? `Tax (${taxRate}%): **${fmt(taxAmount)}**` : null,
        `Total: **${fmt(fullTotal)}**`,
        `Deposit paid today: **${fmt(depositBase)}**`,
        `Remaining balance: **${fmt(remainingBalance)}**`,
      ].filter(Boolean).join("  ·  ");
      customText = {
        submit: {
          message: `${rows}\n\nThe remaining balance is due after your session, before photo delivery.`,
        },
        after_submit: {
          message: `✅ Session confirmed. The photographer will collect the **${fmt(remainingBalance)}** balance before delivering your photos.`,
        },
      };
    }

    // Create checkout session on the connected account
    const checkout = await stripe.checkout.sessions.create(
      {
        customer: customerId,
        customer_email: customerId ? undefined : clientEmail,
        line_items: lineItems,
        mode: "payment",
        ...(customText ? { custom_text: customText } : {}),
        payment_intent_data: applicationFeeAmount > 0 ? {
          application_fee_amount: applicationFeeAmount,
        } : undefined,
        metadata: {
          booking_id: bookingId,
          slot_id: slotId,
          store_slug: storeSlug,
          client_name: clientName,
          session_id: sessionId,
          is_deposit: isDeposit ? "true" : "false",
        },
        success_url: `${origin}/booking-success?store=${storeSlug}&session=${sessionId}&booking=${bookingId}`,
        cancel_url: `${origin}/store/${storeSlug}/${sessionId}`,
      },
      { stripeAccount: stripeAccountId }
    );

    // Save checkout session id + extras_total to booking
    await supabase
      .from("bookings")
      .update({ stripe_checkout_session_id: checkout.id, extras_total: extrasTotal })
      .eq("id", bookingId);

    return new Response(JSON.stringify({ url: checkout.url, onboarding_required: onboardingRequired }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
