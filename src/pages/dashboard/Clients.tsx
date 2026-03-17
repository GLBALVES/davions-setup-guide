import { useState, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Input } from "@/components/ui/input";
import { cn, formatTime12 } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { Search, User, Mail, ChevronRight, CalendarDays, Hash, X } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface RawBooking {
  id: string;
  client_name: string;
  client_email: string;
  booked_date: string | null;
  status: string;
  payment_status: string;
  created_at: string;
  session_id: string;
  sessions: { title: string; price: number } | null;
  session_availability: { start_time: string; end_time: string } | null;
}

interface Client {
  email: string;
  name: string;
  bookingCount: number;
  lastBookingDate: string | null;
  totalSpent: number;
  bookings: RawBooking[];
}

// ── Status pill ──────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  confirmed: "bg-foreground/10 text-foreground",
  pending: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive/70",
};

function StatusPill({ status }: { status: string }) {
  return (
    <span className={cn("px-2 py-0.5 text-[9px] tracking-widest uppercase font-light rounded-sm", STATUS_STYLES[status] ?? "bg-muted text-muted-foreground")}>
      {status}
    </span>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function Clients() {
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const cl = t.clients;
  const [search, setSearch] = useState("");
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);

  const { data: bookings = [], isLoading } = useQuery<RawBooking[]>({
    queryKey: ["clients-bookings", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("bookings")
        .select(`
          id, client_name, client_email, booked_date, status, payment_status, created_at, session_id,
          sessions(title, price),
          session_availability(start_time, end_time)
        `)
        .eq("photographer_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  // Aggregate into unique clients keyed by email
  const clients = useMemo<Client[]>(() => {
    const map = new Map<string, Client>();
    for (const b of bookings) {
      const key = b.client_email.toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          email: b.client_email,
          name: b.client_name,
          bookingCount: 0,
          lastBookingDate: null,
          totalSpent: 0,
          bookings: [],
        });
      }
      const c = map.get(key)!;
      c.bookingCount++;
      c.bookings.push(b);
      const price = b.sessions?.price ?? 0;
      if (b.payment_status === "paid") c.totalSpent += price;
      if (b.booked_date) {
        if (!c.lastBookingDate || b.booked_date > c.lastBookingDate) {
          c.lastBookingDate = b.booked_date;
        }
      }
    }
    // sort by most recent booking
    return Array.from(map.values()).sort((a, b) => {
      if (!a.lastBookingDate) return 1;
      if (!b.lastBookingDate) return -1;
      return b.lastBookingDate.localeCompare(a.lastBookingDate);
    });
  }, [bookings]);

  const filtered = useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.toLowerCase();
    return clients.filter(
      (c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
    );
  }, [clients, search]);

  const selected = selectedEmail ? clients.find((c) => c.email.toLowerCase() === selectedEmail.toLowerCase()) ?? null : null;

  if (!user) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar onSignOut={signOut} userEmail={user?.email} />
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader />

          <main className="flex-1 flex min-h-0 overflow-hidden">
            {/* ── Left: client list ── */}
            <div className={cn(
              "flex flex-col border-r border-border transition-all duration-200",
              selected ? "w-80 shrink-0" : "flex-1"
            )}>
              {/* Header */}
              <div className="px-6 py-5 border-b border-border flex flex-col gap-3">
                <div>
                   <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-1">{cl.crm}</p>
                  <h1 className="text-lg font-light tracking-wide">{cl.title}</h1>
                </div>
                {/* Stats row */}
                {!isLoading && (
                  <div className="flex gap-5">
                    <div>
                      <p className="text-2xl font-light">{clients.length}</p>
                     <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{cl.clientsLabel}</p>
                    </div>
                    <div>
                      <p className="text-2xl font-light">{bookings.length}</p>
                      <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{cl.bookingsLabel}</p>
                    </div>
                    <div>
                      <p className="text-2xl font-light">
                        {clients.filter(c => c.bookingCount > 1).length}
                      </p>
                      <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{cl.returning}</p>
                    </div>
                  </div>
                )}
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                  <Input
                    placeholder={cl.searchPlaceholder}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 h-8 text-xs rounded-none"
                  />
                </div>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                  <div className="flex flex-col gap-0">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="px-6 py-4 border-b border-border/50 animate-pulse">
                        <div className="h-3 bg-muted rounded w-32 mb-2" />
                        <div className="h-2.5 bg-muted rounded w-48 opacity-60" />
                      </div>
                    ))}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground py-20">
                    <User className="h-8 w-8 opacity-20" />
                    <p className="text-xs font-light tracking-wider uppercase">
                      {search ? cl.noClientsMatch : cl.noClientsYet}
                    </p>
                  </div>
                ) : (
                  <div>
                    {filtered.map((client) => {
                      const isActive = selectedEmail?.toLowerCase() === client.email.toLowerCase();
                      return (
                        <button
                          key={client.email}
                          onClick={() => setSelectedEmail(isActive ? null : client.email)}
                          className={cn(
                            "w-full text-left px-6 py-4 border-b border-border/50 transition-colors flex items-center justify-between gap-3 group",
                            isActive
                              ? "bg-foreground text-background"
                              : "hover:bg-muted/40 text-foreground"
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className={cn("text-sm font-light tracking-wide truncate", isActive ? "text-background" : "text-foreground")}>
                                {client.name}
                              </p>
                              {client.bookingCount > 1 && (
                                <span className={cn(
                                  "text-[9px] tracking-widest uppercase px-1.5 py-0.5 font-light rounded-sm shrink-0",
                                  isActive ? "bg-background/20 text-background" : "bg-foreground/8 text-foreground/60"
                                )}>
                                  {cl.returning}
                                </span>
                              )}
                            </div>
                            <p className={cn("text-[11px] font-light truncate", isActive ? "text-background/60" : "text-muted-foreground")}>
                              {client.email}
                            </p>
                            <div className={cn("flex items-center gap-3 mt-1.5 text-[10px] tracking-wide", isActive ? "text-background/50" : "text-muted-foreground/60")}>
                              <span className="flex items-center gap-1">
                                <Hash className="h-2.5 w-2.5" />
                                {client.bookingCount} {client.bookingCount === 1 ? cl.booking : cl.bookings_plural}
                              </span>
                              {client.lastBookingDate && (
                                <span className="flex items-center gap-1">
                                  <CalendarDays className="h-2.5 w-2.5" />
                                  {format(parseISO(client.lastBookingDate), "MMM d, yyyy")}
                                </span>
                              )}
                            </div>
                          </div>
                          <ChevronRight className={cn("h-3.5 w-3.5 shrink-0 transition-transform", isActive ? "text-background/60 rotate-90" : "text-muted-foreground/40 group-hover:text-muted-foreground")} />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ── Right: client detail panel ── */}
            {selected && (
              <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
                {/* Panel header */}
                <div className="px-8 py-6 border-b border-border flex items-start justify-between gap-4 sticky top-0 bg-background z-10">
                  <div className="flex flex-col gap-1.5">
                    <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">{cl.clientProfile}</p>
                    <h2 className="text-xl font-light tracking-wide">{selected.name}</h2>
                    <a href={`mailto:${selected.email}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                      <Mail className="h-3 w-3" />
                      {selected.email}
                    </a>
                  </div>
                  <button
                    onClick={() => setSelectedEmail(null)}
                    className="mt-1 p-1.5 rounded-sm hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Stats strip */}
                <div className="px-8 py-5 border-b border-border grid grid-cols-3 gap-6">
                  <div>
                    <p className="text-3xl font-light">{selected.bookingCount}</p>
                    <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mt-0.5">Total bookings</p>
                  </div>
                  <div>
                    <p className="text-3xl font-light">
                      ${(selected.totalSpent / 100).toFixed(0)}
                    </p>
                    <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mt-0.5">Total paid</p>
                  </div>
                  <div>
                    <p className="text-3xl font-light">
                      {selected.lastBookingDate ? format(parseISO(selected.lastBookingDate), "MMM d") : "—"}
                    </p>
                    <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mt-0.5">Last session</p>
                  </div>
                </div>

                {/* Booking history */}
                <div className="px-8 py-6 flex flex-col gap-4">
                  <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">Booking history</p>
                  <div className="flex flex-col gap-2">
                    {selected.bookings.map((b) => {
                      const startTime = b.session_availability?.start_time
                        ? formatTime12(b.session_availability.start_time.slice(0, 5))
                        : null;
                      const endTime = b.session_availability?.end_time
                        ? formatTime12(b.session_availability.end_time.slice(0, 5))
                        : null;
                      return (
                        <div key={b.id} className="border border-border p-4 flex flex-col gap-2.5">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-light tracking-wide">{b.sessions?.title ?? "Session"}</p>
                              {b.booked_date && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {format(parseISO(b.booked_date), "EEEE, MMMM d, yyyy")}
                                  {startTime && (
                                    <span className="ml-2 opacity-70">
                                      {startTime}{endTime ? ` – ${endTime}` : ""}
                                    </span>
                                  )}
                                </p>
                              )}
                            </div>
                            <StatusPill status={b.status} />
                          </div>
                          <div className="flex items-center gap-4 text-[10px] tracking-[0.15em] uppercase text-muted-foreground/70">
                            {b.sessions?.price != null && (
                              <span>${(b.sessions.price / 100).toFixed(0)}</span>
                            )}
                            <span className={cn(
                              b.payment_status === "paid" ? "text-foreground/60" : "text-muted-foreground/50"
                            )}>
                              {b.payment_status}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
