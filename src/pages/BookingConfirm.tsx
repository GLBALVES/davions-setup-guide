import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { resolveContractVariables } from "@/pages/dashboard/ContractEditor";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PagarmeCheckoutModal } from "@/components/booking/PagarmeCheckoutModal";
import {
  Calendar,
  Camera,
  Check,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  ClipboardList,
  Clock,
  FileText,
  Loader2,
  MapPin,
  CreditCard,
  UserCircle,
  Eye,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

/* ── Types ──────────────────────────────────────────── */

interface BookingData {
  id: string;
  client_name: string;
  client_email: string;
  booked_date: string | null;
  status: string;
  payment_status: string;
  availability_id: string;
  session_id: string;
  photographer_id: string;
}

interface SessionData {
  title: string;
  duration_minutes: number;
  location: string | null;
  num_photos: number;
  cover_image_url: string | null;
  briefing_id: string | null;
  contract_text: string | null;
  contract_id: string | null;
  price: number;
  session_model: string | null;
  deposit_enabled?: boolean;
  deposit_amount?: number;
  deposit_type?: string;
  tax_rate?: number;
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
}

interface AvailData {
  start_time: string;
  end_time: string;
}

interface BonusItem {
  text: string;
}

type QuestionType = "short_text" | "long_text" | "multiple_choice" | "checkboxes" | "yes_no" | "multi_image";

interface BriefingQuestion {
  id: string;
  type: QuestionType;
  label: string;
  required: boolean;
  options: string[];
  max_select?: number | null;
}

interface BriefingData {
  id: string;
  name: string;
  questions: BriefingQuestion[];
}

interface PhotographerData {
  full_name: string;
  store_slug: string | null;
  business_name?: string | null;
  business_address?: string | null;
  business_city?: string | null;
  business_state?: string | null;
  business_zip?: string | null;
  business_country?: string | null;
  business_phone?: string | null;
}

/* ── Helpers ────────────────────────────────────────── */

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(t: string) {
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

function formatCurrency(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

type StepKey = "details" | "client_info" | "briefing" | "contract" | "payment";

interface ClientInfo {
  full_name: string;
  phone: string;
  tax_id: string;
  birth_date: string;
  address_street: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  address_country: string;
  instagram: string;
}

interface StepDef {
  key: StepKey;
  label: string;
  icon: React.ReactNode;
}

/* ── Component ──────────────────────────────────────── */

const BookingConfirm = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [session, setSession] = useState<SessionData | null>(null);
  const [avail, setAvail] = useState<AvailData | null>(null);
  const [bonuses, setBonuses] = useState<BonusItem[]>([]);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [photographer, setPhotographer] = useState<PhotographerData | null>(null);
  const [currentStep, setCurrentStep] = useState(0);

  // Briefing state
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [briefingSubmitted, setBriefingSubmitted] = useState(false);
  const [alreadySubmittedBriefing, setAlreadySubmittedBriefing] = useState(false);
  const [submittingBriefing, setSubmittingBriefing] = useState(false);

  // Client info state
  const [clientInfo, setClientInfo] = useState<ClientInfo>({
    full_name: "",
    phone: "",
    tax_id: "",
    birth_date: "",
    address_street: "",
    address_city: "",
    address_state: "",
    address_zip: "",
    address_country: "",
    instagram: "",
  });
  const [clientInfoSaved, setClientInfoSaved] = useState(false);
  const [savingClientInfo, setSavingClientInfo] = useState(false);

  // Contract state
  const [contractAccepted, setContractAccepted] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const signatureRef = useRef<any>(null);
  const [contractPreviewOpen, setContractPreviewOpen] = useState(false);
  const [contractCustomFields, setContractCustomFields] = useState<Array<{ id: string; field_key: string; field_label: string; default_value: string; value_source?: string | null; mapped_key?: string | null; client_prompt?: string | null; client_input_type?: string | null; required?: boolean | null }>>([]);
  const [customFieldAnswers, setCustomFieldAnswers] = useState<Record<string, string>>({});

  // LGPD consent
  const [privacyConsent, setPrivacyConsent] = useState(false);

  // Payment state
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [pagarmeModal, setPagarmeModal] = useState<{
    open: boolean;
    checkoutInput: Record<string, unknown>;
    amount: number;
    isDeposit: boolean;
  } | null>(null);
  const [isSavingContinue, setIsSavingContinue] = useState(false);

  useEffect(() => {
    if (!bookingId) { setLoading(false); return; }

    const load = async () => {
      const { data: fnResult, error: fnError } = await supabase.functions.invoke("get-booking-public", {
        body: { booking_id: bookingId },
      });
      const bData = fnError ? null : fnResult?.booking;

      if (!bData) { setLoading(false); return; }
      const b = bData as BookingData;
      setBooking(b);
      setClientInfo((prev) => ({ ...prev, full_name: b.client_name || "" }));

      if (fnResult?.session) setSession(fnResult.session as SessionData);
      if (fnResult?.availability) setAvail(fnResult.availability as AvailData);
      if (fnResult?.photographer) setPhotographer(fnResult.photographer as PhotographerData);
      if (Array.isArray(fnResult?.contractCustomFields)) setContractCustomFields(fnResult.contractCustomFields);

      if (fnResult?.client) {
        const existingClient = fnResult.client;
        setClientInfo({
          full_name: existingClient.full_name || b.client_name || "",
          phone: existingClient.phone || "",
          tax_id: existingClient.tax_id || "",
          birth_date: existingClient.birth_date || "",
          address_street: existingClient.address_street || "",
          address_city: existingClient.address_city || "",
          address_state: existingClient.address_state || "",
          address_zip: existingClient.address_zip || "",
          address_country: existingClient.address_country || "",
          instagram: existingClient.instagram || "",
        });
        setClientInfoSaved(true);
      }

      const [sessRes, availRes, photoRes] = await Promise.all([
        (supabase as any)
          .from("sessions")
          .select("title, duration_minutes, location, num_photos, cover_image_url, briefing_id, contract_text, contract_id, price, session_model, deposit_enabled, deposit_amount, deposit_type, tax_rate")
          .eq("id", b.session_id)
          .single(),
        supabase
          .from("session_availability")
          .select("start_time, end_time")
          .eq("id", b.availability_id)
          .single(),
        (supabase as any)
          .from("photographers")
          .select("full_name, store_slug, business_name, business_address, business_city, business_state, business_zip, business_country, business_phone, email")
          .eq("id", b.photographer_id)
          .single(),
      ]);

      if (!fnResult?.session && sessRes.data) {
        const s = sessRes.data as SessionData;
        // If session references a contract template, always pull the LATEST body from it
        // so edits to the template are reflected in the booking flow without re-attaching.
        if (s.contract_id) {
          const { data: tpl } = await (supabase as any)
            .from("contracts")
            .select("body")
            .eq("id", s.contract_id)
            .maybeSingle();
          if (tpl?.body) s.contract_text = tpl.body;
        }
        setSession(s);

        const { data: bonusData } = await (supabase as any)
          .from("session_bonuses")
          .select("text")
          .eq("session_id", b.session_id)
          .order("position", { ascending: true });
        setBonuses(bonusData ?? []);

        const { data: itemsData } = await (supabase as any)
          .from("booking_invoice_items")
          .select("description, quantity, unit_price")
          .eq("booking_id", bookingId);
        setInvoiceItems((itemsData ?? []) as InvoiceItem[]);

        if (s.briefing_id) {
          const { data: brData } = await (supabase as any)
            .from("briefings")
            .select("id, name, questions")
            .eq("id", s.briefing_id)
            .single();
          if (brData) {
            setBriefing(brData as BriefingData);
            const { data: existing } = await (supabase as any)
              .from("booking_briefing_responses")
              .select("id")
              .eq("booking_id", bookingId)
              .eq("briefing_id", s.briefing_id)
              .maybeSingle();
            if (existing) setAlreadySubmittedBriefing(true);
          }
        }
      }

      if (!fnResult?.availability && availRes.data) setAvail(availRes.data as AvailData);
      if (!fnResult?.photographer && photoRes.data) setPhotographer(photoRes.data as PhotographerData);

      // Load existing client info if available
      if (!fnResult?.client && b.client_email && b.photographer_id) {
        const { data: existingClient } = await (supabase as any)
          .from("clients")
          .select("full_name, phone, tax_id, birth_date, address_street, address_city, address_state, address_zip, address_country, instagram")
          .eq("photographer_id", b.photographer_id)
          .eq("email", b.client_email)
          .maybeSingle();
        if (existingClient) {
          setClientInfo({
            full_name: existingClient.full_name || b.client_name || "",
            phone: existingClient.phone || "",
            tax_id: existingClient.tax_id || "",
            birth_date: existingClient.birth_date || "",
            address_street: existingClient.address_street || "",
            address_city: existingClient.address_city || "",
            address_state: existingClient.address_state || "",
            address_zip: existingClient.address_zip || "",
            address_country: existingClient.address_country || "",
            instagram: existingClient.instagram || "",
          });
          setClientInfoSaved(true);
        }
      }

      // Load contract custom fields (default values for variables)
      if (!Array.isArray(fnResult?.contractCustomFields)) {
        const { data: cfData } = await (supabase as any)
          .from("contract_custom_fields")
          .select("id, field_key, field_label, default_value, value_source, mapped_key, client_prompt, client_input_type, required")
          .eq("photographer_id", b.photographer_id);
        if (cfData) setContractCustomFields(cfData);
      }

      // Load any previously stored client answers for this booking
      const { data: cfvData } = await (supabase as any)
        .from("booking_custom_field_values")
        .select("field_key, value")
        .eq("booking_id", bookingId);
      if (Array.isArray(cfvData)) {
        const map: Record<string, string> = {};
        cfvData.forEach((r: any) => { map[r.field_key] = r.value ?? ""; });
        setCustomFieldAnswers(map);
      }

      setLoading(false);
    };

    load();
  }, [bookingId]);

  /* ── Briefing handlers ── */
  const setTextAnswer = (qId: string, value: string) =>
    setAnswers((prev) => ({ ...prev, [qId]: value }));

  const setCheckboxAnswer = (qId: string, option: string, checked: boolean, max?: number | null) =>
    setAnswers((prev) => {
      const current = (prev[qId] as string[]) ?? [];
      const nextArr = checked ? [...current, option] : current.filter((o) => o !== option);
      if (checked && max && max > 0 && nextArr.length > max) return prev;
      return { ...prev, [qId]: nextArr };
    });

  const handleSubmitBriefing = async (): Promise<boolean> => {
    if (!briefing || !bookingId) return false;
    const missing: string[] = [];
    for (const q of briefing.questions) {
      const ans = answers[q.id];
      const empty =
        ans === undefined ||
        ans === null ||
        (Array.isArray(ans) && ans.length === 0) ||
        (typeof ans === "string" && !ans.trim());
      if (empty) missing.push(q.label);
    }
    if (missing.length > 0) {
      toast.error(
        `Please answer all questions before continuing (${missing.length} remaining).`
      );
      return false;
    }
    setSubmittingBriefing(true);
    await (supabase as any).from("booking_briefing_responses").insert({
      booking_id: bookingId,
      briefing_id: briefing.id,
      answers,
    });
    try {
      await supabase.functions.invoke("notify-briefing-response", {
        body: { booking_id: bookingId },
      });
    } catch (e) {
      console.error("notify-briefing-response failed", e);
    }
    setSubmittingBriefing(false);
    setBriefingSubmitted(true);
    return true;
  };

  /* ── Custom fields the client must fill in for the contract ── */
  const activeClientInputFields = useMemo(() => {
    const html = session?.contract_text || "";
    return contractCustomFields.filter((f) => {
      if (f.value_source !== "client_input") return false;
      return html.includes(`{{${f.field_key}}}`) || html.includes(`[[${f.field_key}]]`) || html.includes(`data-variable="${f.field_key}"`);
    });
  }, [session, contractCustomFields]);

  /* ── Client info handler ── */
  const handleSaveClientInfo = async () => {
    if (!booking) return;
    if (!clientInfo.full_name.trim() || !clientInfo.phone.trim()) return;
    setSavingClientInfo(true);
    try {
      await (supabase as any).from("clients").upsert(
        {
          photographer_id: booking.photographer_id,
          email: booking.client_email,
          full_name: clientInfo.full_name.trim(),
          phone: clientInfo.phone.trim() || null,
          tax_id: clientInfo.tax_id.trim() || null,
          birth_date: clientInfo.birth_date || null,
          address_street: clientInfo.address_street.trim() || null,
          address_city: clientInfo.address_city.trim() || null,
          address_state: clientInfo.address_state.trim() || null,
          address_zip: clientInfo.address_zip.trim() || null,
          address_country: clientInfo.address_country.trim() || null,
          instagram: clientInfo.instagram.trim() || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "photographer_id,email" }
      );

      // Persist custom client_input answers
      const clientFields = activeClientInputFields;
      if (clientFields.length > 0 && bookingId) {
        const rows = clientFields.map((f) => ({
          booking_id: bookingId,
          field_key: f.field_key,
          value: (customFieldAnswers[f.field_key] ?? "").toString(),
          updated_at: new Date().toISOString(),
        }));
        await (supabase as any)
          .from("booking_custom_field_values")
          .upsert(rows, { onConflict: "booking_id,field_key" });
      }

      setClientInfoSaved(true);
    } catch (err) {
      console.error("Save client info error:", err);
    } finally {
      setSavingClientInfo(false);
    }
  };

  /* ── Payment handler ── */
  const handlePayment = async () => {
    if (!booking || !session) return;
    setPaymentLoading(true);
    try {
      // Always persist the resolved contract snapshot before payment, so it
      // survives even if the accept-checkbox handler didn't fire (or fired
      // before resolvedContractHtml was ready).
      if (session.contract_text && resolvedContractHtml) {
        try {
          await supabase.functions.invoke("register-contract-acceptance", {
            body: {
              booking_id: booking.id,
              contract_html: resolvedContractHtml,
              client_tax_id: clientInfo.tax_id?.trim() || null,
              signature_data: signatureData,
            },
          });
        } catch (snapErr) {
          console.error("Pre-payment contract snapshot error:", snapErr);
        }
      }
      const { data, error } = await supabase.functions.invoke("create-session-checkout", {
        body: {
          bookingId: booking.id,
          sessionId: booking.session_id,
          photographerId: booking.photographer_id,
        },
      });
      if (error) throw error;
      const resp = data as any;

      if (resp?.provider === "pagarme_transparent") {
        // Compute the same amount the edge function will charge
        const subtotal = session?.price ?? 0;
        const taxRate = (session as any)?.tax_rate ?? 0;
        const taxAmount = Math.round(subtotal * (taxRate / 100));
        const fullTotal = subtotal + taxAmount;
        const isDeposit = !!(session as any)?.deposit_enabled;
        const depositType = ((session as any)?.deposit_type ?? "").toLowerCase();
        const isPercent = depositType === "percent" || depositType === "percentage";
        const amount = isDeposit
          ? (isPercent
              ? Math.round(fullTotal * (((session as any)?.deposit_amount ?? 0) / 100))
              : ((session as any)?.deposit_amount ?? 0))
          : fullTotal;
        setPagarmeModal({
          open: true,
          checkoutInput: { ...resp.checkout_input, bookingId: booking.id, sessionId: booking.session_id },
          amount,
          isDeposit,
        });
        return;
      }

      if (resp?.url) window.location.href = resp.url;
    } catch (err: any) {
      console.error("Payment error:", err);
    } finally {
      setPaymentLoading(false);
    }
  };

  /* ── Resolve contract variables with live data ── */
  const resolvedContractHtml = useMemo(() => {
    if (!session?.contract_text) return "";
    const fullAddress = [clientInfo.address_street, clientInfo.address_city, clientInfo.address_state, clientInfo.address_zip, clientInfo.address_country]
      .map((s) => (s || "").trim()).filter(Boolean).join(", ");
    const data: Record<string, string> = {
      client_name: clientInfo.full_name || booking?.client_name || "",
      client_email: booking?.client_email || "",
      client_phone: clientInfo.phone || "",
      client_tax_id: clientInfo.tax_id || "",
      client_address: fullAddress,
      session_title: session.title || "",
      session_date: booking?.booked_date ? formatDate(booking.booked_date) : "",
      session_time: avail?.start_time ? formatTime(avail.start_time) : "",
      session_duration: session.duration_minutes ? `${session.duration_minutes} min` : "",
      session_price: session.price != null ? formatCurrency(session.price) : "",
      num_photos: session.num_photos > 0 ? String(session.num_photos) : "—",
      includes: bonuses.length > 0
        ? `<ul>${bonuses.map((b) => `<li>${b.text}</li>`).join("")}</ul>`
        : "—",
      selected_addons: invoiceItems.length > 0
        ? `<ul>${invoiceItems.map((i) => `<li>${i.quantity}× ${i.description} — ${formatCurrency(i.unit_price * i.quantity)}</li>`).join("")}</ul>`
        : "—",
      total_amount: (() => {
        const extras = invoiceItems.reduce((s, i) => s + i.unit_price * i.quantity, 0);
        const sub = (session.price ?? 0) + extras;
        const tax = Math.round(sub * ((session.tax_rate ?? 0) / 100));
        return formatCurrency(sub + tax);
      })(),
      deposit_amount: (() => {
        if (!session.deposit_enabled) return "—";
        const extras = invoiceItems.reduce((s, i) => s + i.unit_price * i.quantity, 0);
        const sub = (session.price ?? 0) + extras;
        const tax = Math.round(sub * ((session.tax_rate ?? 0) / 100));
        const total = sub + tax;
        const isPercent = session.deposit_type === "percent" || session.deposit_type === "percentage";
        const dep = isPercent
          ? Math.round(total * ((session.deposit_amount ?? 0) / 100))
          : (session.deposit_amount ?? 0);
        return formatCurrency(dep);
      })(),
      balance_amount: (() => {
        const extras = invoiceItems.reduce((s, i) => s + i.unit_price * i.quantity, 0);
        const sub = (session.price ?? 0) + extras;
        const tax = Math.round(sub * ((session.tax_rate ?? 0) / 100));
        const total = sub + tax;
        if (!session.deposit_enabled) return formatCurrency(0);
        const isPercent = session.deposit_type === "percent" || session.deposit_type === "percentage";
        const dep = isPercent
          ? Math.round(total * ((session.deposit_amount ?? 0) / 100))
          : (session.deposit_amount ?? 0);
        return formatCurrency(total - dep);
      })(),
      photographer_name: photographer?.full_name || "",
      studio_name: photographer?.business_name || photographer?.full_name || "",
      studio_address: [
        photographer?.business_address,
        photographer?.business_city,
        photographer?.business_state,
        photographer?.business_zip,
        photographer?.business_country,
      ].map((s) => (s || "").trim()).filter(Boolean).join(", "),
      studio_email: (photographer as any)?.email || "",
    };
    return resolveContractVariables(session.contract_text, data, contractCustomFields as any, customFieldAnswers);
  }, [session, booking, avail, photographer, clientInfo, contractCustomFields, bonuses, invoiceItems, customFieldAnswers]);

  /* ── Build a list of resolved fields actually used in the contract for the preview banner ── */
  const resolvedFieldsPreview = useMemo(() => {
    if (!session?.contract_text) return [] as Array<{ label: string; value: string; missing: boolean }>;
    const raw = session.contract_text;
    const candidates: Array<{ key: string; label: string; value: string }> = [
      { key: "client_name", label: "Name", value: clientInfo.full_name || booking?.client_name || "" },
      { key: "client_email", label: "Email", value: booking?.client_email || "" },
      { key: "client_phone", label: "Phone", value: clientInfo.phone || "" },
      { key: "client_tax_id", label: "CPF / CNPJ", value: clientInfo.tax_id || "" },
      { key: "client_address", label: "Address", value: [clientInfo.address_street, clientInfo.address_city, clientInfo.address_state].filter(Boolean).join(", ") },
      { key: "session_title", label: "Session", value: session.title || "" },
      { key: "session_date", label: "Date", value: booking?.booked_date ? formatDate(booking.booked_date) : "" },
      { key: "session_time", label: "Time", value: avail?.start_time ? formatTime(avail.start_time) : "" },
      { key: "session_price", label: "Price", value: session.price != null ? formatCurrency(session.price) : "" },
    ];
    const customs = contractCustomFields.map((f) => ({
      key: f.field_key,
      label: f.field_label,
      value: f.default_value || "",
    }));
    const all = [...candidates, ...customs];
    return all
      .filter(({ key }) => raw.includes(`{{${key}}}`) || raw.includes(`[[${key}]]`))
      .map(({ label, value }) => ({ label, value, missing: !value || !value.trim() }));
  }, [session, booking, avail, clientInfo, contractCustomFields]);

  /* ── Persist contract snapshot when accepted ── */
  const handleAcceptContract = async (checked: boolean) => {
    setContractAccepted(checked);
    if (checked && booking?.id && resolvedContractHtml) {
      try {
        await supabase.functions.invoke("register-contract-acceptance", {
          body: {
            booking_id: booking.id,
            contract_html: resolvedContractHtml,
            client_tax_id: clientInfo.tax_id?.trim() || null,
            signature_data: signatureData,
          },
        });
      } catch (err) {
        console.error("Save contract snapshot error:", err);
      }
    }
  };

  const handleSignatureEnd = () => {
    try {
      const ref: any = signatureRef.current;
      if (!ref) return;
      // react-signature-canvas exposes toDataURL() directly; fall back to canvas
      const dataUrl =
        (typeof ref.toDataURL === "function" && ref.toDataURL("image/png")) ||
        ref.getCanvas?.()?.toDataURL("image/png") ||
        null;
      if (dataUrl && typeof dataUrl === "string" && dataUrl.startsWith("data:image")) {
        setSignatureData(dataUrl);
        // Persist immediately so it survives even if user abandons before payment
        if (booking?.id && resolvedContractHtml) {
          supabase.functions
            .invoke("register-contract-acceptance", {
              body: {
                booking_id: booking.id,
                contract_html: resolvedContractHtml,
                client_tax_id: clientInfo.tax_id?.trim() || null,
                signature_data: dataUrl,
              },
            })
            .catch((e) => console.error("signature persist error:", e));
        }
      }
    } catch (e) {
      console.error("signature capture error:", e);
    }
  };

  const handleSignatureClear = () => {
    signatureRef.current?.clear();
    setSignatureData(null);
    if (contractAccepted) setContractAccepted(false);
  };

  /* ── Build steps dynamically ── */
  const buildSteps = (): StepDef[] => {
    if (!session) return [];
    const steps: StepDef[] = [
      { key: "details", label: "Details", icon: <Calendar className="h-4 w-4" /> },
      { key: "client_info", label: "Your Info", icon: <UserCircle className="h-4 w-4" /> },
    ];
    if (briefing) {
      steps.push({ key: "briefing", label: "Briefing", icon: <ClipboardList className="h-4 w-4" /> });
    }
    if (session.contract_text) {
      steps.push({ key: "contract", label: "Contract", icon: <FileText className="h-4 w-4" /> });
    }
    if (session.price != null && session.price > 0) {
      steps.push({ key: "payment", label: "Payment", icon: <CreditCard className="h-4 w-4" /> });
    }
    return steps;
  };

  const steps = buildSteps();
  const activeStep = steps[currentStep] ?? steps[0];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  /* ── Step validation ── */
  const canProceed = (): boolean => {
    if (!activeStep) return false;
    if (activeStep.key === "client_info") {
      return clientInfoSaved && privacyConsent;
    }
    if (activeStep.key === "briefing") {
      if (!briefing) return true;
      if (alreadySubmittedBriefing || briefingSubmitted) return true;
      return false;
    }
    if (activeStep.key === "contract") {
      return contractAccepted && !!signatureData;
    }
    return true;
  };

  const goNext = async () => {
    if (currentStep >= steps.length - 1) return;
    const stepKey = activeStep?.key;
    setIsSavingContinue(true);
    try {
      if (stepKey === "client_info") {
        await handleSaveClientInfo();
      } else if (stepKey === "briefing") {
        const ok = await handleSubmitBriefing();
        if (!ok) return;
      } else if (stepKey === "contract") {
        if (!contractAccepted) {
          await handleAcceptContract(true);
        }
      }
      setCurrentStep(currentStep + 1);
    } finally {
      setIsSavingContinue(false);
    }
  };

  const goBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="text-xs tracking-widest uppercase text-muted-foreground animate-pulse">Loading…</span>
      </div>
    );
  }

  if (!booking || !session) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-sm text-muted-foreground">Booking not found.</p>
      </div>
    );
  }

  const photographerName = photographer?.business_name || photographer?.full_name || "Photographer";

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-lg flex flex-col gap-6">

        {/* Header */}
        <div className="text-center flex flex-col gap-2">
          <p className="text-[9px] tracking-[0.4em] uppercase text-muted-foreground">
            {photographerName}
          </p>
          <h1 className="text-xl font-light tracking-wide">{session.title}</h1>
          <p className="text-xs text-muted-foreground font-light">
            Complete the steps below to finalize your booking
          </p>
        </div>

        {/* ── Step Progress Indicator ── */}
        {steps.length > 1 && (
          <div className="flex items-center justify-center gap-0">
            {steps.map((step, idx) => {
              const isActive = idx === currentStep;
              const isCompleted = idx < currentStep;
              return (
                <div key={step.key} className="flex items-center">
                  {/* Step circle + label */}
                  <button
                    onClick={() => {
                      // allow going back to completed steps
                      if (idx <= currentStep) setCurrentStep(idx);
                    }}
                    className={`flex flex-col items-center gap-1.5 px-2 transition-all ${
                      idx <= currentStep ? "cursor-pointer" : "cursor-default"
                    }`}
                  >
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center border-2 transition-all ${
                        isCompleted
                          ? "bg-foreground border-foreground text-background"
                          : isActive
                          ? "border-foreground text-foreground"
                          : "border-muted-foreground/30 text-muted-foreground/40"
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <span className="text-[11px] font-light">{idx + 1}</span>
                      )}
                    </div>
                    <span
                      className={`text-[9px] tracking-[0.15em] uppercase font-light transition-colors ${
                        isActive ? "text-foreground" : isCompleted ? "text-foreground/70" : "text-muted-foreground/40"
                      }`}
                    >
                      {step.label}
                    </span>
                  </button>

                  {/* Connector line */}
                  {idx < steps.length - 1 && (
                    <div
                      className={`h-px w-8 sm:w-12 transition-colors mt-[-18px] ${
                        idx < currentStep ? "bg-foreground" : "bg-muted-foreground/20"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Step Content ── */}

        {/* Details */}
        {activeStep?.key === "details" && (
          <div className="border border-border divide-y divide-border">
            {session.cover_image_url && (
              <div className="aspect-video overflow-hidden">
                <img src={session.cover_image_url} alt={session.title} className="w-full h-full object-cover" />
              </div>
            )}

            <div className="p-5 flex flex-col gap-4">
              <div className="flex flex-col gap-2.5 text-[11px] text-muted-foreground">
                {booking.booked_date && (
                  <span className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    {formatDate(booking.booked_date)}
                  </span>
                )}
                {avail && (
                  <span className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    {formatTime(avail.start_time)} – {formatTime(avail.end_time)}
                  </span>
                )}
                <span className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 shrink-0 opacity-0" />
                  {session.duration_minutes} minutes
                </span>
                {session.location && (
                  <span className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {session.location}
                  </span>
                )}
                {session.num_photos > 0 && (
                  <span className="flex items-center gap-2">
                    <Camera className="h-3.5 w-3.5 shrink-0" />
                    {session.num_photos} photos delivered
                  </span>
                )}
              </div>

              {bonuses.length > 0 && (
                <div className="flex flex-col gap-2 pt-3 border-t border-border">
                  <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">What's included</p>
                  <div className="flex flex-col gap-1.5">
                    {bonuses.map((b, i) => (
                      <span key={i} className="flex items-center gap-2 text-xs font-light">
                        <Check className="h-3 w-3 text-primary shrink-0" />
                        {b.text}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-3 border-t border-border">
                <Badge variant={booking.status === "confirmed" ? "default" : "secondary"} className="text-[9px] tracking-wider uppercase">
                  {booking.status}
                </Badge>
                <Badge variant={booking.payment_status === "paid" ? "default" : "secondary"} className="text-[9px] tracking-wider uppercase">
                  {booking.payment_status}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Client Info */}
        {activeStep?.key === "client_info" && (
          <div className="border border-border flex flex-col divide-y divide-border">
            <div className="p-5 flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <UserCircle className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs tracking-[0.2em] uppercase font-light">Your Information</p>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Please fill in your details so we can get in touch with you.
              </p>
            </div>

            {clientInfoSaved ? (
              <div className="p-5 flex flex-col items-center gap-3 text-center">
                <CheckCircle className="h-8 w-8 text-primary" strokeWidth={1.5} />
                <p className="text-sm font-light">Your information has been saved.</p>
                <Button variant="outline" size="sm" className="text-xs" onClick={() => setClientInfoSaved(false)}>
                  Edit
                </Button>
              </div>
            ) : (
              <div className="p-5 flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-light">Full Name <span className="text-destructive">*</span></Label>
                  <Input
                    value={clientInfo.full_name}
                    onChange={(e) => setClientInfo((p) => ({ ...p, full_name: e.target.value }))}
                    placeholder="Your full name"
                    className="text-sm font-light"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-light">Phone <span className="text-destructive">*</span></Label>
                  <Input
                    type="tel"
                    value={clientInfo.phone}
                    onChange={(e) => setClientInfo((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="+1 (555) 123-4567"
                    className="text-sm font-light"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-light">CPF / CNPJ <span className="text-muted-foreground/60">(Brazil)</span></Label>
                  <Input
                    value={clientInfo.tax_id}
                    onChange={(e) => setClientInfo((p) => ({ ...p, tax_id: e.target.value }))}
                    placeholder="000.000.000-00 or 00.000.000/0000-00"
                    className="text-sm font-light"
                  />
                  <p className="text-[10px] text-muted-foreground font-light">
                    Required for Brazilian clients. Used to fill the contract automatically.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-light">Date of Birth</Label>
                    <Input
                      type="date"
                      value={clientInfo.birth_date}
                      onChange={(e) => setClientInfo((p) => ({ ...p, birth_date: e.target.value }))}
                      className="text-sm font-light"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-light">Instagram</Label>
                    <Input
                      value={clientInfo.instagram}
                      onChange={(e) => setClientInfo((p) => ({ ...p, instagram: e.target.value }))}
                      placeholder="@username"
                      className="text-sm font-light"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-light">Street Address</Label>
                  <Input
                    value={clientInfo.address_street}
                    onChange={(e) => setClientInfo((p) => ({ ...p, address_street: e.target.value }))}
                    placeholder="123 Main St"
                    className="text-sm font-light"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-light">City</Label>
                    <Input
                      value={clientInfo.address_city}
                      onChange={(e) => setClientInfo((p) => ({ ...p, address_city: e.target.value }))}
                      placeholder="City"
                      className="text-sm font-light"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-light">State</Label>
                    <Input
                      value={clientInfo.address_state}
                      onChange={(e) => setClientInfo((p) => ({ ...p, address_state: e.target.value }))}
                      placeholder="State"
                      className="text-sm font-light"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-light">ZIP Code</Label>
                    <Input
                      value={clientInfo.address_zip}
                      onChange={(e) => setClientInfo((p) => ({ ...p, address_zip: e.target.value }))}
                      placeholder="12345"
                      className="text-sm font-light"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-light">Country</Label>
                    <Input
                      value={clientInfo.address_country}
                      onChange={(e) => setClientInfo((p) => ({ ...p, address_country: e.target.value }))}
                      placeholder="Country"
                      className="text-sm font-light"
                    />
                  </div>
                </div>

                {activeClientInputFields.length > 0 && (
                  <div className="flex flex-col gap-3 pt-3 border-t border-border">
                    <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                      {t.personalize.cfBookingSectionTitle}
                    </p>
                    {activeClientInputFields.map((f) => {
                      const promptText = (f.client_prompt || f.field_label) ?? "";
                      const inputType = f.client_input_type || "text";
                      const val = customFieldAnswers[f.field_key] ?? "";
                      return (
                        <div key={f.id} className="flex flex-col gap-1.5">
                          <Label className="text-xs font-light">
                            {promptText}
                            {f.required && <span className="text-destructive ml-1">*</span>}
                          </Label>
                          {inputType === "textarea" ? (
                            <textarea
                              value={val}
                              onChange={(e) => setCustomFieldAnswers((p) => ({ ...p, [f.field_key]: e.target.value }))}
                              rows={3}
                              className="w-full px-3 py-2 text-sm font-light bg-background border border-input text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                            />
                          ) : (
                            <Input
                              type={inputType === "date" ? "date" : inputType === "number" ? "number" : "text"}
                              value={val}
                              onChange={(e) => setCustomFieldAnswers((p) => ({ ...p, [f.field_key]: e.target.value }))}
                              className="text-sm font-light"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <Button
                  onClick={handleSaveClientInfo}
                  disabled={savingClientInfo || !clientInfo.full_name.trim() || !clientInfo.phone.trim() || activeClientInputFields.some((f) => f.required && !(customFieldAnswers[f.field_key] || "").trim())}
                  className="w-full text-xs tracking-wider uppercase font-light mt-1"
                >
                  {savingClientInfo ? "Saving…" : "Save & Continue"}
                </Button>

                {/* LGPD Consent Checkbox */}
                <label className="flex items-start gap-2 mt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={privacyConsent}
                    onChange={(e) => setPrivacyConsent(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
                  />
                  <span className="text-[11px] text-muted-foreground font-light leading-relaxed">
                    I agree to the collection and use of my data as described in the{" "}
                    <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 text-foreground hover:text-primary">
                      Privacy Policy
                    </a>.
                  </span>
                </label>
              </div>
            )}
          </div>
        )}

        {/* Briefing */}
        {activeStep?.key === "briefing" && briefing && (
          <div className="border border-border flex flex-col divide-y divide-border">
            <div className="p-5 flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs tracking-[0.2em] uppercase font-light">{briefing.name}</p>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                We'd love to know a little more about you before your session.
              </p>
            </div>

            {alreadySubmittedBriefing || briefingSubmitted ? (
              <div className="p-5 flex flex-col items-center gap-3 text-center">
                <CheckCircle className="h-8 w-8 text-primary" strokeWidth={1.5} />
                <p className="text-sm font-light">Thank you! Your answers have been received.</p>
              </div>
            ) : (
              <div className="p-5 flex flex-col gap-5">
                {briefing.questions.map((q) => (
                  <div key={q.id} className="flex flex-col gap-1.5">
                    <p className="text-xs font-light">
                      {q.label}
                      {q.required && <span className="text-destructive ml-1">*</span>}
                    </p>

                    {q.type === "short_text" && (
                      <input
                        type="text"
                        value={(answers[q.id] as string) ?? ""}
                        onChange={(e) => setTextAnswer(q.id, e.target.value)}
                        className="h-9 w-full px-3 text-sm font-light bg-background border border-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        placeholder="Your answer…"
                      />
                    )}

                    {q.type === "long_text" && (
                      <textarea
                        value={(answers[q.id] as string) ?? ""}
                        onChange={(e) => setTextAnswer(q.id, e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 text-sm font-light bg-background border border-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                        placeholder="Your answer…"
                      />
                    )}

                    {q.type === "multiple_choice" && (
                      <div className="flex flex-col gap-1.5">
                        {q.options.map((opt) => (
                          <label key={opt} className="flex items-center gap-2.5 cursor-pointer">
                            <input type="radio" name={q.id} value={opt} checked={(answers[q.id] as string) === opt} onChange={() => setTextAnswer(q.id, opt)} className="h-3.5 w-3.5 accent-foreground" />
                            <span className="text-sm font-light">{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {q.type === "checkboxes" && (
                      <div className="flex flex-col gap-1.5">
                        {q.max_select && q.max_select > 0 && (
                          <p className="text-[10px] tracking-wider uppercase text-muted-foreground">Select up to {q.max_select}</p>
                        )}
                        {q.options.map((opt) => {
                          const current = (answers[q.id] as string[]) ?? [];
                          const isChecked = current.includes(opt);
                          const atMax = !!q.max_select && q.max_select > 0 && current.length >= q.max_select && !isChecked;
                          return (
                            <label key={opt} className={`flex items-center gap-2.5 ${atMax ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
                              <input type="checkbox" checked={isChecked} disabled={atMax} onChange={(e) => setCheckboxAnswer(q.id, opt, e.target.checked, q.max_select)} className="h-3.5 w-3.5 accent-foreground" />
                              <span className="text-sm font-light">{opt}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {q.type === "yes_no" && (
                      <div className="flex gap-4">
                        {["Yes", "No"].map((opt) => (
                          <label key={opt} className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name={q.id} value={opt} checked={(answers[q.id] as string) === opt} onChange={() => setTextAnswer(q.id, opt)} className="h-3.5 w-3.5 accent-foreground" />
                            <span className="text-sm font-light">{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {q.type === "multi_image" && (
                      <div className="flex flex-col gap-2">
                        {q.max_select && q.max_select > 0 && (
                          <p className="text-[10px] tracking-wider uppercase text-muted-foreground">Select up to {q.max_select}</p>
                        )}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {q.options.filter(Boolean).map((opt, i) => {
                            const [optUrl] = opt.split("||");
                            const current = Array.isArray(answers[q.id]) ? (answers[q.id] as string[]) : (answers[q.id] ? [answers[q.id] as string] : []);
                            const selected = current.includes(optUrl);
                            const atMax = !!q.max_select && q.max_select > 0 && current.length >= q.max_select && !selected;
                            return (
                              <button
                                type="button"
                                key={`${opt}-${i}`}
                                disabled={atMax}
                                onClick={() => setCheckboxAnswer(q.id, optUrl, !selected, q.max_select)}
                                className={`relative aspect-square overflow-hidden border transition-all ${selected ? "border-foreground ring-2 ring-foreground" : "border-input hover:border-foreground/40"} ${atMax ? "opacity-50 cursor-not-allowed" : ""}`}
                              >
                                <img src={optUrl} alt={`Option ${i + 1}`} className="w-full h-full object-cover" />
                                {selected && (
                                  <span className="absolute top-1 right-1 bg-foreground text-background text-[9px] uppercase tracking-wider px-1.5 py-0.5">Selected</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                <Button onClick={handleSubmitBriefing} disabled={submittingBriefing} className="w-full text-xs tracking-wider uppercase font-light mt-1">
                  {submittingBriefing ? "Submitting…" : "Submit Briefing"}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Contract */}
        {activeStep?.key === "contract" && session.contract_text && (
          <div className="border border-border flex flex-col divide-y divide-border">
            <div className="p-5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs tracking-[0.2em] uppercase font-light">Service Agreement</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setContractPreviewOpen(true)}
                className="h-7 px-2.5 text-[10px]"
              >
                <Eye className="h-3.5 w-3.5" />
                Full preview
              </Button>
            </div>

            {/* Preview banner: shows which fields will be auto-filled */}
            <div className="p-4 bg-muted/30">
              <div className="flex items-start gap-2 mb-3">
                <Sparkles className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-[10px] tracking-[0.2em] uppercase font-light text-muted-foreground">
                    Live preview · auto-filled with your information
                  </p>
                  <p className="text-[10px] font-light text-muted-foreground/80 mt-0.5">
                    Review the values below. Missing fields will appear blank in your final contract.
                  </p>
                </div>
              </div>
              {resolvedFieldsPreview.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                  {resolvedFieldsPreview.map((f, i) => (
                    <div key={i} className="flex items-baseline gap-2 text-[11px] font-light min-w-0">
                      <span className="text-muted-foreground shrink-0">{f.label}:</span>
                      {f.missing ? (
                        <span className="italic text-destructive/80">— missing —</span>
                      ) : (
                        <span className="text-foreground truncate">{f.value}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-5">
              <div
                className="prose prose-sm max-w-none text-xs font-light leading-relaxed max-h-80 overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: resolvedContractHtml }}
              />
            </div>

            <div className="p-5 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] tracking-[0.2em] uppercase font-light text-muted-foreground">
                    Sign here
                  </p>
                  <button
                    type="button"
                    onClick={handleSignatureClear}
                    className="text-[10px] tracking-wider uppercase text-muted-foreground hover:text-foreground transition"
                  >
                    Clear
                  </button>
                </div>
                <div className="border border-border bg-background relative">
                  <SignatureCanvas
                    ref={signatureRef}
                    penColor="hsl(var(--foreground))"
                    onEnd={handleSignatureEnd}
                    canvasProps={{
                      className: "w-full h-32 cursor-crosshair",
                    }}
                  />
                </div>
                {!signatureData && (
                  <p className="text-[10px] font-light text-muted-foreground/70">
                    Draw your signature above to confirm acceptance.
                  </p>
                )}
              </div>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={contractAccepted}
                  onChange={(e) => handleAcceptContract(e.target.checked)}
                  disabled={!signatureData}
                  className="h-4 w-4 accent-foreground mt-0.5 disabled:opacity-40"
                />
                <span className="text-xs font-light text-muted-foreground">
                  I have read and agree to the terms of this service agreement.
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Full-screen contract preview modal */}
        <Dialog open={contractPreviewOpen} onOpenChange={setContractPreviewOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0">
            <DialogHeader className="px-6 pt-5 pb-3 border-b border-border shrink-0">
              <DialogTitle className="text-sm tracking-[0.2em] uppercase font-light">
                Contract preview
              </DialogTitle>
              <DialogDescription className="text-xs font-light">
                This is exactly how your contract will look once accepted.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div
                className="prose prose-sm max-w-none text-sm font-light leading-relaxed"
                dangerouslySetInnerHTML={{ __html: resolvedContractHtml || "" }}
              />
            </div>
            <div className="px-6 py-4 border-t border-border shrink-0 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setContractPreviewOpen(false)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>


        {/* Payment */}
        {activeStep?.key === "payment" && (
          <div className="border border-border flex flex-col divide-y divide-border">
            <div className="p-5 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs tracking-[0.2em] uppercase font-light">Payment</p>
            </div>

            <div className="p-5 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-light">{session.title}</span>
                  <span className="font-light">{formatCurrency(session.price)}</span>
                </div>
                <div className="border-t border-border pt-2 flex items-center justify-between text-sm font-medium">
                  <span>Total</span>
                  <span>{formatCurrency(session.price)}</span>
                </div>
              </div>

              {booking.payment_status === "paid" ? (
                <div className="flex items-center gap-2 text-sm text-primary">
                  <CheckCircle className="h-4 w-4" />
                  <span className="font-light">Payment received — thank you!</span>
                </div>
              ) : (
                <Button
                  onClick={handlePayment}
                  disabled={paymentLoading}
                  className="w-full text-xs tracking-wider uppercase font-light gap-2"
                >
                  {paymentLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Proceed to Payment
                </Button>
              )}
            </div>
          </div>
        )}

        {/* ── Navigation Buttons ── */}
        {steps.length > 1 && (
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={goBack}
              disabled={isFirstStep}
              className="text-xs gap-1.5 tracking-wider uppercase font-light"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              {t.common.back}
            </Button>

            {!isLastStep ? (
              <Button
                size="sm"
                onClick={goNext}
                disabled={!canProceed() || isSavingContinue}
                className="text-xs gap-1.5 tracking-wider uppercase font-light"
              >
                {isSavingContinue ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    {t.sessions.saveAndContinue}
                    <ChevronRight className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            ) : (
              // On the last step (payment), no "Next" button needed — payment button handles it
              <div />
            )}
          </div>
        )}

        {/* Step hint */}
        {steps.length > 1 && (
          <p className="text-center text-[10px] text-muted-foreground/50 font-light">
            Step {currentStep + 1} of {steps.length}
          </p>
        )}
      </div>

      <footer className="mt-16">
        <p className="text-[9px] tracking-widest uppercase text-muted-foreground/40">Powered by Davions</p>
      </footer>
    </div>
  );
};

export default BookingConfirm;
