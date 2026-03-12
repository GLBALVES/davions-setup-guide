import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Plan config
const PLANS = {
  starter: {
    price_id: "price_1TA8dwHHNUkUYwCFqxyHaXwX",
    product_id: "prod_U8PSBb6bJj3mQV",
    name: "Starter",
    amount: 2900,
    split_percent: 5,
  },
  pro: {
    price_id: "price_1TA8iRHHNUkUYwCFWoTJx7FD",
    product_id: "prod_U8PXjCdBxWHHvT",
    name: "Pro",
    amount: 6900,
    split_percent: 3,
  },
  studio: {
    price_id: "price_1TA8j8HHNUkUYwCFxFY4uY1U",
    product_id: "prod_U8PYo2ocBqxIFO",
    name: "Studio",
    amount: 12900,
    split_percent: 1,
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No customer found");
      return new Response(JSON.stringify({ subscribed: false, plan: null, split_percent: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      logStep("No active subscription found");
      return new Response(JSON.stringify({ subscribed: false, plan: null, split_percent: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const sub = subscriptions.data[0];
    const productId = sub.items.data[0].price.product as string;
    const priceId = sub.items.data[0].price.id;
    const subscriptionEnd = sub.current_period_end
      ? new Date(sub.current_period_end * 1000).toISOString()
      : null;

    // Determine plan
    let planKey: string | null = null;
    let splitPercent = 5;
    let planName = "Unknown";

    for (const [key, planData] of Object.entries(PLANS)) {
      if (planData.product_id === productId || planData.price_id === priceId) {
        planKey = key;
        splitPercent = planData.split_percent;
        planName = planData.name;
        break;
      }
    }

    logStep("Active subscription found", { planKey, productId, subscriptionEnd });

    return new Response(JSON.stringify({
      subscribed: true,
      plan: planKey,
      plan_name: planName,
      split_percent: splitPercent,
      subscription_end: subscriptionEnd,
      subscription_id: sub.id,
      product_id: productId,
      price_id: priceId,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
