import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { useCustomDomainSlug } from "@/contexts/CustomDomainSlugContext";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import SignatureCanvas from "react-signature-canvas";
import {
  addDays,
  format,
  getDay,
  isBefore,
  startOfToday,
  parse,
  addMinutes,
  isSameDay,
} from "date-fns";
import { ArrowLeft, ArrowRight, Camera, Check, ChevronLeft, ChevronRight, Clock, Loader2, MapPin, Minus, Plus, PenLine } from "lucide-react";
import { cn, formatTime12 } from "@/lib/utils";

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────

interface SessionDetail {
  id: string;
  title: string;
  description: string | null;
  tagline: string | null;
  price: number;
  duration_minutes: number;
  break_after_minutes: number;
  num_photos: number;
  location: string | null;
  cover_image_url: string | null;
  photographer_id: string;
  deposit_enabled: boolean;
  deposit_amount: number;
  deposit_type: string;
  tax_rate: number;
  allow_tip: boolean;
  booking_notice_days: number;
  booking_window_days: number;
  contract_text: string | null;
  virtual_block_percent: number;
  portfolio_photos: string[] | null;
}

interface PhotographerInfo {
  full_name: string | null;
  hero_image_url: string | null;
  logo_url?: string | null;
}

interface WeeklySlotDef {
  id: string;
  day_of_week: number;
  start_time: string;
}

interface CampaignSlotDef {
  id: string;
  date: string; // yyyy-MM-dd
  start_time: string;
  end_time: string;
  spots: number;
  location_override: string | null;
}

interface BlockedTime {
  date: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
}

interface GeneratedSlot {
  availabilityId: string;
  date: Date;
  start_time: string;
  end_time: string;
  label: string;
  disabled?: boolean;
  disabledReason?: "booked" | "blocked" | "full";
  spotsLeft?: number;
  totalSpots?: number;
}

interface SessionExtra {
  id: string;
  description: string;
  price: number;
  quantity: number;
}

interface SelectedExtra {
  id: string;
  description: string;
  price: number;
  qty: number;
  maxQty: number;
}

type BookingStep = "product" | "slots" | "form" | "addons" | "review";

// ────────────────────────────────────────────
// SingleSlideWithMasonry — shows main photo at full height,
// fills lateral gaps with mini masonry grids from portfolio
// ────────────────────────────────────────────

const SingleSlideWithMasonry = ({
  src,
  alt,
  sidePhotos,
}: {
  src: string;
  alt: string;
  sidePhotos: string[];
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sideW, setSideW] = useState(0);

  const handleImgLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      const ratio = img.naturalWidth / img.naturalHeight;
      const container = containerRef.current;
      if (!container) return;
      const cW = container.clientWidth;
      const cH = container.clientHeight;
      const imgDisplayW = cH * ratio;
      if (imgDisplayW >= cW) {
        setSideW(0);
      } else {
        setSideW(Math.ceil((cW - imgDisplayW) / 2));
      }
    },
    [],
  );

  const leftPhotos = sidePhotos.slice(0, 3);
  const rightPhotos = sidePhotos.slice(3, 6);

  return (
    <div ref={containerRef} className="relative flex h-full w-full overflow-hidden bg-black">
      {/* Left masonry */}
      {sideW > 0 && (
        <div className="flex flex-col gap-0 shrink-0 h-full overflow-hidden" style={{ width: sideW }}>
          {leftPhotos.map((p, j) => (
            <div key={j} className="flex-1 overflow-hidden min-h-0">
              <img src={p} alt="" className="w-full h-full object-cover" draggable={false} />
            </div>
          ))}
        </div>
      )}

      {/* Main image — full height, no crop */}
      <div className="flex-1 h-full flex items-center justify-center min-w-0">
        <img
          src={src}
          alt={alt}
          className="h-full object-contain"
          draggable={false}
          onLoad={handleImgLoad}
        />
      </div>

      {/* Right masonry */}
      {sideW > 0 && (
        <div className="flex flex-col gap-0 shrink-0 h-full overflow-hidden" style={{ width: sideW }}>
          {rightPhotos.map((p, j) => (
            <div key={j} className="flex-1 overflow-hidden min-h-0">
              <img src={p} alt="" className="w-full h-full object-cover" draggable={false} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────

const generateOccurrences = (
  defs: WeeklySlotDef[],
  bookedKeys: Set<string>,
  blockedTimes: BlockedTime[],
  durationMin: number,
  noticeDays: number,
  windowDays: number
): GeneratedSlot[] => {
  const today = startOfToday();
  const result: GeneratedSlot[] = [];

  // Build a map: dateKey → blocked ranges for O(1) lookup
  const blockedByDate = new Map<string, { start: string; end: string; all_day: boolean }[]>();
  for (const bt of blockedTimes) {
    const key = bt.date;
    if (!blockedByDate.has(key)) blockedByDate.set(key, []);
    blockedByDate.get(key)!.push({ start: bt.start_time.slice(0, 5), end: bt.end_time.slice(0, 5), all_day: bt.all_day });
  }

  const isSlotBlocked = (dateKey: string, slotStart: string, slotEnd: string): boolean => {
    const ranges = blockedByDate.get(dateKey);
    if (!ranges) return false;
    for (const r of ranges) {
      if (r.all_day) return true;
      // Overlap: slot starts before block ends AND slot ends after block starts
      if (slotStart < r.end && slotEnd > r.start) return true;
    }
    return false;
  };

  for (let offset = noticeDays; offset < windowDays; offset++) {
    const date = addDays(today, offset);
    const dayOfWeek = getDay(date);

    for (const def of defs) {
      if (def.day_of_week !== dayOfWeek) continue;

      const startHHmm = def.start_time.slice(0, 5);
      const startDate = parse(startHHmm, "HH:mm", date);
      if (isBefore(startDate, new Date())) continue;

      const dateKey = format(date, "yyyy-MM-dd");
      const key = `${def.id}_${dateKey}`;
      const endDate = addMinutes(startDate, durationMin);
      const endHHmm = format(endDate, "HH:mm");

      const isBooked = bookedKeys.has(key);
      const isBlocked = isSlotBlocked(dateKey, startHHmm, endHHmm);

      result.push({
        availabilityId: def.id,
        date,
        start_time: startHHmm,
        end_time: endHHmm,
        label: format(date, "EEEE, MMMM d"),
        disabled: isBooked || isBlocked,
        disabledReason: isBooked ? "booked" : isBlocked ? "blocked" : undefined,
      });
    }
  }

  return result;
};

const getInitials = (name: string | null | undefined): string => {
  if (!name) return "P";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("");
};

// Resolve [[key]] variable tokens stored in contract HTML
function resolveSessionContractVariables(
  html: string,
  data: Record<string, string>
): string {
  return Object.entries(data).reduce((acc, [key, val]) => {
    return acc.replace(new RegExp(`\\[\\[${key}\\]\\]`, "g"), val);
  }, html);
}

// ────────────────────────────────────────────
// Component
// ────────────────────────────────────────────

const SessionDetailPage = () => {
  const { slug, sessionSlug } = useParams();
  const customDomainSlug = useCustomDomainSlug();
  const backPath = customDomainSlug ? "/" : `/store/${slug ?? customDomainSlug}`;
  const navigate = useNavigate();
  const { toast } = useToast();

  const [session, setSession] = useState<SessionDetail | null>(null);
  const [photographer, setPhotographer] = useState<PhotographerInfo | null>(null);
  const [generatedSlots, setGeneratedSlots] = useState<GeneratedSlot[]>([]);
  const [campaignSlots, setCampaignSlots] = useState<CampaignSlotDef[]>([]);
  const [isCampaign, setIsCampaign] = useState(false);
  const [extras, setExtras] = useState<SessionExtra[]>([]);
  const [bonuses, setBonuses] = useState<string[]>([]);
  const [portfolioImages, setPortfolioImages] = useState<string[]>([]);
  const [sliderIndex, setSliderIndex] = useState(0);
  const sliderTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<BookingStep>("product");

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedSlot, setSelectedSlot] = useState<GeneratedSlot | null>(null);
  const [selectedExtras, setSelectedExtras] = useState<SelectedExtra[]>([]);
  const clientStorageKey = `booking_client_${sessionSlug}`;
  const [clientName, setClientName] = useState(() => {
    try { return JSON.parse(localStorage.getItem(clientStorageKey) ?? "{}").name ?? ""; } catch { return ""; }
  });
  const [clientEmail, setClientEmail] = useState(() => {
    try { return JSON.parse(localStorage.getItem(clientStorageKey) ?? "{}").email ?? ""; } catch { return ""; }
  });
  const [clientPhone, setClientPhone] = useState(() => {
    try { return JSON.parse(localStorage.getItem(clientStorageKey) ?? "{}").phone ?? ""; } catch { return ""; }
  });
  const [clientNotes, setClientNotes] = useState(() => {
    try { return JSON.parse(localStorage.getItem(clientStorageKey) ?? "{}").notes ?? ""; } catch { return ""; }
  });
  const [submitting, setSubmitting] = useState(false);
  const [contractAgreed, setContractAgreed] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);

  // Signature modal state
  const [sigModalOpen, setSigModalOpen] = useState(false);
  const [sigTab, setSigTab] = useState<"draw" | "type">("draw");
  const [sigTyped, setSigTyped] = useState("");
  const [sigLegalChecked, setSigLegalChecked] = useState(false);
  const [sigPendingData, setSigPendingData] = useState<string | null>(null);
  const modalSigCanvasRef = useRef<SignatureCanvas | null>(null);

  // Persist client form data to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(clientStorageKey, JSON.stringify({ name: clientName, email: clientEmail, phone: clientPhone, notes: clientNotes }));
    } catch { /* ignore */ }
  }, [clientName, clientEmail, clientPhone, clientNotes, clientStorageKey]);

  // ────────────────────────────────────────────
  // Load
  // ────────────────────────────────────────────

  useEffect(() => {
    const load = async () => {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionSlug ?? "");
      const query = supabase.from("sessions").select("*").eq("status", "active");
      const { data: sessionData } = await (isUuid
        ? query.eq("id", sessionSlug!)
        : query.eq("slug", sessionSlug!)
      ).single();

      if (!sessionData) {
        setLoading(false);
        return;
      }
      const s = sessionData as unknown as SessionDetail;
      setSession(s);

      const [{ data: photographerData }, { data: siteData }] = await Promise.all([
        supabase
          .from("photographers")
          .select("full_name, hero_image_url")
          .eq("id", s.photographer_id)
          .single(),
        supabase
          .from("photographer_site")
          .select("logo_url")
          .eq("photographer_id", s.photographer_id)
          .maybeSingle(),
      ]);
      if (photographerData) {
        setPhotographer({ ...photographerData, logo_url: siteData?.logo_url ?? null } as PhotographerInfo);
      }

      const { data: extrasData } = await supabase
        .from("session_extras")
        .select("id, description, price, quantity")
        .eq("session_id", s.id);
      setExtras((extrasData ?? []) as SessionExtra[]);

      // Portfolio images for the hero slider — stored directly on the session row
      const portfolioUrls: string[] = Array.isArray(s.portfolio_photos)
        ? (s.portfolio_photos as string[]).filter(Boolean)
        : [];
      const allSlides = [
        ...(s.cover_image_url ? [s.cover_image_url] : []),
        ...portfolioUrls,
      ];
      setPortfolioImages(allSlides);

      // Fetch ALL availability (weekly + campaign)
      const { data: availData } = await supabase
        .from("session_availability")
        .select("id, day_of_week, date, start_time, end_time, spots, location_override")
        .eq("session_id", s.id);

      type FullAvailRow = { id: string; day_of_week: number | null; date: string | null; start_time: string; end_time: string; spots?: number; location_override?: string | null };
      const allAvail = (availData ?? []) as FullAvailRow[];

      const weeklyRows = allAvail.filter((r) => r.day_of_week !== null);
      const campaignRows = allAvail.filter((r) => r.day_of_week === null && r.date !== null);

      const isSessionCampaign = campaignRows.length > 0;
      setIsCampaign(isSessionCampaign);

      if (isSessionCampaign) {
        // Campaign mode: load all campaign slots with their spots info
        const today = format(startOfToday(), "yyyy-MM-dd");
        const allAvailIds = campaignRows.map((r) => r.id);

        // Fetch booking counts grouped by availability_id + booked_date
        const { data: bookingsData } = await supabase
          .from("bookings")
          .select("availability_id, booked_date")
          .in("availability_id", allAvailIds)
          .eq("status", "confirmed");

        // Build booking count map: key = `${availId}_${date}` → count
        const bookingCountMap = new Map<string, number>();
        for (const b of bookingsData ?? []) {
          if (!b.booked_date) continue;
          const key = `${b.availability_id}_${b.booked_date}`;
          bookingCountMap.set(key, (bookingCountMap.get(key) ?? 0) + 1);
        }

        const campaignSlotsData: CampaignSlotDef[] = campaignRows
          .filter((r) => r.date! >= today) // only future dates
          .map((r) => {
            const spots = r.spots ?? 1;
            const bookedCount = bookingCountMap.get(`${r.id}_${r.date}`) ?? 0;
            return {
              id: r.id,
              date: r.date!,
              start_time: r.start_time.slice(0, 5),
              end_time: r.end_time.slice(0, 5),
              spots,
              location_override: r.location_override ?? null,
              _bookedCount: bookedCount,
            } as CampaignSlotDef & { _bookedCount: number };
          });

        setCampaignSlots(campaignSlotsData);

        // Also build GeneratedSlot list for campaign (so selectedSlot works uniformly)
        const generated: GeneratedSlot[] = campaignSlotsData.map((r) => {
          const rWithCount = r as CampaignSlotDef & { _bookedCount: number };
          const spotsLeft = r.spots - rWithCount._bookedCount;
          const full = spotsLeft <= 0;
          const dateObj = new Date(r.date + "T00:00:00");
          return {
            availabilityId: r.id,
            date: dateObj,
            start_time: r.start_time,
            end_time: r.end_time,
            label: format(dateObj, "EEEE, MMMM d"),
            disabled: full,
            disabledReason: full ? "full" : undefined,
            spotsLeft: full ? 0 : spotsLeft,
            totalSpots: r.spots,
          };
        });
        setGeneratedSlots(generated);
        setLoading(false);
        return;
      }

      const defs: WeeklySlotDef[] = weeklyRows.map((a) => ({
        id: a.id,
        day_of_week: a.day_of_week as number,
        start_time: a.start_time,
      }));

      const noticeDays = s.booking_notice_days ?? 1;
      const windowDays = s.booking_window_days ?? 60;
      const fromDate = format(addDays(startOfToday(), noticeDays), "yyyy-MM-dd");
      const toDate = format(addDays(startOfToday(), windowDays), "yyyy-MM-dd");

      const { data: bookingsData } = await supabase
        .from("bookings")
        .select("availability_id, booked_date")
        .in("availability_id", defs.map((d) => d.id))
        .gte("booked_date", fromDate)
        .lte("booked_date", toDate)
        .eq("status", "confirmed");

      const bookedKeys = new Set<string>(
        (bookingsData ?? [])
          .filter((b) => b.booked_date)
          .map((b) => `${b.availability_id}_${b.booked_date}`)
      );

      // Fetch blocked times for this photographer in the booking window
      const { data: blockedData } = await (supabase as any)
        .from("blocked_times")
        .select("date, start_time, end_time, all_day")
        .eq("photographer_id", s.photographer_id)
        .gte("date", fromDate)
        .lte("date", toDate);

      const blockedTimes: BlockedTime[] = (blockedData ?? []).map((b: any) => ({
        date: b.date,
        start_time: b.start_time,
        end_time: b.end_time,
        all_day: b.all_day,
      }));

      const occurrences = generateOccurrences(defs, bookedKeys, blockedTimes, s.duration_minutes, noticeDays, windowDays);

      // Apply virtual blocking: hide a % of non-disabled slots (shuffle by seeded-random on current date)
      const blockPct = Math.min(90, Math.max(0, s.virtual_block_percent ?? 0));
      let finalSlots = occurrences;
      if (blockPct > 0) {
        const availableIndices = occurrences.reduce<number[]>((acc, slot, i) => {
          if (!slot.disabled) acc.push(i);
          return acc;
        }, []);
        // Deterministic shuffle seeded by today's date so it's consistent within a session
        const seed = parseInt(format(startOfToday(), "yyyyMMdd"));
        const shuffled = [...availableIndices].sort((a, b) => {
          const ha = Math.sin(seed * (a + 1)) * 10000;
          const hb = Math.sin(seed * (b + 1)) * 10000;
          return (ha - Math.floor(ha)) - (hb - Math.floor(hb));
        });
        const countToHide = Math.round(availableIndices.length * blockPct / 100);
        const hiddenIndices = new Set(shuffled.slice(0, countToHide));
        finalSlots = occurrences.filter((_, i) => !hiddenIndices.has(i));
      }

      setGeneratedSlots(finalSlots);
      setLoading(false);
    };
    load();
  }, [sessionSlug]);

  // ────────────────────────────────────────────
  // Slider auto-play
  // ────────────────────────────────────────────
  // Slider with real drag/swipe movement (translateX)
  // ────────────────────────────────────────────

   const [dragOffset, setDragOffset] = useState(0);
   const dragStartX = useRef<number | null>(null);
   const isDragging = useRef(false);
   const sliderContainerRef = useRef<HTMLDivElement | null>(null);
   const isLoopJumping = useRef(false);

   const sliderNext = useCallback(() => {
     setSliderIndex((i) => i + 1);
   }, []);

   const sliderPrev = useCallback(() => {
     setSliderIndex((i) => i - 1);
   }, []);

  useEffect(() => {
    if (portfolioImages.length <= 1 || step !== "product") return;
    sliderTimerRef.current = setInterval(sliderNext, 5000);
    return () => { if (sliderTimerRef.current) clearInterval(sliderTimerRef.current); };
  }, [portfolioImages.length, sliderNext, step]);

  const handleDragStart = useCallback((clientX: number) => {
    dragStartX.current = clientX;
    isDragging.current = false;
    if (sliderTimerRef.current) clearInterval(sliderTimerRef.current);
  }, []);

  const handleDragMove = useCallback((clientX: number) => {
    if (dragStartX.current === null) return;
    const delta = clientX - dragStartX.current;
    if (Math.abs(delta) > 5) isDragging.current = true;
    setDragOffset(delta);
  }, []);

  const handleDragEnd = useCallback((clientX: number) => {
    if (dragStartX.current === null) return;
    const delta = clientX - dragStartX.current;
    dragStartX.current = null;
    setDragOffset(0);
    if (!isDragging.current || Math.abs(delta) < 40) {
      sliderTimerRef.current = setInterval(sliderNext, 5000);
      return;
    }
    if (delta < 0) sliderNext(); else sliderPrev();
    sliderTimerRef.current = setInterval(sliderNext, 5000);
  }, [sliderNext, sliderPrev]);



  // ────────────────────────────────────────────
  // Extras helpers
  // ────────────────────────────────────────────

  const toggleExtra = (extra: SessionExtra) => {
    setSelectedExtras((prev) => {
      const existing = prev.find((e) => e.id === extra.id);
      if (existing) return prev.filter((e) => e.id !== extra.id);
      return [...prev, { id: extra.id, description: extra.description, price: extra.price, qty: 1, maxQty: extra.quantity > 1 ? extra.quantity : 99 }];
    });
  };

  const changeExtraQty = (id: string, delta: number) => {
    setSelectedExtras((prev) =>
      prev.map((e) =>
        e.id === id
          ? { ...e, qty: Math.max(1, Math.min(e.maxQty, e.qty + delta)) }
          : e
      )
    );
  };

  // ────────────────────────────────────────────
  // Pricing
  // ────────────────────────────────────────────

  const extrasTotal = selectedExtras.reduce((sum, e) => sum + e.price * e.qty, 0);
  const sessionPrice = session?.price ?? 0;
  const subtotal = sessionPrice + extrasTotal;
  const taxAmount = session ? Math.round(subtotal * (session.tax_rate / 100)) : 0;
  const total = subtotal + taxAmount;

  // percent deposit: X% of total (subtotal + tax); fixed: stored value in cents
  const depositAmountCents = session
    ? (session.deposit_type === "percent" || session.deposit_type === "percentage")
      ? Math.round(total * (session.deposit_amount / 100))
      : session.deposit_amount
    : 0;

  const chargeAmount = session?.deposit_enabled ? depositAmountCents : total;

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

  // ────────────────────────────────────────────
  // Calendar helpers
  // ────────────────────────────────────────────

  // Dates that have at least one slot (enabled or disabled) — shown in calendar
  const allSlotDateKeys = new Set(
    generatedSlots.map((s) => format(s.date, "yyyy-MM-dd"))
  );
  // Dates that have at least one selectable slot
  const availableDateKeys = new Set(
    generatedSlots.filter((s) => !s.disabled).map((s) => format(s.date, "yyyy-MM-dd"))
  );

  const isDayDisabled = (date: Date) => {
    return !allSlotDateKeys.has(format(date, "yyyy-MM-dd"));
  };

  const slotsForSelectedDate = selectedDate
    ? generatedSlots.filter((s) => isSameDay(s.date, selectedDate))
    : [];

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedSlot(null);
  };

  // ────────────────────────────────────────────
  // Checkout
  // ────────────────────────────────────────────

  const handleCheckout = async () => {
    if (!session || !selectedSlot || !clientName.trim() || !clientEmail.trim()) return;
    setSubmitting(true);

    const bookedDate = format(selectedSlot.date, "yyyy-MM-dd");

    try {
      const { data: checkoutData, error: fnError } = await supabase.functions.invoke(
        "create-session-checkout",
        {
          body: {
            sessionId: session.id,
            slotId: selectedSlot.availabilityId,
            bookedDate,
            startTime: selectedSlot.start_time,
            clientEmail: clientEmail.trim(),
            clientName: clientName.trim(),
            selectedExtras: selectedExtras.map((e) => ({
              id: e.id,
              description: e.description,
              price: e.price,
              qty: e.qty,
            })),
          },
        }
      );

      if (fnError || !checkoutData?.url) {
        throw new Error(fnError?.message || "No payment URL returned");
      }
      try { localStorage.removeItem(clientStorageKey); } catch { /* ignore */ }
      window.location.href = checkoutData.url;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast({ title: "Payment error", description: message, variant: "destructive" });
      setSubmitting(false);
    }
  };

  // ────────────────────────────────────────────
  // Loading / not found
  // ────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-sm font-light text-muted-foreground">Session not found.</p>
        <Button variant="ghost" onClick={() => navigate(backPath)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to the store
        </Button>
      </div>
    );
  }

  const heroImage = session.cover_image_url || photographer?.hero_image_url || null;
  const initials = getInitials(photographer?.full_name);
  // Slider images: portfolio images already includes cover; fall back to heroImage if empty
  const slides = portfolioImages.length > 0 ? portfolioImages : (heroImage ? [heroImage] : []);

  // ────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[hsl(var(--muted))]" style={{ backgroundColor: "#f5f2ee" }}>

      {/* ══════════════ PRODUCT PAGE (step: product) ══════════════ */}
      {step === "product" && (
        <>
          {/* ── Hero slider: full-width crossfade ── */}
          {(() => {
            // Build frames: Cover → Grid Masonry → Portfolio 1…N → (loop)
            const coverImg = session.cover_image_url || heroImage;
            const portfolioOnly = portfolioImages.filter(p => p !== coverImg);
            const allImages = coverImg ? [coverImg, ...portfolioOnly] : portfolioOnly;

            const frames: Array<{ type: "single"; src: string } | { type: "grid"; photos: string[] }> = [];

            if (allImages.length === 0) {
              // nothing
            } else if (allImages.length < 3) {
              // Not enough for masonry, just show singles
              for (const src of allImages) frames.push({ type: "single", src });
            } else {
              // Cover
              if (coverImg) frames.push({ type: "single", src: coverImg });
              // Grid masonry with all images
              const masonryPool = [...allImages, ...allImages];
              frames.push({ type: "grid", photos: masonryPool.slice(0, 9) });
              // Portfolio images (excluding cover)
              for (const src of portfolioOnly) {
                frames.push({ type: "single", src });
              }
            }

            const totalFrames = frames.length || 1;

            // For infinite loop: clone last frame at start and first frame at end
            const loopFrames = totalFrames > 1
              ? [frames[frames.length - 1], ...frames, frames[0]]
              : frames;
            const loopCount = loopFrames.length;

            // sliderIndex 0 = first real frame → offset 1 in loopFrames
            const displayIdx = totalFrames > 1 ? sliderIndex + 1 : 0;

            // Handle loop jump after transition ends
            const handleTransitionEnd = () => {
              if (totalFrames <= 1) return;
              if (sliderIndex >= totalFrames) {
                // Past last → jump to first without animation
                isLoopJumping.current = true;
                setSliderIndex(0);
                requestAnimationFrame(() => {
                  requestAnimationFrame(() => { isLoopJumping.current = false; });
                });
              } else if (sliderIndex < 0) {
                // Before first → jump to last without animation
                isLoopJumping.current = true;
                setSliderIndex(totalFrames - 1);
                requestAnimationFrame(() => {
                  requestAnimationFrame(() => { isLoopJumping.current = false; });
                });
              }
            };

            return (
              <div
                ref={sliderContainerRef}
                className="relative w-full overflow-hidden bg-black select-none"
                style={{ height: "70vh", minHeight: 420, cursor: isDragging.current ? "grabbing" : "grab" }}
                onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
                onTouchMove={(e) => { e.preventDefault(); handleDragMove(e.touches[0].clientX); }}
                onTouchEnd={(e) => handleDragEnd(e.changedTouches[0].clientX)}
                onMouseDown={(e) => handleDragStart(e.clientX)}
                onMouseMove={(e) => { if (dragStartX.current !== null) handleDragMove(e.clientX); }}
                onMouseUp={(e) => handleDragEnd(e.clientX)}
                onMouseLeave={(e) => handleDragEnd(e.clientX)}
              >
                {/* Swipe slider — slides side by side with translateX + clone edges for infinite loop */}
                <div
                  className="flex h-full"
                  onTransitionEnd={handleTransitionEnd}
                  style={{
                    width: `${loopCount * 100}%`,
                    transform: `translateX(calc(${-displayIdx * (100 / loopCount)}% + ${dragOffset}px))`,
                    transition: isLoopJumping.current || dragStartX.current !== null ? "none" : "transform 0.5s ease-in-out",
                  }}
                >
                  {loopFrames.map((frame, i) => {
                    const getSidePhotos = (src: string) => {
                      const pool = slides.filter(s => s !== src);
                      if (pool.length === 0) return slides;
                      return [...pool, ...pool, ...pool];
                    };

                    return (
                      <div
                        key={i}
                        className="relative h-full shrink-0"
                        style={{ width: `${100 / loopCount}%` }}
                      >
                        {frame.type === "single" ? (
                          <>
                            {frame.src && (
                              <SingleSlideWithMasonry
                                src={frame.src}
                                alt={session.title}
                                sidePhotos={getSidePhotos(frame.src)}
                              />
                            )}
                            <div className="absolute inset-0 z-[2] bg-gradient-to-b from-black/25 via-transparent to-black/75 pointer-events-none" />
                          </>
                        ) : (
                          <>
                            <div className="flex h-full gap-0">
                              <div className="flex flex-col gap-0 flex-1">
                                <div className="overflow-hidden" style={{ flex: "0 0 60%" }}>
                                  <img src={frame.photos[0] ?? slides[0]} alt="" className="w-full h-full object-cover" draggable={false} />
                                </div>
                                <div className="overflow-hidden flex-1">
                                  <img src={frame.photos[3] ?? slides[0]} alt="" className="w-full h-full object-cover" draggable={false} />
                                </div>
                              </div>
                              <div className="flex flex-col gap-0 flex-1">
                                <div className="overflow-hidden" style={{ flex: "0 0 40%" }}>
                                  <img src={frame.photos[1] ?? slides[0]} alt="" className="w-full h-full object-cover" draggable={false} />
                                </div>
                                <div className="overflow-hidden flex-1">
                                  <img src={frame.photos[4] ?? slides[0]} alt="" className="w-full h-full object-cover" draggable={false} />
                                </div>
                              </div>
                              <div className="flex flex-col gap-0 flex-1">
                                <div className="overflow-hidden" style={{ flex: "0 0 50%" }}>
                                  <img src={frame.photos[2] ?? slides[0]} alt="" className="w-full h-full object-cover" draggable={false} />
                                </div>
                                <div className="overflow-hidden flex-1">
                                  <img src={frame.photos[5] ?? slides[0]} alt="" className="w-full h-full object-cover" draggable={false} />
                                </div>
                              </div>
                              <div className="flex flex-col gap-0 flex-1">
                                <div className="overflow-hidden flex-1">
                                  <img src={frame.photos[6] ?? slides[0]} alt="" className="w-full h-full object-cover" draggable={false} />
                                </div>
                                <div className="overflow-hidden flex-1">
                                  <img src={frame.photos[7] ?? slides[0]} alt="" className="w-full h-full object-cover" draggable={false} />
                                </div>
                                <div className="overflow-hidden flex-1">
                                  <img src={frame.photos[8] ?? slides[0]} alt="" className="w-full h-full object-cover" draggable={false} />
                                </div>
                              </div>
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/70 pointer-events-none" />
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Overlay text — always on top */}
                <div className="absolute bottom-0 left-0 right-0 px-6 pb-10 text-center z-10 pointer-events-none">
                  <div className="flex justify-center mb-4">
                    <div className="h-16 w-16 rounded-full border border-white/50 bg-black/20 backdrop-blur-sm flex items-center justify-center overflow-hidden">
                      {photographer?.logo_url ? (
                        <img src={photographer.logo_url} alt="" className="h-10 w-10 object-contain" style={{ filter: "brightness(0) invert(1)" }} />
                      ) : (
                        <span className="text-white text-base font-light tracking-widest">{initials}</span>
                      )}
                    </div>
                  </div>
                  {photographer?.full_name && (
                    <p className="text-white/50 text-[9px] tracking-[0.45em] uppercase mb-2">{photographer.full_name}</p>
                  )}
                  <h1 className="text-white text-3xl md:text-5xl font-extralight tracking-[0.08em] mb-3" style={{ lineHeight: 1.1 }}>{session.title}</h1>
                  {session.tagline && (
                    <p className="text-white/70 text-base md:text-lg font-light max-w-xl mx-auto italic">{session.tagline}</p>
                  )}
                </div>

                {/* Back button */}
                <button
                  onClick={() => navigate(backPath)}
                  className="absolute top-5 left-5 text-white/70 hover:text-white transition-colors z-20"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              </div>
            );
          })()}


          {/* Product details */}
          <div className="max-w-4xl mx-auto px-6 py-14">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {/* Main content */}
              <div className="md:col-span-2 flex flex-col gap-8">
                {session.description && (
                  <div>
                    <div className="w-6 h-px bg-foreground/30 mb-5" />
                    <p className="text-base font-light text-muted-foreground leading-relaxed whitespace-pre-line">{session.description}</p>
                  </div>
                )}
                {/* What's included */}
                <div>
                  <p className="text-[10px] tracking-[0.4em] uppercase text-muted-foreground mb-4">What's included</p>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm font-light">{session.duration_minutes} minutes session</span>
                    </div>
                    {session.num_photos > 0 && (
                      <div className="flex items-center gap-3">
                        <Camera className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm font-light">{session.num_photos} edited photos delivered</span>
                      </div>
                    )}
                    {session.location && (
                      <div className="flex items-center gap-3">
                        <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm font-light">{session.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Sticky booking card */}
              <div className="md:sticky md:top-8 self-start">
                <div className="bg-background shadow-sm border border-border p-6 flex flex-col gap-5">
                  <div className="flex flex-col gap-1">
                    <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">Starting at</p>
                    <p className="text-3xl font-light">{formatCurrency(session.price)}</p>
                    {session.deposit_enabled && (
                      <p className="text-[11px] text-muted-foreground">Deposit from {formatCurrency(
                        session.deposit_type === "percent" || session.deposit_type === "percentage"
                          ? Math.round(session.price * (session.deposit_amount / 100))
                          : session.deposit_amount
                      )}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 text-[11px] text-muted-foreground border-t border-border pt-4">
                    <span className="flex items-center gap-2"><Clock className="h-3 w-3" />{session.duration_minutes} min</span>
                    {session.num_photos > 0 && <span className="flex items-center gap-2"><Camera className="h-3 w-3" />{session.num_photos} photos</span>}
                    {session.location && <span className="flex items-center gap-2"><MapPin className="h-3 w-3" />{session.location}</span>}
                  </div>
                  <button
                    onClick={() => setStep("slots")}
                    className="w-full py-3 bg-foreground text-background text-[10px] tracking-[0.3em] uppercase hover:bg-foreground/90 transition-colors flex items-center justify-center gap-2"
                  >
                    Book this session <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <footer className="py-8 text-center border-t border-border/30">
            <p className="text-[9px] tracking-widest uppercase text-muted-foreground/40">Powered by Davions</p>
          </footer>
        </>
      )}

      {/* ══════════════ BOOKING FLOW ══════════════ */}
      {step !== "product" && (
        <>
      {/* Hero */}
      <div className="relative w-full h-[42vh] min-h-[280px] overflow-hidden">
        {heroImage ? (
          <img src={heroImage} alt={session.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-foreground" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/50" />

        <button
          onClick={() => step === "slots" ? setStep("product") : undefined}
          className="absolute top-5 left-5 text-white/70 hover:text-white transition-colors z-10"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 text-center">
          <div className="h-16 w-16 rounded-full border border-white/50 bg-black/20 backdrop-blur-sm flex items-center justify-center overflow-hidden">
            {photographer?.logo_url ? (
              <img src={photographer.logo_url} alt="" className="h-10 w-10 object-contain" style={{ filter: "brightness(0) invert(1)" }} />
            ) : (
              <span className="text-white text-base font-light tracking-widest">{initials}</span>
            )}
          </div>
          <div className="flex flex-col items-center gap-1">
            {photographer?.full_name && (
              <p className="text-white/60 text-[10px] tracking-[0.35em] uppercase">
                {photographer.full_name}
              </p>
            )}
            <h1 className="text-white text-xl font-light tracking-wide">
              {step === "slots" && "Please select a date and time"}
              {step === "form" && "Enter your details"}
              {step === "addons" && "Customize your session"}
              {step === "review" && "Review & confirm"}
            </h1>
          </div>
        </div>
      </div>

      {/* ══════════════ CONTENT ══════════════ */}
      {step !== "review" ? (
        <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-5">

          {/* ── Session Info Card ── */}
          <div className="bg-background rounded-sm shadow-sm p-6 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <h2 className="text-lg font-light tracking-wide text-foreground">{session.title}</h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  {session.duration_minutes} min
                </span>
                <span className="text-muted-foreground/40">·</span>
                <span className="text-foreground font-light text-sm">{formatCurrency(session.price)}</span>
                {session.num_photos > 0 && (
                  <>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="flex items-center gap-1.5">
                      <Camera className="h-3.5 w-3.5 shrink-0" />
                      {session.num_photos} photos
                    </span>
                  </>
                )}
                {session.location && (
                  <>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      {session.location}
                    </span>
                  </>
                )}
              </div>
            </div>
            {session.description && (
              <p className="text-sm font-light text-muted-foreground leading-relaxed">
                {session.description}
              </p>
            )}
          </div>

          {/* ── Step 1: slots ── */}
          {step === "slots" && (
            <>
              {/* ══ CAMPAIGN LAYOUT: vertical date list ══ */}
              {isCampaign ? (() => {
                // Group campaign slots by date
                const dateGroups = new Map<string, (typeof campaignSlots[0])[]>();
                for (const slot of campaignSlots) {
                  if (!dateGroups.has(slot.date)) dateGroups.set(slot.date, []);
                  dateGroups.get(slot.date)!.push(slot);
                }
                const sortedDates = [...dateGroups.keys()].sort();

                return (
                  <div className="flex flex-col gap-3">
                    {sortedDates.length === 0 ? (
                      <div className="bg-background rounded-sm shadow-sm p-8 text-center">
                        <p className="text-sm font-light text-muted-foreground">No available dates for this campaign.</p>
                      </div>
                    ) : sortedDates.map((dateKey) => {
                      const slots = dateGroups.get(dateKey)!;
                      const dateObj = new Date(dateKey + "T00:00:00");
                      const locationOverride = slots[0]?.location_override;
                      const allSlotsGenerated = generatedSlots.filter((g) => format(g.date, "yyyy-MM-dd") === dateKey);

                      return (
                        <div key={dateKey} className="bg-background rounded-sm shadow-sm overflow-hidden">
                          {/* Date header */}
                          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                            <div className="flex flex-col gap-0.5">
                              <p className="text-sm font-light tracking-wide">{format(dateObj, "EEEE, MMMM d")}</p>
                              {locationOverride && (
                                <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground flex items-center gap-1">
                                  <MapPin className="h-2.5 w-2.5" />
                                  {locationOverride}
                                </p>
                              )}
                            </div>
                          </div>
                          {/* Time slots */}
                          <div className="p-4 flex flex-wrap gap-2">
                            {allSlotsGenerated.map((slot) => {
                              const isSelected = selectedSlot?.availabilityId === slot.availabilityId;
                              const full = slot.disabled && slot.disabledReason === "full";
                              const spotsLeft = slot.spotsLeft ?? 0;
                              const totalSpots = slot.totalSpots ?? 1;

                              return (
                                <button
                                  key={slot.availabilityId}
                                  disabled={slot.disabled}
                                  onClick={() => !slot.disabled && setSelectedSlot(slot)}
                                  className={cn(
                                    "flex flex-col items-start px-3 py-2 border text-xs transition-colors min-w-[100px]",
                                    slot.disabled
                                      ? "border-border/30 text-muted-foreground/40 cursor-not-allowed bg-muted/20"
                                      : isSelected
                                      ? "border-foreground bg-foreground text-background"
                                      : "border-border hover:border-foreground/50 text-foreground"
                                  )}
                                >
                                  <span className={cn("font-light tracking-wide", slot.disabled && "line-through")}>
                                    {formatTime12(slot.start_time)}
                                  </span>
                                  {full ? (
                                    <span className="text-[9px] tracking-widest uppercase text-muted-foreground/50 mt-0.5">Esgotado</span>
                                  ) : totalSpots > 1 ? (
                                    <span className={cn(
                                      "text-[9px] mt-0.5",
                                      isSelected ? "text-background/70" : "text-muted-foreground",
                                      spotsLeft <= 2 && !isSelected && "text-amber-600"
                                    )}>
                                      {spotsLeft} vaga{spotsLeft !== 1 ? "s" : ""}
                                    </span>
                                  ) : null}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })() : (
                /* ══ STANDARD LAYOUT: calendar ══ */
                <div className="bg-background rounded-sm shadow-sm overflow-hidden">
                  {generatedSlots.length === 0 ? (
                    <div className="p-8 text-center">
                      <p className="text-sm font-light text-muted-foreground">No available slots at this time.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-border">
                      <div className="sm:flex-1 p-4">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={handleDateSelect}
                          disabled={isDayDisabled}
                          fromDate={addDays(startOfToday(), session.booking_notice_days ?? 1)}
                          toDate={addDays(startOfToday(), session.booking_window_days ?? 60)}
                          className="pointer-events-auto w-full"
                          classNames={{
                            months: "w-full",
                            month: "w-full space-y-3",
                            caption: "flex justify-center pt-1 relative items-center mb-2",
                            caption_label: "text-xs font-light tracking-[0.25em] uppercase text-foreground",
                            nav: "space-x-1 flex items-center",
                            nav_button: "h-7 w-7 bg-transparent p-0 opacity-40 hover:opacity-100 border border-border flex items-center justify-center transition-opacity",
                            nav_button_previous: "absolute left-1",
                            nav_button_next: "absolute right-1",
                            table: "w-full border-collapse",
                            head_row: "flex w-full",
                            head_cell: "text-muted-foreground/60 flex-1 font-normal text-[0.7rem] text-center pb-1",
                            row: "flex w-full mt-1",
                            cell: "flex-1 h-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
                            day: cn(
                              "h-9 w-full p-0 font-normal aria-selected:opacity-100 transition-colors text-xs",
                              "hover:bg-accent hover:text-accent-foreground rounded-none"
                            ),
                            day_selected: "bg-foreground text-background hover:bg-foreground hover:text-background focus:bg-foreground focus:text-background rounded-none font-normal",
                            day_today: "bg-accent/60 text-accent-foreground rounded-none",
                            day_disabled: "text-muted-foreground/25 pointer-events-none",
                            day_outside: "text-muted-foreground/25 opacity-40",
                          }}
                          components={{
                            DayContent: ({ date }) => {
                              const key = format(date, "yyyy-MM-dd");
                              const hasAvailable = availableDateKeys.has(key);
                              const hasAny = allSlotDateKeys.has(key);
                              return (
                                <div className="flex flex-col items-center justify-center h-full gap-[2px]">
                                  <span>{date.getDate()}</span>
                                  {hasAny && (
                                    <span className={cn(
                                      "h-[3px] w-[3px] rounded-full",
                                      hasAvailable ? "bg-current opacity-60" : "bg-muted-foreground/30"
                                    )} />
                                  )}
                                </div>
                              );
                            },
                          }}
                        />
                      </div>
                      <div className="sm:w-48 p-4 flex flex-col gap-3">
                        {!selectedDate ? (
                          <div className="flex-1 flex items-center justify-center py-8 sm:py-0">
                            <p className="text-xs text-muted-foreground/60 text-center">
                              Select a date<br />to see times
                            </p>
                          </div>
                        ) : (
                          <>
                            <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground font-light">
                              {format(selectedDate, "EEE, MMM d")}
                            </p>
                            {slotsForSelectedDate.length === 0 ? (
                              <p className="text-xs text-muted-foreground">No slots for this day.</p>
                            ) : (
                              <div className="flex flex-col gap-2">
                                {slotsForSelectedDate.map((slot, i) => (
                                  <button
                                    key={i}
                                    disabled={slot.disabled}
                                    onClick={() => !slot.disabled && setSelectedSlot(slot)}
                                    title={
                                      slot.disabledReason === "booked"
                                        ? "Already booked"
                                        : slot.disabledReason === "blocked"
                                        ? "Unavailable"
                                        : undefined
                                    }
                                    className={cn(
                                      "w-full px-3 py-2 text-xs border transition-colors tracking-wider text-left relative",
                                      slot.disabled
                                        ? "border-border/40 text-muted-foreground/40 cursor-not-allowed bg-muted/30 line-through"
                                        : selectedSlot &&
                                          selectedSlot.availabilityId === slot.availabilityId &&
                                          isSameDay(selectedSlot.date, slot.date)
                                        ? "border-foreground bg-foreground text-background"
                                        : "border-border hover:border-foreground/40 text-foreground"
                                    )}
                                  >
                                    <span>{formatTime12(slot.start_time)}</span>
                                    {slot.disabled && (
                                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] tracking-widest uppercase text-muted-foreground/40 font-light">
                                        {slot.disabledReason === "booked" ? "booked" : "unavail."}
                                      </span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <Button
                onClick={() => setStep("form")}
                disabled={!selectedSlot || selectedSlot.disabled}
                className="w-full text-xs tracking-wider uppercase font-light rounded-none h-11"
              >
                Continue →
              </Button>
            </>
          )}

          {/* ── Step 2: Form ── */}
          {step === "form" && selectedSlot && (
            <div className="bg-background rounded-sm shadow-sm p-6 flex flex-col gap-5">
              <div className="border border-border p-4 flex flex-col gap-1">
                <p className="text-[10px] tracking-widest uppercase text-muted-foreground mb-2">Selected slot</p>
                <p className="text-sm font-light capitalize">{selectedSlot.label}</p>
                <p className="text-xs text-muted-foreground">{formatTime12(selectedSlot.start_time)} – {formatTime12(selectedSlot.end_time)}</p>
              </div>
              <div className="flex flex-col gap-4">
                <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">Your details</p>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="clientName" className="text-xs tracking-wider uppercase font-light">Full Name *</Label>
                  <Input id="clientName" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Your name" className="rounded-none" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="clientEmail" className="text-xs tracking-wider uppercase font-light">Email *</Label>
                  <div className="relative">
                    <Input
                      id="clientEmail"
                      type="email"
                      value={clientEmail}
                      onChange={(e) => {
                        // allow only valid email characters while typing
                        const val = e.target.value.replace(/\s/g, "");
                        setClientEmail(val);
                      }}
                      placeholder="you@email.com"
                      className={cn(
                        "rounded-none pr-8",
                        clientEmail.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)
                          ? "border-destructive focus-visible:ring-destructive"
                          : clientEmail.length > 0
                          ? "border-foreground"
                          : ""
                      )}
                    />
                    {clientEmail.length > 0 && (
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] pointer-events-none">
                        {/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail) ? (
                          <Check className="h-3.5 w-3.5 text-foreground" />
                        ) : (
                          <span className="text-destructive font-light">✕</span>
                        )}
                      </span>
                    )}
                  </div>
                  {clientEmail.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail) && (
                    <p className="text-[10px] text-destructive font-light">Enter a valid email address</p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="clientPhone" className="text-xs tracking-wider uppercase font-light">Phone</Label>
                  <Input
                    id="clientPhone"
                    type="tel"
                    value={clientPhone}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                      let masked = digits;
                      if (digits.length >= 7) {
                        masked = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
                      } else if (digits.length >= 4) {
                        masked = `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
                      } else if (digits.length > 0) {
                        masked = `(${digits}`;
                      }
                      setClientPhone(masked);
                    }}
                    placeholder="(555) 555-0100"
                    className="rounded-none"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="clientNotes" className="text-xs tracking-wider uppercase font-light">Notes</Label>
                  <Textarea id="clientNotes" value={clientNotes} onChange={(e) => setClientNotes(e.target.value)} placeholder="Any requests or observations..." rows={3} className="rounded-none resize-none text-sm font-light" />
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep("slots")} className="text-xs tracking-wider uppercase font-light rounded-none">Back</Button>
                <Button
                  onClick={() => setStep(extras.length > 0 ? "addons" : "review")}
                  disabled={!clientName.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)}
                  className="flex-1 text-xs tracking-wider uppercase font-light rounded-none h-11"
                >
                  Continue →
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 3: Add-ons (only when extras exist) ── */}
          {step === "addons" && selectedSlot && extras.length > 0 && (
            <div className="flex flex-col gap-5">
              {/* Highlight banner */}
              <div className="bg-accent/30 border border-accent rounded-sm p-5 text-center flex flex-col gap-2">
                <p className="text-base font-light tracking-wide text-foreground">Enhance your session</p>
                <p className="text-xs text-muted-foreground font-light">Choose optional add-ons to customize your experience</p>
              </div>

              {/* Addons grid */}
              <div className="flex flex-col gap-3">
                {extras.map((extra) => {
                  const sel = selectedExtras.find((e) => e.id === extra.id);
                  return (
                    <div
                      key={extra.id}
                      className={cn(
                        "bg-background rounded-sm shadow-sm border-2 p-5 flex items-center justify-between transition-all cursor-pointer",
                        sel
                          ? "border-foreground ring-1 ring-foreground/10"
                          : "border-border hover:border-foreground/40 hover:shadow-md"
                      )}
                      onClick={() => toggleExtra(extra)}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "h-5 w-5 border-2 flex items-center justify-center shrink-0 transition-colors rounded-[2px]",
                          sel ? "border-foreground bg-foreground" : "border-muted-foreground/40"
                        )}>
                          {sel && <Check className="h-3 w-3 text-background" />}
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <p className="text-sm font-light tracking-wide">{extra.description}</p>
                          <p className="text-xs text-muted-foreground">{formatCurrency(extra.price)} each</p>
                        </div>
                      </div>
                      {sel && (
                        <div className="flex items-center gap-2.5" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => changeExtraQty(extra.id, -1)} className="h-7 w-7 border border-border flex items-center justify-center hover:border-foreground transition-colors rounded-[2px]">
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="text-sm font-light w-5 text-center">{sel.qty}</span>
                          <button onClick={() => changeExtraQty(extra.id, +1)} disabled={sel.qty >= sel.maxQty} className="h-7 w-7 border border-border flex items-center justify-center hover:border-foreground transition-colors disabled:opacity-40 rounded-[2px]">
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Extras subtotal (if any selected) */}
              {selectedExtras.length > 0 && (
                <div className="bg-background rounded-sm shadow-sm p-4 flex justify-between items-center border border-border">
                  <p className="text-xs text-muted-foreground font-light">Add-ons subtotal</p>
                  <p className="text-sm font-light">{formatCurrency(selectedExtras.reduce((s, e) => s + e.price * e.qty, 0))}</p>
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep("form")} className="text-xs tracking-wider uppercase font-light rounded-none">Back</Button>
                <Button
                  onClick={() => setStep("review")}
                  className="flex-1 text-xs tracking-wider uppercase font-light rounded-none h-11"
                >
                  Review & confirm →
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ══════════════ STEP 4: REVIEW ══════════════ */
        selectedSlot && (
          <div className="max-w-5xl mx-auto px-4 py-8">
            <div className="flex flex-col lg:flex-row gap-6 items-start">

              {/* ── LEFT: confirmation + contract ── */}
              <div className="flex-1 min-w-0 flex flex-col gap-5">

                {/* Booking summary grid */}
                <div className="bg-background rounded-sm shadow-sm p-5 flex flex-col gap-3">
                  <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">Booking summary</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="border border-border p-3 flex flex-col gap-0.5">
                      <p className="text-[10px] tracking-widest uppercase text-muted-foreground">Date & time</p>
                      <p className="text-sm font-light capitalize mt-1">{selectedSlot.label}</p>
                      <p className="text-xs text-muted-foreground">{selectedSlot.start_time} – {selectedSlot.end_time}</p>
                    </div>
                    <div className="border border-border p-3 flex flex-col gap-0.5">
                      <p className="text-[10px] tracking-widest uppercase text-muted-foreground">Client</p>
                      <p className="text-sm font-light mt-1">{clientName}</p>
                      <p className="text-xs text-muted-foreground">{clientEmail}</p>
                      {clientPhone && <p className="text-xs text-muted-foreground">{clientPhone}</p>}
                    </div>
                  </div>
                  {clientNotes && (
                    <p className="text-xs text-muted-foreground italic border-l-2 border-border pl-3">
                      "{clientNotes}"
                    </p>
                  )}
                </div>

                {/* Contract or "all set" */}
                {session.contract_text ? (
                  <div className="bg-background rounded-sm shadow-sm p-5 flex flex-col gap-4">
                    <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">Service agreement</p>
                    <div
                      className="max-h-[55vh] overflow-y-auto text-xs font-light text-foreground leading-relaxed border border-border p-4 prose prose-xs max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_h1]:text-sm [&_h2]:text-xs [&_h3]:text-xs [&_strong]:font-medium [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground"
                      dangerouslySetInnerHTML={{
                        __html: resolveSessionContractVariables(session.contract_text, {
                          client_name: clientName,
                          client_email: clientEmail,
                          session_title: session.title,
                          session_date: selectedSlot?.label ?? "",
                          session_time: selectedSlot ? formatTime12(selectedSlot.start_time) : "",
                          session_duration: `${session.duration_minutes} min`,
                          session_price: formatCurrency(session.price),
                        })
                      }}
                    />

                    {/* Signatures section */}
                    <div className="flex flex-col gap-3">
                      <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">Signatures</p>
                      <div
                        className={cn(
                          "border p-4 flex flex-col gap-2 cursor-pointer transition-colors group",
                          contractAgreed ? "border-foreground" : "border-border hover:border-foreground/40"
                        )}
                        onClick={() => !contractAgreed && setSigModalOpen(true)}
                      >
                        {contractAgreed && signatureData ? (
                          <>
                            {signatureData.startsWith("data:image") ? (
                              <img src={signatureData} alt="Signature" className="h-12 object-contain object-left" />
                            ) : (
                              <p style={{ fontFamily: "'Dancing Script', cursive", fontSize: 28, lineHeight: 1.2 }} className="text-foreground">
                                {signatureData}
                              </p>
                            )}
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] text-muted-foreground">{clientName}</p>
                              <button
                                type="button"
                                className="text-[10px] text-muted-foreground hover:text-foreground transition-colors tracking-wider uppercase"
                                onClick={(e) => { e.stopPropagation(); setSignatureData(null); setContractAgreed(false); }}
                              >
                                Change
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center gap-3">
                            <PenLine className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                            <p className="text-xs font-light text-muted-foreground group-hover:text-foreground transition-colors">
                              Click here to sign
                            </p>
                          </div>
                        )}
                      </div>
                      {!contractAgreed && (
                        <p className="text-[10px] text-muted-foreground font-light">
                          Your signature is required to proceed with the booking.
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-background rounded-sm shadow-sm p-5 flex flex-col gap-4">
                    <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">Your information</p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                      <div>
                        <p className="text-muted-foreground font-light">Full Name</p>
                        <p className="text-foreground font-light mt-0.5">{clientName}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-light">Email</p>
                        <p className="text-foreground font-light mt-0.5">{clientEmail}</p>
                      </div>
                      {clientPhone && (
                        <div>
                          <p className="text-muted-foreground font-light">Phone</p>
                          <p className="text-foreground font-light mt-0.5">{clientPhone}</p>
                        </div>
                      )}
                      {clientNotes && (
                        <div className={clientPhone ? "col-span-2" : "col-span-2"}>
                          <p className="text-muted-foreground font-light">Notes</p>
                          <p className="text-foreground font-light mt-0.5 italic">"{clientNotes}"</p>
                        </div>
                      )}
                    </div>
                    <div
                      className="flex items-start gap-3 cursor-pointer select-none pt-2 border-t border-border"
                      onClick={() => setContractAgreed(!contractAgreed)}
                    >
                      <div className={cn(
                        "mt-0.5 h-4 w-4 border shrink-0 flex items-center justify-center transition-colors",
                        contractAgreed ? "border-foreground bg-foreground" : "border-border"
                      )}>
                        {contractAgreed && <Check className="h-2.5 w-2.5 text-background" />}
                      </div>
                      <p className="text-xs font-light text-foreground leading-relaxed">
                        I confirm the above information is correct and agree to proceed with this booking.
                      </p>
                    </div>
                  </div>
                )}

                {/* ── Signature Modal ── */}
                {sigModalOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                      className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                      onClick={() => setSigModalOpen(false)}
                    />
                    <div className="relative bg-background w-full max-w-xl shadow-xl flex flex-col">
                      {/* Header */}
                      <div className="px-7 pt-7 pb-4 border-b border-border">
                        <p className="text-xs tracking-[0.35em] uppercase font-medium text-foreground">Signature</p>
                      </div>

                      {/* Tabs */}
                      <div className="px-7 pt-4 flex gap-0 border-b border-border">
                        {(["draw", "type"] as const).map((tab) => (
                          <button
                            key={tab}
                            type="button"
                            onClick={() => { setSigTab(tab); modalSigCanvasRef.current?.clear(); const typed = tab === "type" ? clientName : ""; setSigTyped(typed); setSigPendingData(typed || null); }}
                            className={cn(
                              "px-1 pb-3 mr-5 text-xs tracking-wider capitalize transition-colors border-b-2 -mb-px",
                              sigTab === tab
                                ? "border-foreground text-foreground"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                            )}
                          >
                            {tab}
                          </button>
                        ))}
                      </div>

                      {/* Content */}
                      <div className="px-7 py-5 flex flex-col gap-4">
                        {sigTab === "draw" ? (
                          <div className="flex flex-col gap-2">
                            <div className="relative border border-border bg-muted/20">
                              <SignatureCanvas
                                ref={modalSigCanvasRef}
                                penColor="#000000"
                                canvasProps={{
                                  width: 520,
                                  height: 160,
                                  className: "w-full h-[160px] touch-none",
                                  style: { display: "block" },
                                }}
                                onEnd={() => {
                                  if (modalSigCanvasRef.current && !modalSigCanvasRef.current.isEmpty()) {
                                    setSigPendingData(modalSigCanvasRef.current.toDataURL());
                                  }
                                }}
                              />
                              {!sigPendingData && (
                                <p className="absolute inset-0 flex items-end justify-center pb-4 text-[11px] text-muted-foreground/40 pointer-events-none font-light italic">
                                  Sign in the space above
                                </p>
                              )}
                              {/* baseline */}
                              <div className="absolute bottom-10 left-4 right-4 border-b border-dashed border-border/60 pointer-events-none" />
                              <button
                                type="button"
                                onClick={() => { modalSigCanvasRef.current?.clear(); setSigPendingData(null); }}
                                className="absolute top-2 right-3 text-[10px] text-muted-foreground hover:text-foreground transition-colors tracking-wider uppercase"
                              >
                                Clear
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-3">
                            <Input
                              autoFocus
                              placeholder="Type your full name"
                              value={sigTyped}
                              onChange={(e) => { setSigTyped(e.target.value); setSigPendingData(e.target.value || null); }}
                              className="rounded-none text-sm font-light"
                              style={{ fontFamily: "'Dancing Script', cursive", fontSize: 22 }}
                            />
                            {sigTyped && (
                              <div className="border border-border/50 p-4 bg-muted/10 flex items-center justify-center min-h-[80px]">
                                <p style={{ fontFamily: "'Dancing Script', cursive", fontSize: 32, lineHeight: 1.2 }} className="text-foreground">
                                  {sigTyped}
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Legal checkbox */}
                        <div
                          className="flex items-start gap-3 cursor-pointer select-none"
                          onClick={() => setSigLegalChecked(!sigLegalChecked)}
                        >
                          <div className={cn(
                            "mt-0.5 h-4 w-4 border shrink-0 flex items-center justify-center transition-colors",
                            sigLegalChecked ? "border-foreground bg-foreground" : "border-border"
                          )}>
                            {sigLegalChecked && <Check className="h-2.5 w-2.5 text-background" />}
                          </div>
                          <p className="text-xs font-light text-foreground leading-relaxed">
                            By signing, I understand that this is a legally binding contract.
                          </p>
                        </div>
                      </div>

                      {/* Footer buttons */}
                      <div className="px-7 pb-7 flex gap-3 justify-end border-t border-border pt-4">
                        <Button
                          variant="ghost"
                          onClick={() => { setSigModalOpen(false); setSigPendingData(null); setSigLegalChecked(false); setSigTyped(""); modalSigCanvasRef.current?.clear(); }}
                          className="text-xs tracking-wider uppercase font-light rounded-none"
                        >
                          Cancel
                        </Button>
                        <Button
                          disabled={!sigPendingData || !sigLegalChecked}
                          onClick={() => {
                            if (!sigPendingData) return;
                            const finalSig = sigTab === "draw" ? sigPendingData : sigTyped;
                            setSignatureData(finalSig);
                            setContractAgreed(true);
                            setSigModalOpen(false);
                            setSigLegalChecked(false);
                          }}
                          className="text-xs tracking-wider uppercase font-light rounded-none"
                        >
                          Accept and sign
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(extras.length > 0 ? "addons" : "form")} className="text-xs tracking-wider uppercase font-light rounded-none">
                    Back
                  </Button>
                  <Button
                    onClick={handleCheckout}
                    disabled={submitting || !contractAgreed}
                    className="flex-1 gap-2 text-xs tracking-wider uppercase font-light rounded-none h-11"
                  >
                    {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {session.deposit_enabled
                      ? `Pay deposit ${formatCurrency(chargeAmount)}`
                      : `Pay ${formatCurrency(chargeAmount)}`}
                  </Button>
                </div>
              </div>

              {/* ── RIGHT: floating order card ── */}
              <div className="w-full lg:w-72 lg:sticky lg:top-6 shrink-0">
                <div className="bg-background rounded-sm shadow-sm p-5 flex flex-col gap-3">

                  {/* Photographer + session title */}
                  <div className="flex items-center gap-3 pb-3 border-b border-border">
                    <div className="h-9 w-9 rounded-full border border-border bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                      {photographer?.hero_image_url ? (
                        <img src={photographer.hero_image_url} alt={photographer.full_name ?? ""} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xs font-light tracking-widest text-muted-foreground">{initials}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-light text-foreground truncate">{session.title}</p>
                      {photographer?.full_name && (
                        <p className="text-[10px] text-muted-foreground truncate">{photographer.full_name}</p>
                      )}
                    </div>
                  </div>

                  {/* Date / time */}
                  <div className="flex flex-col gap-0.5">
                    <p className="text-[10px] tracking-widest uppercase text-muted-foreground">Date & time</p>
                    <p className="text-xs font-light capitalize">{selectedSlot.label}</p>
                    <p className="text-[11px] text-muted-foreground">{selectedSlot.start_time} – {selectedSlot.end_time}</p>
                  </div>

                  {/* Pricing */}
                  <div className="flex flex-col gap-1.5 border-t border-border pt-3 mt-1">
                    <div className="flex justify-between text-xs font-light">
                      <span className="text-muted-foreground truncate mr-2">{session.title}</span>
                      <span className="shrink-0">{formatCurrency(session.price)}</span>
                    </div>
                    {selectedExtras.map((e) => (
                      <div key={e.id} className="flex justify-between text-xs font-light">
                        <span className="text-muted-foreground truncate mr-2">{e.description} × {e.qty}</span>
                        <span className="shrink-0">{formatCurrency(e.price * e.qty)}</span>
                      </div>
                    ))}
                    {session.tax_rate > 0 && (
                      <div className="flex justify-between text-[10px] text-muted-foreground border-t border-border pt-1.5 mt-0.5">
                        <span>Tax ({session.tax_rate}%)</span>
                        <span>{formatCurrency(taxAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs font-light border-t border-border pt-1.5 mt-0.5">
                      <span>Total</span>
                      <span>{formatCurrency(total)}</span>
                    </div>
                    {session.deposit_enabled && (
                      <>
                        <div className="flex justify-between text-xs font-light text-primary pt-1.5 mt-0.5 border-t border-border">
                          <span>Due today — Deposit</span>
                          <span className="font-normal">{formatCurrency(chargeAmount)}</span>
                        </div>
                        <div className="flex justify-between text-xs font-light text-muted-foreground pt-1.5 mt-0.5 border-t border-dashed border-border">
                          <span>Balance due after delivery</span>
                          <span>{formatCurrency(total - chargeAmount)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
        )
      )}

      <footer className="py-8 text-center">
        <p className="text-[9px] tracking-widest uppercase text-muted-foreground/40">
          Powered by Davions
        </p>
      </footer>
        </>
      )}
    </div>
  );
};

export default SessionDetailPage;
