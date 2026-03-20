import { useEffect, useRef, useState, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { format, addMinutes, parse } from "date-fns";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Bell,
  ChevronRight,
  Clock,
  CreditCard,
  Eye,
  Globe,
  GlobeLock,
  Loader2,
  Mail,
  Plus,
  Share2,
  Trash2,
  Upload,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn, formatTime12 } from "@/lib/utils";
import { TimePickerInput } from "@/components/ui/time-picker-input";
import SessionTypeManager, { SessionType } from "@/components/dashboard/SessionTypeManager";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
// Ordered Mon→Sun for display
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

interface WeeklySlot {
  id?: string;
  day_of_week: number; // 0=Sun … 6=Sat
  start_time: string;  // HH:mm
  end_time: string;    // computed from duration + break
  _local?: boolean;
}

interface DayConfig {
  hours_start: string;   // "HH:mm" or ""
  hours_end: string;     // "HH:mm" or ""
  buffer_before_min: number;
  buffer_after_min: number;
  /** DB id if persisted */
  db_id?: string;
}

const DEFAULT_DAY_CONFIG = (): DayConfig => ({
  hours_start: "09:00",
  hours_end: "17:00",
  buffer_before_min: 0,
  buffer_after_min: 0,
});

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────

const computeEndTime = (start: string, durationMin: number): string => {
  const base = parse(start, "HH:mm", new Date());
  return format(addMinutes(base, durationMin), "HH:mm");
};

/** Add minutes to a "HH:mm" string */
const addMinsToTime = (time: string, mins: number): string => {
  if (!time) return "";
  const base = parse(time, "HH:mm", new Date());
  return format(addMinutes(base, mins), "HH:mm");
};

/** Subtract minutes from a "HH:mm" string */
const subMinsFromTime = (time: string, mins: number): string => {
  if (!time) return "";
  const base = parse(time, "HH:mm", new Date());
  return format(addMinutes(base, -mins), "HH:mm");
};

// ────────────────────────────────────────────
// Component
// ────────────────────────────────────────────

const SessionForm = () => {
  const { id } = useParams();
  const isEdit = Boolean(id) && id !== "new";
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Stripe configured check ──
  const [stripeConfigured, setStripeConfigured] = useState<boolean | null>(null);

  // ── Wizard step ──
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7>(1);
  const [sessionId, setSessionId] = useState<string | undefined>(isEdit ? id : undefined);

  // ── Payment step ──
  const [requirePayment, setRequirePayment] = useState(true);
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [taxRate, setTaxRate] = useState("0");
  const [depositEnabled, setDepositEnabled] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositType, setDepositType] = useState<"fixed" | "percent">("fixed");
  const [allowTip, setAllowTip] = useState(false);

  // ── Additional Photos step ──
  interface PhotoTier {
    id?: string;
    min_photos: number;
    max_photos: number | null;
    price_per_photo: string; // dollars, e.g. "5.00"
    _local?: boolean;
  }
  const [photoTiers, setPhotoTiers] = useState<PhotoTier[]>([]);

  // ── Extras step ──
  interface SessionExtra {
    id?: string;
    description: string;
    quantity: string;
    price: string; // dollars
    _local?: boolean;
  }
  const [sessionExtras, setSessionExtras] = useState<SessionExtra[]>([]);

  // ── Confirmation step ──
  const [confirmationEmailBody, setConfirmationEmailBody] = useState("");
  const [reminderDays, setReminderDays] = useState<number[]>([]);

  // ── Booking Rules step ──
  const [bookingNoticeDays, setBookingNoticeDays] = useState("1");
  const [bookingWindowDays, setBookingWindowDays] = useState("60");

  const editor = useEditor({
    extensions: [StarterKit],
    content: confirmationEmailBody,
    onUpdate: ({ editor }) => {
      setConfirmationEmailBody(editor.getHTML());
    },
  });

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [storeSlug, setStoreSlug] = useState<string | null>(null);

  // ── Form fields ──
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [breakAfterMinutes, setBreakAfterMinutes] = useState("0");
  const [numPhotos, setNumPhotos] = useState("30");
  const [location, setLocation] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"draft" | "active">("draft");

  // Auto-generate slug from title (unless user manually edited it)
  const generateSlug = (val: string) =>
    val
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!slugEdited) setSlug(generateSlug(val));
  };

  const handleSlugChange = (val: string) => {
    setSlug(val.toLowerCase().replace(/[^a-z0-9-]/g, ""));
    setSlugEdited(true);
  };

  // ── Session type ──
  const [sessionTypes, setSessionTypes] = useState<SessionType[]>([]);
  const [sessionTypeId, setSessionTypeId] = useState<string | null>(null);

  // ── Contract ──
  interface ContractTemplate { id: string; name: string; body: string; }
  const [contractTemplates, setContractTemplates] = useState<ContractTemplate[]>([]);
  const [selectedContractId, setSelectedContractId] = useState<string>("none");
  const [contractText, setContractText] = useState<string>("");
  const [showFullContract, setShowFullContract] = useState(false);

  // ── Briefing ──
  type BriefingQuestionType = "short_text" | "long_text" | "multiple_choice" | "checkboxes" | "yes_no";
  interface BriefingTemplate { id: string; name: string; }
  const [briefingTemplates, setBriefingTemplates] = useState<BriefingTemplate[]>([]);
  const [selectedBriefingId, setSelectedBriefingId] = useState<string>("none");

  // ── Weekly slots ──
  const [slots, setSlots] = useState<WeeklySlot[]>([]);
  const [expandedDays, setExpandedDays] = useState<number[]>([...DAY_ORDER]);

  // ── Global config (business hours + buffers — applies to all days) ──
  const [globalConfig, setGlobalConfig] = useState<DayConfig>(DEFAULT_DAY_CONFIG());

  // Refs for business hours range auto-focus
  const businessHrsStartRef = useRef<HTMLInputElement>(null);
  const businessHrsEndRef = useRef<HTMLInputElement>(null);

  const updateGlobalConfig = (patch: Partial<DayConfig>) => {
    setGlobalConfig((prev) => ({ ...prev, ...patch }));
  };

  // ────────────────────────────────────────────
  // Session types
  // ────────────────────────────────────────────

  const DEFAULT_TYPES = ["Newborn", "Family", "Portrait", "Wedding", "Birthday"];

  const fetchSessionTypes = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("session_types")
      .select("id, name")
      .eq("photographer_id", user.id)
      .order("name");
    if (data) {
      if (data.length === 0) {
        // Pre-seed defaults on first use
        const inserts = DEFAULT_TYPES.map((name) => ({
          photographer_id: user.id,
          name,
        }));
        const { data: seeded } = await supabase
          .from("session_types")
          .insert(inserts)
          .select("id, name");
        if (seeded) setSessionTypes(seeded);
      } else {
        setSessionTypes(data);
      }
    }
  }, [user]);

  const fetchContractTemplates = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("contracts")
      .select("id, name, body")
      .eq("photographer_id", user.id)
      .order("created_at", { ascending: true });
    if (data) setContractTemplates(data);
  }, [user]);

  const fetchBriefingTemplates = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("briefings")
      .select("id, name")
      .eq("photographer_id", user.id)
      .order("created_at", { ascending: true });
    if (data) setBriefingTemplates(data as BriefingTemplate[]);
  }, [user]);


  useEffect(() => {
    fetchSessionTypes();
    fetchContractTemplates();
    fetchBriefingTemplates();
    if (user) {
      // Fetch store_slug (columns that actually exist on photographers table)
      supabase
        .from("photographers")
        .select("store_slug, stripe_account_id")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          setStripeConfigured(Boolean(data?.stripe_account_id));
          setStoreSlug((data as any)?.store_slug ?? null);
        });
    }
  }, [fetchSessionTypes, fetchContractTemplates, fetchBriefingTemplates, user]);

  // ────────────────────────────────────────────
  // Load (edit mode)
  // ────────────────────────────────────────────

  useEffect(() => {
    if (isEdit && id) loadSession(id);
  }, [id]);

  // Auto-focus first business hrs input when entering step 2
  useEffect(() => {
    if (step === 2) {
      setTimeout(() => businessHrsStartRef.current?.focus(), 100);
    }
  }, [step]);

  const loadSession = async (sid: string) => {
    const { data: s } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", sid)
      .single();

    if (s) {
      setTitle(s.title);
      const existingSlug = (s as unknown as { slug?: string | null }).slug ?? "";
      setSlug(existingSlug);
      setSlugEdited(Boolean(existingSlug)); // treat existing slug as "manually set"
      setDescription(s.description ?? "");
      setPrice((s.price / 100).toFixed(2));
      setDurationMinutes(String(s.duration_minutes));
      setBreakAfterMinutes(String((s as unknown as { break_after_minutes?: number }).break_after_minutes ?? 0));
      setNumPhotos(String(s.num_photos));
      setLocation(s.location ?? "");
      setCoverImageUrl(s.cover_image_url);
      setStatus(s.status as "draft" | "active");
      setSessionTypeId((s as unknown as { session_type_id?: string | null }).session_type_id ?? null);
      setRequirePayment(s.price > 0);
      // Payment extras
      const sAny = s as unknown as { tax_rate?: number; deposit_enabled?: boolean; deposit_amount?: number; allow_tip?: boolean };
      if (sAny.tax_rate != null && sAny.tax_rate > 0) {
        setTaxEnabled(true);
        setTaxRate(String(sAny.tax_rate));
      }
      setDepositEnabled(sAny.deposit_enabled ?? false);
      // Determine if stored deposit is percentage or fixed:
      // We store percent as negative sentinel in deposit_amount is not feasible,
      // so we rely on deposit_type if available, else guess fixed
      const sAny2 = s as unknown as { deposit_type?: string };
      const storedType = (sAny2.deposit_type === "percent" ? "percent" : "fixed") as "fixed" | "percent";
      setDepositType(storedType);
      if (storedType === "percent") {
        // deposit_amount stores the raw percentage integer (e.g. 35 for 35%)
        setDepositAmount(sAny.deposit_amount ? String(sAny.deposit_amount) : "");
      } else {
        // deposit_amount stores cents (e.g. 5000 = $50.00)
        setDepositAmount(sAny.deposit_amount ? (sAny.deposit_amount / 100).toFixed(2) : "");
      }
      setAllowTip(sAny.allow_tip ?? false);
    }

    const [availRes, configRes] = await Promise.all([
      supabase
        .from("session_availability")
        .select("id, day_of_week, start_time, end_time")
        .eq("session_id", sid)
        .not("day_of_week", "is", null)
        .order("day_of_week", { ascending: true })
        .order("start_time", { ascending: true }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from("session_day_config")
        .select("id, day_of_week, hours_start, hours_end, buffer_before_min, buffer_after_min")
        .eq("session_id", sid),
    ]);

    if (availRes.data) {
      setSlots(
        availRes.data.map((a: { id: string; day_of_week: number; start_time: string; end_time: string }) => ({
          id: a.id,
          day_of_week: a.day_of_week,
          start_time: a.start_time,
          end_time: a.end_time,
        }))
      );
    }

    if (configRes.data && configRes.data.length > 0) {
      // Load global config from day_of_week = -1 sentinel (or fallback to first row for backward compat)
      const rows = configRes.data as Array<{
        id: string;
        day_of_week: number;
        hours_start: string | null;
        hours_end: string | null;
        buffer_before_min: number;
        buffer_after_min: number;
      }>;
      const globalRow = rows.find((r) => r.day_of_week === -1) ?? rows[0];
      setGlobalConfig({
        db_id: globalRow.id,
        hours_start: globalRow.hours_start ? globalRow.hours_start.slice(0, 5) : "09:00",
        hours_end: globalRow.hours_end ? globalRow.hours_end.slice(0, 5) : "17:00",
        buffer_before_min: globalRow.buffer_before_min ?? 0,
        buffer_after_min: globalRow.buffer_after_min ?? 0,
      });
    }

    // Load photo tiers
    const { data: tiersData } = await supabase
      .from("session_photo_tiers" as never)
      .select("id, min_photos, max_photos, price_per_photo")
      .eq("session_id", sid)
      .order("min_photos", { ascending: true });

    if (tiersData) {
      setPhotoTiers(
        (tiersData as Array<{ id: string; min_photos: number; max_photos: number | null; price_per_photo: number }>).map((t) => ({
          id: t.id,
          min_photos: t.min_photos,
          max_photos: t.max_photos,
          price_per_photo: (t.price_per_photo / 100).toFixed(2),
        }))
      );
    }

    // Load extras
    const { data: extrasData } = await supabase
      .from("session_extras" as never)
      .select("id, description, quantity, price")
      .eq("session_id", sid)
      .order("created_at", { ascending: true });

    if (extrasData) {
      setSessionExtras(
        (extrasData as Array<{ id: string; description: string; quantity: number; price: number }>).map((e) => ({
          id: e.id,
          description: e.description,
          quantity: String(e.quantity),
          price: (e.price / 100).toFixed(2),
        }))
      );
    }

    // Load confirmation settings
    const sAny3 = s as unknown as { confirmation_email_body?: string; reminder_days?: number[]; booking_notice_days?: number; booking_window_days?: number; contract_text?: string | null; briefing_id?: string | null };
    const bodyHtml = sAny3.confirmation_email_body ?? "";
    setConfirmationEmailBody(bodyHtml);
    setReminderDays(sAny3.reminder_days ?? []);
    setBookingNoticeDays(String(sAny3.booking_notice_days ?? 1));
    setBookingWindowDays(String(sAny3.booking_window_days ?? 60));
    // Load contract text
    const existingContract = sAny3.contract_text ?? "";
    setContractText(existingContract);
    if (existingContract) setSelectedContractId("existing");
    // Load briefing
    if (sAny3.briefing_id) setSelectedBriefingId(sAny3.briefing_id);
    // Sync to editor once loaded
    if (editor && bodyHtml) {
      editor.commands.setContent(bodyHtml);
    }

    setLoading(false);
  };

  // ────────────────────────────────────────────
  // Cover upload
  // ────────────────────────────────────────────

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingCover(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("session-covers")
      .upload(path, file, { upsert: true });
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } else {
      const { data } = supabase.storage.from("session-covers").getPublicUrl(path);
      setCoverImageUrl(data.publicUrl);
    }
    setUploadingCover(false);
  };

  // ────────────────────────────────────────────
  // Step 1: Create / update session details
  // ────────────────────────────────────────────

  const handleCreateSession = async () => {
    if (!user) return;
    if (!title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }

    setSaving(true);
    const dur = parseInt(durationMinutes) || 60;

    // Price is NOT saved here — it's saved in Step 3 (Payment)
    const payload = {
      photographer_id: user.id,
      title: title.trim(),
      slug: slug.trim() || null,
      description: description.trim() || null,
      duration_minutes: dur,
      break_after_minutes: parseInt(breakAfterMinutes) || 0,
      num_photos: parseInt(numPhotos) || 0,
      location: location.trim() || null,
      cover_image_url: coverImageUrl,
      status,
      contract_text: contractText.trim() || null,
      briefing_id: selectedBriefingId !== "none" ? selectedBriefingId : null,
    };
    const payloadWithType = { ...payload, session_type_id: sessionTypeId };

    if (isEdit && sessionId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase.from("sessions").update(payloadWithType as any).eq("id", sessionId);
      if (error) {
        toast({ title: "Error saving session", description: error.message, variant: "destructive" });
        setSaving(false);
        return;
      }
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await supabase
        .from("sessions")
        .insert({ ...payloadWithType, price: 0 } as any)
        .select("id")
        .single();
      if (error || !data) {
        toast({ title: "Error creating session", description: error?.message, variant: "destructive" });
        setSaving(false);
        return;
      }
      setSessionId(data.id);
    }

    setSaving(false);
    setStep(2);
  };

  // ────────────────────────────────────────────
  // Step 2: Save availability
  // ────────────────────────────────────────────

  const handleSaveAvailability = async () => {
    if (!user || !sessionId) return;

    setSaving(true);

    // Delete all existing availability for this session, then re-insert
    await supabase.from("session_availability").delete().eq("session_id", sessionId);

    if (slots.length > 0) {
      await supabase.from("session_availability").insert(
        slots.map((s) => ({
          session_id: sessionId,
          photographer_id: user.id,
          day_of_week: s.day_of_week,
          start_time: s.start_time,
          end_time: s.end_time,
        }))
      );
    }

    // Save global config as a single row with day_of_week = -1 (sentinel)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("session_day_config")
      .delete()
      .eq("session_id", sessionId);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("session_day_config").insert({
      session_id: sessionId,
      photographer_id: user.id,
      day_of_week: -1,
      hours_start: globalConfig.hours_start || null,
      hours_end: globalConfig.hours_end || null,
      buffer_before_min: globalConfig.buffer_before_min,
      buffer_after_min: globalConfig.buffer_after_min,
    });

    setSaving(false);
    setStep(3);
  };

  // ────────────────────────────────────────────
  // Step 3: Save payment settings → go to step 4
  // ────────────────────────────────────────────

  const handleFinish = async () => {
    if (!user || !sessionId) return;

    setSaving(true);
    const priceInCents = Math.round(parseFloat(price || "0") * 100);
    const finalPrice = requirePayment ? priceInCents : 0;

    let finalDepositAmount = 0;
    if (depositEnabled) {
      const depositVal = parseFloat(depositAmount || "0");
      finalDepositAmount = depositType === "percent"
        ? Math.round(depositVal)        // store as raw integer percent (e.g. 35)
        : Math.round(depositVal * 100); // store as cents (e.g. 5000 = $50)
    }

    const { error } = await supabase
      .from("sessions")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({
        price: finalPrice,
        tax_rate: taxEnabled ? parseFloat(taxRate || "0") : 0,
        deposit_enabled: depositEnabled,
        deposit_amount: finalDepositAmount,
        deposit_type: depositType,
        allow_tip: allowTip,
      } as any)
      .eq("id", sessionId);

    if (error) {
      toast({ title: "Error saving payment settings", description: error.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    setSaving(false);
    setStep(4);
  };

  // ────────────────────────────────────────────
  // Step 4: Save photo tiers → navigate away
  // ────────────────────────────────────────────

  const handleFinishTiers = async () => {
    if (!user || !sessionId) return;

    setSaving(true);

    // Delete existing tiers and re-insert
    await supabase
      .from("session_photo_tiers" as never)
      .delete()
      .eq("session_id", sessionId);

    if (photoTiers.length > 0) {
      const inserts = photoTiers.map((t) => ({
        session_id: sessionId,
        photographer_id: user.id,
        min_photos: t.min_photos,
        max_photos: t.max_photos,
        price_per_photo: Math.round(parseFloat(t.price_per_photo || "0") * 100),
      }));
      const { error } = await supabase
        .from("session_photo_tiers" as never)
        .insert(inserts as never);
      if (error) {
        toast({ title: "Error saving photo tiers", description: error.message, variant: "destructive" });
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    setStep(5);
  };

  // ────────────────────────────────────────────
  // Step 5: Save extras → navigate away
  // ────────────────────────────────────────────

  const handleFinishExtras = async () => {
    if (!user || !sessionId) return;

    setSaving(true);

    await supabase
      .from("session_extras" as never)
      .delete()
      .eq("session_id", sessionId);

    const validExtras = sessionExtras.filter((e) => e.description.trim());
    if (validExtras.length > 0) {
      const inserts = validExtras.map((e) => ({
        session_id: sessionId,
        photographer_id: user.id,
        description: e.description.trim(),
        quantity: parseInt(e.quantity) || 1,
        price: Math.round(parseFloat(e.price || "0") * 100),
      }));
      const { error } = await supabase
        .from("session_extras" as never)
        .insert(inserts as never);
      if (error) {
        toast({ title: "Error saving extras", description: error.message, variant: "destructive" });
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    setStep(6);
  };

  // ────────────────────────────────────────────
  // Step 6: Save confirmation settings → go to step 7
  // ────────────────────────────────────────────

  const handleFinishConfirmation = async () => {
    if (!user || !sessionId) return;

    setSaving(true);

    const { error } = await supabase
      .from("sessions")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({
        confirmation_email_body: confirmationEmailBody,
        reminder_days: reminderDays,
      } as any)
      .eq("id", sessionId);

    if (error) {
      toast({ title: "Error saving confirmation settings", description: error.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    setSaving(false);
    setStep(7);
  };

  // ────────────────────────────────────────────
  // Step 7: Save booking rules → navigate away
  // ────────────────────────────────────────────

  const handleFinishBookingRules = async () => {
    if (!user || !sessionId) return;

    setSaving(true);

    const { error } = await supabase
      .from("sessions")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({
        booking_notice_days: parseInt(bookingNoticeDays) || 1,
        booking_window_days: parseInt(bookingWindowDays) || 60,
      } as any)
      .eq("id", sessionId);

    if (error) {
      toast({ title: "Error saving booking rules", description: error.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    toast({ title: isEdit ? "Session updated" : "Session created" });
    navigate("/dashboard/sessions");
    setSaving(false);
  };

  // ────────────────────────────────────────────
  // Publish / Unpublish
  // ────────────────────────────────────────────

  const [publishing, setPublishing] = useState(false);

  const handleTogglePublish = async () => {
    if (!user || !sessionId) return;
    const newStatus = status === "active" ? "draft" : "active";
    setPublishing(true);
    const { error } = await supabase
      .from("sessions")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ status: newStatus } as any)
      .eq("id", sessionId);
    if (error) {
      toast({ title: "Error updating status", description: error.message, variant: "destructive" });
    } else {
      setStatus(newStatus);
      toast({ title: newStatus === "active" ? "Session published" : "Session unpublished" });
    }
    setPublishing(false);
  };

  // ────────────────────────────────────────────
  // Slot helpers
  // ────────────────────────────────────────────

  const toggleDayExpanded = (d: number) =>
    setExpandedDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );

  const slotsForDay = (day: number) => slots.filter((s) => s.day_of_week === day);

  /** Generate all possible slot start times within business hours for a given day */
  const generateAvailableSlots = (): Array<{ start: string; end: string }> => {
    const d = parseInt(durationMinutes) || 60;
    const b = parseInt(breakAfterMinutes) || 0;
    const total = d + b;

    if (!globalConfig.hours_start || !globalConfig.hours_end) return [];

    const earliest = globalConfig.buffer_before_min
      ? addMinsToTime(globalConfig.hours_start, globalConfig.buffer_before_min)
      : globalConfig.hours_start;
    const latestEnd = globalConfig.buffer_after_min
      ? subMinsFromTime(globalConfig.hours_end, globalConfig.buffer_after_min)
      : globalConfig.hours_end;

    const result: Array<{ start: string; end: string }> = [];
    let current = earliest;
    for (let i = 0; i < 100; i++) {
      const end = computeEndTime(current, d);
      if (end > latestEnd) break;
      result.push({ start: current, end });
      current = addMinsToTime(current, total);
      if (current >= latestEnd) break;
    }
    return result;
  };

  const isSlotSelected = (day: number, startTime: string) =>
    slots.some((s) => s.day_of_week === day && s.start_time.slice(0, 5) === startTime);

  const toggleSlot = (day: number, startTime: string, endTime: string) => {
    if (isSlotSelected(day, startTime)) {
      setSlots((prev) =>
        prev.filter((s) => !(s.day_of_week === day && s.start_time.slice(0, 5) === startTime))
      );
    } else {
      setSlots((prev) => [
        ...prev,
        { day_of_week: day, start_time: startTime, end_time: endTime, _local: true },
      ]);
    }
  };

  // ────────────────────────────────────────────
  // Render helpers
  // ────────────────────────────────────────────

  const dur = parseInt(durationMinutes) || 60;
  const brk = parseInt(breakAfterMinutes) || 0;
  const totalMinutes = dur + brk;

  // ────────────────────────────────────────────
  // Loading state
  // ────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ────────────────────────────────────────────
  // Step indicator
  // ────────────────────────────────────────────

  const StepIndicator = () => (
    <div className="flex items-center gap-0 mb-8">
      {[
        { n: 1 as const, label: "Details" },
        { n: 2 as const, label: "Availability" },
        { n: 3 as const, label: "Payment" },
        { n: 4 as const, label: "Add-ons" },
        { n: 5 as const, label: "Extras" },
        { n: 6 as const, label: "Confirmation" },
        { n: 7 as const, label: "Rules" },
      ].map(({ n, label }, i) => (
        <>
          {i > 0 && <div key={`line-${n}`} className="flex-1 h-px bg-border mx-3 min-w-4" />}
          <button
            key={n}
            onClick={() => sessionId ? setStep(n) : undefined}
            disabled={!sessionId && n > 1}
            className={cn(
              "flex items-center gap-1.5 text-[9px] tracking-[0.2em] uppercase transition-colors shrink-0",
              step === n ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              !sessionId && n > 1 && "opacity-40 cursor-not-allowed"
            )}
          >
            <span className={cn(
              "w-5 h-5 rounded-full border flex items-center justify-center text-[9px] transition-colors shrink-0",
              step === n ? "border-foreground bg-foreground text-background" : "border-muted-foreground"
            )}>{n}</span>
            <span className="hidden sm:inline">{label}</span>
          </button>
        </>
      ))}
    </div>
  );

  // ────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar onSignOut={signOut} userEmail={user?.email} />

        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader />

          <main className="flex-1 p-6 md:p-10 overflow-y-auto">
            <div className="max-w-2xl mx-auto flex flex-col gap-8">
              {/* Back */}
              <div>
                <button
                  onClick={() => navigate("/dashboard/sessions")}
                  className="flex items-center gap-2 text-[10px] tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors mb-4"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Back to Sessions
                </button>
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground flex items-center gap-3 mb-2">
                      <span className="inline-block w-6 h-px bg-border" />
                      {isEdit ? "Edit Session" : "New Session"}
                    </p>
                    <h1 className="text-2xl font-light tracking-wide">
                      {isEdit ? title || "Untitled" : "Create Session"}
                    </h1>
                  </div>
                  {isEdit && (
                    <TooltipProvider>
                      <div className="flex items-center gap-2 pb-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => {
                                const bookingUrl = storeSlug
                                  ? `${window.location.origin}/store/${storeSlug}/${slug || sessionId}`
                                  : null;
                                if (bookingUrl) window.open(bookingUrl, "_blank");
                              }}
                              disabled={!storeSlug}
                              className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] tracking-widest uppercase border transition-colors ${
                                storeSlug
                                  ? "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                                  : "border-border/30 text-muted-foreground/30 cursor-not-allowed"
                              }`}
                            >
                              <Eye className="h-3 w-3" />
                              Preview
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="text-xs">
                            {storeSlug ? "Open booking page" : "Configure store slug in Settings first"}
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={async () => {
                                const bookingUrl = storeSlug
                                  ? `${window.location.origin}/store/${storeSlug}/${slug || sessionId}`
                                  : null;
                                if (!bookingUrl) return;
                                try {
                                  await navigator.clipboard.writeText(bookingUrl);
                                  toast({ title: "Link copied!", description: "Booking URL copied to clipboard." });
                                } catch {
                                  toast({ title: "Failed to copy", variant: "destructive" });
                                }
                              }}
                              disabled={!storeSlug}
                              className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] tracking-widest uppercase border transition-colors ${
                                storeSlug
                                  ? "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                                  : "border-border/30 text-muted-foreground/30 cursor-not-allowed"
                              }`}
                            >
                              <Share2 className="h-3 w-3" />
                              Share
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="text-xs">
                            {storeSlug ? "Copy booking link to clipboard" : "Configure store slug in Settings first"}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TooltipProvider>
                  )}
                </div>
              </div>

              {/* Step indicator */}
              <StepIndicator />

              {/* ── STEP 1: Session Details ── */}
              {step === 1 && (
                <>
                  {/* Cover Image */}
                  <section className="flex flex-col gap-3">
                    <Label className="text-[10px] tracking-widest uppercase font-light text-muted-foreground">
                      Cover Photo
                    </Label>
                    <div
                      className="aspect-video border border-dashed border-border relative overflow-hidden cursor-pointer group"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {coverImageUrl ? (
                        <>
                          <img src={coverImageUrl} alt="Cover" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Upload className="h-6 w-6 text-white" />
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground/50">
                          {uploadingCover ? (
                            <Loader2 className="h-6 w-6 animate-spin" />
                          ) : (
                            <>
                              <Upload className="h-6 w-6" />
                              <span className="text-[10px] tracking-widest uppercase">
                                Click to upload
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleCoverUpload}
                    />
                  </section>

                  {/* Basic Info */}
                  <section className="flex flex-col gap-4">
                    <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground flex items-center gap-3">
                      <span className="inline-block w-4 h-px bg-border" />
                      Session Details
                    </p>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="title" className="text-xs tracking-wider uppercase font-light">
                        Title *
                      </Label>
                      <Input
                        id="title"
                        value={title}
                        onChange={(e) => handleTitleChange(e.target.value)}
                        placeholder="e.g. Newborn Session"
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="slug" className="text-xs tracking-wider uppercase font-light">
                        URL Slug
                      </Label>
                      <div className="flex items-center border border-input rounded-none overflow-hidden focus-within:ring-1 focus-within:ring-ring">
                        <span className="px-3 py-2 text-xs text-muted-foreground bg-muted border-r border-input shrink-0 select-none">
                          /book/
                        </span>
                        <input
                          id="slug"
                          value={slug}
                          onChange={(e) => handleSlugChange(e.target.value)}
                          placeholder="newborn-session"
                          className="flex-1 px-3 py-2 text-xs bg-background outline-none placeholder:text-muted-foreground"
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Appears in the booking URL. Auto-generated from the title.
                      </p>
                    </div>

                    {user && (
                      <SessionTypeManager
                        photographerId={user.id}
                        sessionTypes={sessionTypes}
                        selectedTypeId={sessionTypeId}
                        onSelect={setSessionTypeId}
                        onRefetch={fetchSessionTypes}
                      />
                    )}

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="description" className="text-xs tracking-wider uppercase font-light">
                        Description
                      </Label>
                      <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe this session for your clients…"
                        rows={3}
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="location" className="text-xs tracking-wider uppercase font-light">
                        Location
                      </Label>
                      <Input
                        id="location"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="e.g. New York, NY"
                      />
                    </div>

                    {/* Service Agreement */}
                    <div className="flex flex-col gap-2">
                      <Label className="text-xs tracking-wider uppercase font-light">
                        Service Agreement <span className="normal-case tracking-normal text-muted-foreground font-light">(optional)</span>
                      </Label>
                      <select
                        value={selectedContractId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedContractId(val);
                          setShowFullContract(false);
                          if (val === "none") {
                            setContractText("");
                          } else if (val === "existing") {
                            // keep current contractText (loaded from DB)
                          } else {
                            const tpl = contractTemplates.find((c) => c.id === val);
                            setContractText(tpl?.body ?? "");
                          }
                        }}
                        className="h-9 w-full px-3 text-sm font-light bg-background border border-input text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="none">No contract</option>
                        {selectedContractId === "existing" && (
                          <option value="existing">Contract from a previous template</option>
                        )}
                        {contractTemplates.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      {contractTemplates.length === 0 && selectedContractId !== "existing" && (
                        <p className="text-[10px] text-muted-foreground">
                          No contracts saved yet. Create templates in{" "}
                          <button
                            type="button"
                            className="underline hover:no-underline"
                            onClick={() => navigate("/dashboard/personalize")}
                          >
                            Personalize → Studio
                          </button>
                          .
                        </p>
                      )}
                      {contractText && selectedContractId !== "none" && (
                        <div className="border border-border bg-muted/30 p-3">
                          <div
                            className={`prose prose-sm max-w-none text-[11px] text-muted-foreground [&_*]:text-muted-foreground [&_h1]:text-xs [&_h2]:text-xs [&_h3]:text-xs ${!showFullContract ? "line-clamp-4 overflow-hidden" : ""}`}
                            dangerouslySetInnerHTML={{ __html: contractText }}
                          />
                          {contractText.length > 300 ? (
                            <button
                              type="button"
                              className="text-[10px] tracking-wider uppercase text-foreground mt-1.5 hover:underline"
                              onClick={() => setShowFullContract((v) => !v)}
                            >
                              {showFullContract ? "Show less" : "View full contract"}
                            </button>
                          ) : null}
                        </div>
                      )}
                    </div>

                    {/* Briefing / Questionnaire */}
                    <div className="flex flex-col gap-2">
                      <Label className="text-xs tracking-wider uppercase font-light">
                        Briefing / Questionnaire <span className="normal-case tracking-normal text-muted-foreground font-light">(optional)</span>
                      </Label>
                      <select
                        value={selectedBriefingId}
                        onChange={(e) => setSelectedBriefingId(e.target.value)}
                        className="h-9 w-full px-3 text-sm font-light bg-background border border-input text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="none">No briefing</option>
                        {briefingTemplates.map((b) => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                      {briefingTemplates.length === 0 && (
                        <p className="text-[10px] text-muted-foreground">
                          No briefings saved yet. Create templates in{" "}
                          <button
                            type="button"
                            className="underline hover:no-underline"
                            onClick={() => navigate("/dashboard/personalize")}
                          >
                            Personalize → Studio
                          </button>
                          .
                        </p>
                      )}
                      {selectedBriefingId !== "none" && (
                        <p className="text-[10px] text-muted-foreground">
                          After payment, clients will be prompted to fill out this questionnaire.
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="duration" className="text-xs tracking-wider uppercase font-light">
                          Duration (min)
                        </Label>
                        <Input
                          id="duration"
                          type="number"
                          min="15"
                          step="15"
                          value={durationMinutes}
                          onChange={(e) => setDurationMinutes(e.target.value)}
                        />
                      </div>

                      <div className="flex flex-col gap-2">
                        <Label htmlFor="break" className="text-xs tracking-wider uppercase font-light">
                          Break (min)
                        </Label>
                        <Input
                          id="break"
                          type="number"
                          min="0"
                          step="5"
                          value={breakAfterMinutes}
                          onChange={(e) => setBreakAfterMinutes(e.target.value)}
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="numPhotos" className="text-xs tracking-wider uppercase font-light">
                          No. of Photos
                        </Label>
                        <Input
                          id="numPhotos"
                          type="number"
                          min="0"
                          value={numPhotos}
                          onChange={(e) => setNumPhotos(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Duration summary */}
                    {brk > 0 && (
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        Each slot takes {totalMinutes} min ({dur} min session + {brk} min break)
                      </p>
                    )}

                    <div className="flex items-center justify-between border border-border p-4">
                      <div>
                        <p className="text-xs tracking-wider uppercase font-light">Published</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Clients can find and book this session
                        </p>
                      </div>
                      <Switch
                        checked={status === "active"}
                        onCheckedChange={(v) => setStatus(v ? "active" : "draft")}
                      />
                    </div>
                  </section>

                  {/* Step 1 Actions */}
                  <div className="flex items-center justify-between border-t border-border pt-6">
                    <Button
                      variant="ghost"
                      onClick={() => navigate("/dashboard/sessions")}
                      className="text-xs tracking-wider uppercase font-light text-muted-foreground"
                    >
                      Cancel
                    </Button>
                    <div className="flex items-center gap-3">
                      {isEdit && (
                        <Button
                          variant="outline"
                          onClick={handleTogglePublish}
                          disabled={publishing}
                          className="gap-2 text-xs tracking-wider uppercase font-light"
                        >
                          {publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : status === "active" ? <GlobeLock className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
                          {status === "active" ? "Unpublish" : "Publish"}
                        </Button>
                      )}
                      <Button
                        onClick={handleCreateSession}
                        disabled={saving}
                        className="gap-2 text-xs tracking-wider uppercase font-light"
                      >
                        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        {isEdit ? "Save & Continue" : "Create Session"}
                        {!saving && <ArrowRight className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {/* ── STEP 2: Availability ── */}
              {step === 2 && (
                <>
                  {/* Weekly Availability */}
                  <section className="flex flex-col gap-4">
                    <div>
                      <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground flex items-center gap-3">
                        <span className="inline-block w-4 h-px bg-border" />
                        Weekly Availability
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1 ml-7">
                        Define your working hours and buffer once — they apply to all days.
                      </p>
                    </div>

                    {/* Global business hours + buffer config */}
                    {(() => {
                      const hasSlots = slots.length > 0;
                      return (
                        <div className="border border-border bg-muted/5 px-4 py-3 flex flex-col gap-3">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-[9px] tracking-widest uppercase text-muted-foreground w-24 shrink-0">
                              Business hrs
                            </span>
                            <div className="flex items-center gap-2">
                              <TimePickerInput
                                value={globalConfig.hours_start || "09:00"}
                                disabled={hasSlots}
                                onChange={(v) => {
                                  updateGlobalConfig({ hours_start: v });
                                }}
                              />
                              <span className="text-[10px] text-muted-foreground">→</span>
                              <TimePickerInput
                                value={globalConfig.hours_end || "17:00"}
                                disabled={hasSlots}
                                onChange={(v) => updateGlobalConfig({ hours_end: v })}
                              />
                            </div>
                            {!hasSlots && (globalConfig.hours_start || globalConfig.hours_end) && (
                              <button
                                type="button"
                                onClick={() => updateGlobalConfig({ hours_start: "", hours_end: "" })}
                                className="text-[9px] text-muted-foreground/50 hover:text-muted-foreground transition-colors tracking-widest uppercase"
                              >
                                clear
                              </button>
                            )}
                            {hasSlots && (
                              <span className="text-[9px] text-muted-foreground/50 tracking-wide italic">
                                Clear all slots to edit
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-[9px] tracking-widest uppercase text-muted-foreground w-24 shrink-0">
                              Buffer
                            </span>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1.5">
                                <Input
                                  type="number"
                                  min="0"
                                  step="5"
                                  disabled={hasSlots}
                                  value={globalConfig.buffer_before_min || ""}
                                  onChange={(e) => updateGlobalConfig({ buffer_before_min: parseInt(e.target.value) || 0 })}
                                  className="w-16 h-7 text-xs"
                                  placeholder="0"
                                />
                                <span className="text-[9px] text-muted-foreground whitespace-nowrap">min before</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Input
                                  type="number"
                                  min="0"
                                  step="5"
                                  disabled={hasSlots}
                                  value={globalConfig.buffer_after_min || ""}
                                  onChange={(e) => updateGlobalConfig({ buffer_after_min: parseInt(e.target.value) || 0 })}
                                  className="w-16 h-7 text-xs"
                                  placeholder="0"
                                />
                                <span className="text-[9px] text-muted-foreground whitespace-nowrap">min after</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Day rows */}
                    {(() => {
                      const availableSlots = generateAvailableSlots();
                      const hasBusinessHours = !!globalConfig.hours_start && !!globalConfig.hours_end;

                      return (
                        <div className="flex flex-col border border-border divide-y divide-border">
                          {DAY_ORDER.map((dayIdx) => {
                            const daySlots = slotsForDay(dayIdx);
                            const isExpanded = expandedDays.includes(dayIdx);

                            return (
                              <div key={dayIdx}>
                                {/* Day header row */}
                                <button
                                  type="button"
                                  onClick={() => toggleDayExpanded(dayIdx)}
                                  className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-muted/5 transition-colors"
                                >
                                  <ChevronRight className={cn(
                                    "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
                                    isExpanded && "rotate-90"
                                  )} />
                                  <span className={cn(
                                    "text-[11px] tracking-wider uppercase w-28 font-light",
                                    daySlots.length > 0 ? "text-foreground" : "text-muted-foreground"
                                  )}>
                                    {DAY_FULL[dayIdx]}
                                  </span>
                                  {daySlots.length > 0 ? (
                                    <span className="text-[10px] text-muted-foreground">
                                      {daySlots.length} slot{daySlots.length !== 1 ? "s" : ""} selected
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-muted-foreground/40">No slots selected</span>
                                  )}
                                </button>

                                {/* Expanded: slot chips */}
                                {isExpanded && (
                                  <div className="bg-muted/10 border-t border-border/60 px-4 py-4">
                                    {!hasBusinessHours ? (
                                      <p className="text-[11px] text-muted-foreground/50 italic">
                                        Set business hours above to see available slots.
                                      </p>
                                    ) : availableSlots.length === 0 ? (
                                      <p className="text-[11px] text-muted-foreground/50 italic">
                                        No slots fit within the business hours. Try adjusting the duration or hours.
                                      </p>
                                    ) : (
                                      <div className="flex flex-wrap gap-2">
                                        {availableSlots.map(({ start, end }) => {
                                          const selected = isSlotSelected(dayIdx, start);
                                          return (
                                            <button
                                              key={start}
                                              type="button"
                                              onClick={() => toggleSlot(dayIdx, start, end)}
                                              className={cn(
                                                "flex items-center gap-1.5 px-3 py-1.5 border text-[11px] tracking-wide transition-colors",
                                                selected
                                                  ? "bg-foreground text-background border-foreground"
                                                  : "bg-background text-muted-foreground border-border hover:border-foreground hover:text-foreground"
                                              )}
                                            >
                                              <Clock className="h-3 w-3 shrink-0" />
                                               {formatTime12(start)}
                                              <span className={cn("opacity-60", selected && "opacity-80")}>→ {formatTime12(end)}</span>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </section>

                  {/* Step 2 Actions */}
                  <div className="flex items-center justify-between border-t border-border pt-6">
                    <Button variant="ghost" onClick={() => setStep(1)} className="gap-2 text-xs tracking-wider uppercase font-light text-muted-foreground">
                      <ArrowLeft className="h-3.5 w-3.5" />Back
                    </Button>
                    <div className="flex items-center gap-3">
                      {isEdit && (
                        <Button variant="outline" onClick={handleTogglePublish} disabled={publishing} className="gap-2 text-xs tracking-wider uppercase font-light">
                          {publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : status === "active" ? <GlobeLock className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
                          {status === "active" ? "Unpublish" : "Publish"}
                        </Button>
                      )}
                      <Button onClick={handleSaveAvailability} disabled={saving} className="gap-2 text-xs tracking-wider uppercase font-light">
                        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        Save & Continue
                        {!saving && <ArrowRight className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {/* ── STEP 3: Payment ── */}
              {step === 3 && (
                <>
                  <section className="flex flex-col gap-5">
                    <div>
                      <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground flex items-center gap-3">
                        <span className="inline-block w-4 h-px bg-border" />
                        Payment Settings
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1 ml-7">
                        Configure how clients pay when booking this session.
                      </p>
                    </div>



                    {/* ── Require Payment Toggle ── */}
                    <div className="flex items-start justify-between border border-border p-4 gap-4">
                      <div className="flex flex-col gap-1">
                        <p className="text-xs tracking-wider uppercase font-light">Require payment at booking</p>
                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                          Clients will be redirected to Stripe Checkout to pay when booking.
                          Disable to allow free bookings regardless of price.
                        </p>
                      </div>
                      <Switch
                        checked={requirePayment}
                        onCheckedChange={setRequirePayment}
                      />
                    </div>

                    {/* ── Collected Amount ── */}
                    <div className="border border-border p-4 flex flex-col gap-3">
                      <p className="text-[9px] tracking-widest uppercase text-muted-foreground">Collected Amount</p>
                      <div className="flex items-start gap-4">
                        <div className="flex flex-col gap-1.5 flex-1">
                          <Label htmlFor="pay-price" className="text-xs tracking-wider uppercase font-light">
                            Session Price (USD)
                          </Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                            <Input
                              id="pay-price"
                              type="number"
                              min="0"
                              step="0.01"
                              value={price}
                              onChange={(e) => setPrice(e.target.value)}
                              placeholder="0.00"
                              className="pl-7"
                            />
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5 shrink-0 pt-6">
                          <p className="text-[10px] text-muted-foreground">Session</p>
                          <p className="text-sm font-light tracking-wide">{title || "Untitled"}</p>
                        </div>
                      </div>
                    </div>

                    {/* ── Tax ── */}
                    {(() => {
                      const priceVal = parseFloat(price || "0");
                      const taxAmt = taxEnabled ? (priceVal * parseFloat(taxRate || "0")) / 100 : 0;
                      const total = priceVal + taxAmt;
                      return (
                        <div className="border border-border p-4 flex flex-col gap-3">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex flex-col gap-0.5">
                              <p className="text-xs tracking-wider uppercase font-light">Add Tax</p>
                              <p className="text-[10px] text-muted-foreground leading-relaxed">
                                Specify a tax percentage to display to clients.
                              </p>
                            </div>
                            <Switch checked={taxEnabled} onCheckedChange={setTaxEnabled} />
                          </div>
                          {taxEnabled && (
                            <div className="flex items-center gap-4 mt-1">
                              <div className="flex flex-col gap-1.5">
                                <Label htmlFor="tax-rate" className="text-[9px] tracking-widest uppercase text-muted-foreground">
                                  Tax Rate
                                </Label>
                                <div className="flex items-center gap-2">
                                  <Input
                                    id="tax-rate"
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    value={taxRate}
                                    onChange={(e) => setTaxRate(e.target.value)}
                                    placeholder="0.00"
                                    className="w-24 h-8 text-sm"
                                  />
                                  <span className="text-xs text-muted-foreground">%</span>
                                </div>
                              </div>
                              {priceVal > 0 && (
                                <div className="flex flex-col gap-1 text-[10px] text-muted-foreground">
                                  <span>Tax: <span className="text-foreground font-light">${taxAmt.toFixed(2)}</span></span>
                                  <span>Total: <span className="text-foreground font-light">${total.toFixed(2)}</span></span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* ── Partial Payment / Deposit ── */}
                    {(() => {
                      const priceVal = parseFloat(price || "0");
                      const depositVal = parseFloat(depositAmount || "0");
                      const depositInDollars =
                        depositType === "percent"
                          ? (priceVal * depositVal) / 100
                          : depositVal;
                      const remaining = priceVal - depositInDollars;

                      return (
                        <div className="border border-border p-4 flex flex-col gap-3">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex flex-col gap-0.5">
                              <p className="text-xs tracking-wider uppercase font-light">Require Deposit at Booking</p>
                              <p className="text-[10px] text-muted-foreground leading-relaxed">
                                Collect a partial amount upfront; the rest is due at the session.
                              </p>
                            </div>
                            <Switch checked={depositEnabled} onCheckedChange={setDepositEnabled} />
                          </div>
                          {depositEnabled && (
                            <div className="flex flex-col gap-3 mt-1">
                              {/* Type selector */}
                              <div className="flex rounded-md border border-border overflow-hidden w-fit">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (depositType === "percent") {
                                      const pct = parseFloat(depositAmount || "0");
                                      const sessionPriceVal = parseFloat(price || "0");
                                      const fixedVal = (pct / 100) * sessionPriceVal;
                                      setDepositAmount(fixedVal > 0 ? fixedVal.toFixed(2) : "");
                                    }
                                    setDepositType("fixed");
                                  }}
                                  className={cn(
                                    "px-3 py-1 text-[10px] tracking-widest uppercase transition-colors",
                                    depositType === "fixed"
                                      ? "bg-foreground text-background"
                                      : "text-muted-foreground hover:text-foreground"
                                  )}
                                >
                                  $ Value
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (depositType === "fixed") {
                                      // Convert fixed → %: (fixedVal / sessionPrice) * 100
                                      const fixedVal = parseFloat(depositAmount || "0");
                                      const sessionPriceVal = parseFloat(price || "0");
                                      const pct = sessionPriceVal > 0 ? (fixedVal / sessionPriceVal) * 100 : 0;
                                      setDepositAmount(pct > 0 ? String(Math.round(pct)) : "");
                                    }
                                    setDepositType("percent");
                                  }}
                                  className={cn(
                                    "px-3 py-1 text-[10px] tracking-widest uppercase transition-colors border-l border-border",
                                    depositType === "percent"
                                      ? "bg-foreground text-background"
                                      : "text-muted-foreground hover:text-foreground"
                                  )}
                                >
                                  % Percent
                                </button>
                              </div>

                              <div className="flex items-center gap-4">
                                <div className="flex flex-col gap-1.5 w-40">
                                  <Label htmlFor="deposit-amt" className="text-[9px] tracking-widest uppercase text-muted-foreground">
                                    {depositType === "fixed" ? "Deposit Amount" : "Deposit Percentage"}
                                  </Label>
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                      {depositType === "fixed" ? "$" : "%"}
                                    </span>
                                    <Input
                                      id="deposit-amt"
                                      type="number"
                                      min="0"
                                      max={depositType === "percent" ? "100" : undefined}
                                      step="0.01"
                                      value={depositAmount}
                                      onChange={(e) => setDepositAmount(e.target.value)}
                                      placeholder={depositType === "percent" ? "25" : "0.00"}
                                      className="pl-7 h-8 text-sm"
                                    />
                                  </div>
                                </div>
                                {depositVal > 0 && priceVal > 0 && (
                                  <div className="flex flex-col gap-1 text-[10px] text-muted-foreground">
                                    {depositType === "percent" && (
                                      <span>
                                        Deposit:{" "}
                                        <span className="text-foreground font-light">
                                          ${depositInDollars.toFixed(2)}
                                        </span>
                                      </span>
                                    )}
                                    <span>
                                      Remaining:{" "}
                                      <span className={cn("font-light", remaining < 0 ? "text-destructive" : "text-foreground")}>
                                        ${Math.max(remaining, 0).toFixed(2)}
                                      </span>{" "}
                                      due at session
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* ── Allow Tip ── */}
                    <div className="flex items-start justify-between border border-border p-4 gap-4">
                      <div className="flex flex-col gap-0.5">
                        <p className="text-xs tracking-wider uppercase font-light">Allow Tip</p>
                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                          Clients can add a gratuity at checkout.
                        </p>
                      </div>
                      <Switch checked={allowTip} onCheckedChange={setAllowTip} />
                    </div>

                  </section>

                  {/* Step 3 Actions */}
                  <div className="flex items-center justify-between border-t border-border pt-6">
                    <Button variant="ghost" onClick={() => setStep(2)} className="gap-2 text-xs tracking-wider uppercase font-light text-muted-foreground">
                      <ArrowLeft className="h-3.5 w-3.5" />Back
                    </Button>
                    <div className="flex items-center gap-3">
                      {isEdit && (
                        <Button variant="outline" onClick={handleTogglePublish} disabled={publishing} className="gap-2 text-xs tracking-wider uppercase font-light">
                          {publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : status === "active" ? <GlobeLock className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
                          {status === "active" ? "Unpublish" : "Publish"}
                        </Button>
                      )}
                      <Button onClick={handleFinish} disabled={saving} className="gap-2 text-xs tracking-wider uppercase font-light">
                        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        Save & Continue
                        {!saving && <ArrowRight className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {/* ── STEP 4: Additional Photos ── */}
              {step === 4 && (
                <>
                  <section className="flex flex-col gap-5">
                    <div>
                      <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground flex items-center gap-3">
                        <span className="inline-block w-4 h-px bg-border" />
                        Additional Photos
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1 ml-7">
                        Configure tiered pricing for extra photos. Higher quantities can have a lower price per photo.
                      </p>
                    </div>

                    {/* Tiers list */}
                    <div className="flex flex-col gap-3">
                      {photoTiers.length === 0 && (
                        <p className="text-[10px] text-muted-foreground italic border border-dashed border-border p-4 text-center">
                          No tiers added yet. Add a tier below to enable extra photo purchases.
                        </p>
                      )}
                      {photoTiers.map((tier, idx) => (
                        <div key={idx} className="border border-border p-4 flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <p className="text-[9px] tracking-widest uppercase text-muted-foreground">Tier {idx + 1}</p>
                            <button
                              type="button"
                              onClick={() => setPhotoTiers((prev) => prev.filter((_, i) => i !== idx))}
                              className="text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1.5">
                              <Label className="text-[9px] tracking-widest uppercase text-muted-foreground">Qty extra photos</Label>
                              <Input
                                type="number" min="1" step="1"
                                value={tier.min_photos}
                                onChange={(e) => setPhotoTiers((prev) => prev.map((t, i) => i === idx ? { ...t, min_photos: parseInt(e.target.value) || 1 } : t))}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <Label className="text-[9px] tracking-widest uppercase text-muted-foreground">Price / photo</Label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                                <Input
                                  type="number" min="0" step="0.01"
                                  value={tier.price_per_photo}
                                  placeholder="0.00"
                                  onChange={(e) => setPhotoTiers((prev) => prev.map((t, i) => i === idx ? { ...t, price_per_photo: e.target.value } : t))}
                                  className="pl-7 h-8 text-sm"
                                />
                              </div>
                            </div>
                          </div>
                          {tier.min_photos > 0 && parseFloat(tier.price_per_photo || "0") > 0 && (
                            <p className="text-[10px] text-muted-foreground">
                              {tier.min_photos} extra photo{tier.min_photos > 1 ? "s" : ""} ×{" "}
                              <span className="text-foreground font-light">${parseFloat(tier.price_per_photo).toFixed(2)}</span>{" "}
                              ={" "}
                              <span className="text-foreground font-light">${(parseFloat(tier.price_per_photo) * tier.min_photos).toFixed(2)}</span>
                            </p>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Add tier button */}
                    <button
                      type="button"
                      onClick={() => {
                        const last = photoTiers.at(-1);
                        const newMin = last?.max_photos != null ? last.max_photos + 1 : (last ? last.min_photos + 10 : 1);
                        setPhotoTiers((prev) => [...prev, { min_photos: newMin, max_photos: null, price_per_photo: "", _local: true }]);
                      }}
                      className="flex items-center gap-2 text-[10px] tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors border border-dashed border-border p-3 w-full justify-center"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Tier
                    </button>
                  </section>

                  {/* Step 4 Actions */}
                  <div className="flex items-center justify-between border-t border-border pt-6">
                    <Button variant="ghost" onClick={() => setStep(3)} className="gap-2 text-xs tracking-wider uppercase font-light text-muted-foreground">
                      <ArrowLeft className="h-3.5 w-3.5" />Back
                    </Button>
                    <div className="flex items-center gap-3">
                      {isEdit && (
                        <Button variant="outline" onClick={handleTogglePublish} disabled={publishing} className="gap-2 text-xs tracking-wider uppercase font-light">
                          {publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : status === "active" ? <GlobeLock className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
                          {status === "active" ? "Unpublish" : "Publish"}
                        </Button>
                      )}
                      <Button onClick={handleFinishTiers} disabled={saving} className="gap-2 text-xs tracking-wider uppercase font-light">
                        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        Save & Continue <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {/* ── STEP 5: Extras ── */}
              {step === 5 && (
                <>
                  <section className="flex flex-col gap-5">
                    <div>
                      <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground flex items-center gap-3">
                        <span className="inline-block w-4 h-px bg-border" />
                        Extras
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1 ml-7">
                        Optional add-ons clients can select when booking this session.
                      </p>
                    </div>

                    <div className="flex flex-col gap-3">
                      {sessionExtras.length === 0 && (
                        <p className="text-[10px] text-muted-foreground italic border border-dashed border-border p-4 text-center">
                          No extras added yet. Add items below.
                        </p>
                      )}
                      {sessionExtras.map((extra, idx) => (
                        <div key={idx} className="border border-border p-4 flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <p className="text-[9px] tracking-widest uppercase text-muted-foreground">Item {idx + 1}</p>
                            <button
                              type="button"
                              onClick={() => setSessionExtras((prev) => prev.filter((_, i) => i !== idx))}
                              className="text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div className="flex flex-col gap-1.5 col-span-1">
                              <Label className="text-[9px] tracking-widest uppercase text-muted-foreground">Description</Label>
                              <input
                                type="text"
                                value={extra.description}
                                onChange={(e) => setSessionExtras((prev) => prev.map((x, i) => i === idx ? { ...x, description: e.target.value } : x))}
                                placeholder="e.g. Printed album"
                                className="h-8 text-sm border border-input bg-background rounded-md px-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                              />
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <Label className="text-[9px] tracking-widest uppercase text-muted-foreground">Máx. por reserva</Label>
                              <input
                                type="number" min="1" step="1"
                                value={extra.quantity}
                                onChange={(e) => setSessionExtras((prev) => prev.map((x, i) => i === idx ? { ...x, quantity: e.target.value } : x))}
                                className="h-8 text-sm border border-input bg-background rounded-md px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                              />
                              <p className="text-[9px] text-muted-foreground">Deixe em 1 para sem limite (até 99)</p>
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <Label className="text-[9px] tracking-widest uppercase text-muted-foreground">Price</Label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                                <input
                                  type="number" min="0" step="0.01"
                                  value={extra.price}
                                  placeholder="0.00"
                                  onChange={(e) => setSessionExtras((prev) => prev.map((x, i) => i === idx ? { ...x, price: e.target.value } : x))}
                                  className="pl-7 h-8 text-sm w-full border border-input bg-background rounded-md pr-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => setSessionExtras((prev) => [...prev, { description: "", quantity: "1", price: "", _local: true }])}
                      className="flex items-center gap-2 text-[10px] tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors border border-dashed border-border p-3 w-full justify-center"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Extra
                    </button>
                  </section>

                  {/* Step 5 Actions */}
                  <div className="flex items-center justify-between border-t border-border pt-6">
                    <Button variant="ghost" onClick={() => setStep(4)} className="gap-2 text-xs tracking-wider uppercase font-light text-muted-foreground">
                      <ArrowLeft className="h-3.5 w-3.5" />Back
                    </Button>
                    <div className="flex items-center gap-3">
                      {isEdit && (
                        <Button variant="outline" onClick={handleTogglePublish} disabled={publishing} className="gap-2 text-xs tracking-wider uppercase font-light">
                          {publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : status === "active" ? <GlobeLock className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
                          {status === "active" ? "Unpublish" : "Publish"}
                        </Button>
                      )}
                      <Button onClick={handleFinishExtras} disabled={saving} className="gap-2 text-xs tracking-wider uppercase font-light">
                        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        Save & Continue
                        {!saving && <ArrowRight className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {/* ── STEP 6: Confirmation ── */}
              {step === 6 && (
                <>
                  <section className="flex flex-col gap-5">
                    <div>
                      <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground flex items-center gap-3">
                        <span className="inline-block w-4 h-px bg-border" />
                        Confirmation
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1 ml-7">
                        Customize the email clients receive after booking, and set reminder notifications.
                      </p>
                    </div>

                    {/* ── Confirmation Email ── */}
                    <div className="flex flex-col gap-3 border border-border p-4">
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        <p className="text-[10px] tracking-widest uppercase text-muted-foreground">Confirmation Email Message</p>
                      </div>

                      {/* Rich text toolbar */}
                      <div className="flex items-center gap-1 border border-border p-1 flex-wrap">
                        {[
                          { label: "B", action: () => editor?.chain().focus().toggleBold().run(), isActive: editor?.isActive("bold") },
                          { label: "I", action: () => editor?.chain().focus().toggleItalic().run(), isActive: editor?.isActive("italic") },
                          { label: "S", action: () => editor?.chain().focus().toggleStrike().run(), isActive: editor?.isActive("strike") },
                        ].map(({ label, action, isActive }) => (
                          <button
                            key={label}
                            type="button"
                            onClick={action}
                            className={cn(
                              "w-7 h-7 text-xs font-medium border transition-colors",
                              isActive
                                ? "bg-foreground text-background border-foreground"
                                : "border-border text-muted-foreground hover:text-foreground hover:border-foreground"
                            )}
                          >
                            {label}
                          </button>
                        ))}
                        <div className="w-px h-5 bg-border mx-1" />
                        {[
                          { label: "H1", action: () => editor?.chain().focus().toggleHeading({ level: 1 }).run(), isActive: editor?.isActive("heading", { level: 1 }) },
                          { label: "H2", action: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(), isActive: editor?.isActive("heading", { level: 2 }) },
                        ].map(({ label, action, isActive }) => (
                          <button
                            key={label}
                            type="button"
                            onClick={action}
                            className={cn(
                              "px-2 h-7 text-[10px] tracking-widest uppercase border transition-colors",
                              isActive
                                ? "bg-foreground text-background border-foreground"
                                : "border-border text-muted-foreground hover:text-foreground hover:border-foreground"
                            )}
                          >
                            {label}
                          </button>
                        ))}
                        <div className="w-px h-5 bg-border mx-1" />
                        <button
                          type="button"
                          onClick={() => editor?.chain().focus().toggleBulletList().run()}
                          className={cn(
                            "px-2 h-7 text-[10px] tracking-widest uppercase border transition-colors",
                            editor?.isActive("bulletList")
                              ? "bg-foreground text-background border-foreground"
                              : "border-border text-muted-foreground hover:text-foreground hover:border-foreground"
                          )}
                        >
                          List
                        </button>
                        <button
                          type="button"
                          onClick={() => editor?.chain().focus().undo().run()}
                          className="px-2 h-7 text-[10px] tracking-widest uppercase border border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-colors ml-auto"
                        >
                          Undo
                        </button>
                      </div>

                      {/* Editor area */}
                      <div className="border border-border min-h-[200px] cursor-text" onClick={() => editor?.commands.focus()}>
                        <EditorContent
                          editor={editor}
                          className="prose prose-sm max-w-none p-4 focus:outline-none [&_.ProseMirror]:min-h-[180px] [&_.ProseMirror]:outline-none [&_.ProseMirror]:text-sm [&_.ProseMirror]:font-light [&_.ProseMirror_p]:mb-2 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-4 [&_.ProseMirror_h1]:text-lg [&_.ProseMirror_h1]:font-light [&_.ProseMirror_h2]:text-base [&_.ProseMirror_h2]:font-light"
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        This message will be included in the booking confirmation email sent to clients.
                      </p>
                    </div>

                    {/* ── Session Reminders ── */}
                    <div className="flex flex-col gap-3 border border-border p-4">
                      <div className="flex items-center gap-2">
                        <Bell className="h-3.5 w-3.5 text-muted-foreground" />
                        <p className="text-[10px] tracking-widest uppercase text-muted-foreground">Session Reminders</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Automatically send reminder emails to clients before their session.
                      </p>
                      <div className="flex flex-col gap-2">
                        {[
                          { days: 14, label: "14 days before" },
                          { days: 7, label: "7 days before" },
                          { days: 1, label: "1 day before" },
                        ].map(({ days, label }) => {
                          const checked = reminderDays.includes(days);
                          return (
                            <button
                              key={days}
                              type="button"
                              onClick={() =>
                                setReminderDays((prev) =>
                                  checked ? prev.filter((d) => d !== days) : [...prev, days]
                                )
                              }
                              className={cn(
                                "flex items-center justify-between px-4 py-3 border transition-colors text-left",
                                checked
                                  ? "border-foreground bg-foreground/5"
                                  : "border-border hover:border-foreground/40"
                              )}
                            >
                              <span className="text-xs font-light tracking-wide">{label}</span>
                              <span className={cn(
                                "w-4 h-4 border-2 flex items-center justify-center transition-colors shrink-0",
                                checked ? "border-foreground bg-foreground" : "border-muted-foreground"
                              )}>
                                {checked && (
                                  <svg viewBox="0 0 10 8" className="w-2.5 h-2 fill-background">
                                    <path d="M1 4l2.5 2.5L9 1" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                )}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      {reminderDays.length > 0 && (
                        <p className="text-[10px] text-muted-foreground">
                          Reminders will be sent {reminderDays.sort((a, b) => b - a).map((d) => `${d} day${d > 1 ? "s" : ""}`).join(", ")} before the session.
                        </p>
                      )}
                    </div>
                  </section>

                  {/* Step 6 Actions */}
                  <div className="flex items-center justify-between border-t border-border pt-6">
                    <Button variant="ghost" onClick={() => setStep(5)} className="gap-2 text-xs tracking-wider uppercase font-light text-muted-foreground">
                      <ArrowLeft className="h-3.5 w-3.5" />Back
                    </Button>
                    <div className="flex items-center gap-3">
                      {isEdit && (
                        <Button variant="outline" onClick={handleTogglePublish} disabled={publishing} className="gap-2 text-xs tracking-wider uppercase font-light">
                          {publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : status === "active" ? <GlobeLock className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
                          {status === "active" ? "Unpublish" : "Publish"}
                        </Button>
                      )}
                      <Button onClick={handleFinishConfirmation} disabled={saving} className="gap-2 text-xs tracking-wider uppercase font-light">
                        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        Save & Continue
                        {!saving && <ArrowRight className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {/* ── STEP 7: Booking Rules ── */}
              {step === 7 && (
                <>
                  <section className="flex flex-col gap-5">
                    <div>
                      <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground flex items-center gap-3">
                        <span className="inline-block w-4 h-px bg-border" />
                        Booking Rules
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1 ml-7">
                        Control when clients can schedule sessions.
                      </p>
                    </div>

                    {/* Notice period */}
                    <div className="border border-border p-5 flex flex-col gap-3">
                      <div>
                        <p className="text-xs tracking-wider uppercase font-light">Notice Required</p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          How many days in advance must a client book? Prevents last-minute same-day bookings.
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={bookingNoticeDays}
                          onChange={(e) => setBookingNoticeDays(e.target.value)}
                          className="w-24 h-10 text-sm text-center"
                        />
                        <span className="text-sm text-muted-foreground font-light">
                          day{parseInt(bookingNoticeDays) !== 1 ? "s" : ""} notice required
                        </span>
                      </div>
                      {parseInt(bookingNoticeDays) === 0 && (
                        <p className="text-[10px] text-muted-foreground/60 italic">
                          Clients can book for today (same-day bookings allowed).
                        </p>
                      )}
                      {parseInt(bookingNoticeDays) > 0 && (
                        <p className="text-[10px] text-muted-foreground/60 italic">
                          The earliest a client can book is {parseInt(bookingNoticeDays)} day{parseInt(bookingNoticeDays) !== 1 ? "s" : ""} from today.
                        </p>
                      )}
                    </div>

                    {/* Booking window */}
                    <div className="border border-border p-5 flex flex-col gap-3">
                      <div>
                        <p className="text-xs tracking-wider uppercase font-light">Booking Window</p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          How far into the future can clients book? Limits the calendar visibility.
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          value={bookingWindowDays}
                          onChange={(e) => setBookingWindowDays(e.target.value)}
                          className="w-24 h-10 text-sm text-center"
                        />
                        <span className="text-sm text-muted-foreground font-light">
                          day{parseInt(bookingWindowDays) !== 1 ? "s" : ""} into the future
                        </span>
                      </div>
                      {parseInt(bookingWindowDays) > 0 && (
                        <p className="text-[10px] text-muted-foreground/60 italic">
                          Clients can book sessions up to {parseInt(bookingWindowDays)} days from today.
                        </p>
                      )}
                    </div>
                  </section>

                  {/* Step 7 Actions */}
                  <div className="flex items-center justify-between border-t border-border pt-6">
                    <Button variant="ghost" onClick={() => setStep(6)} className="gap-2 text-xs tracking-wider uppercase font-light text-muted-foreground">
                      <ArrowLeft className="h-3.5 w-3.5" />Back
                    </Button>
                    <div className="flex items-center gap-3">
                      {isEdit && (
                        <Button variant="outline" onClick={handleTogglePublish} disabled={publishing} className="gap-2 text-xs tracking-wider uppercase font-light">
                          {publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : status === "active" ? <GlobeLock className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
                          {status === "active" ? "Unpublish" : "Publish"}
                        </Button>
                      )}
                      <Button onClick={handleFinishBookingRules} disabled={saving} className="gap-2 text-xs tracking-wider uppercase font-light">
                        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        Save & Finish
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default SessionForm;
