import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Check, Crown, Zap, Building2, ExternalLink, RefreshCw,
  ArrowDownToLine, Wallet, Receipt, Loader2, Star, Settings2
} from "lucide-react";
import { loadConnectAndInitialize } from "@stripe/connect-js";

// ── Plan config ──────────────────────────────────────────────────────────────
const PLANS = [
  {
    key: "starter",
    name: "Starter",
    price: 29,
    price_id: "price_1TA8dwHHNUkUYwCFqxyHaXwX",
    product_id: "prod_U8PSBb6bJj3mQV",
    split: 5,
    icon: Zap,
    features: [
      "Up to 50 sessions/month",
      "Proof & final galleries",
      "Booking & scheduling",
      "Email marketing (500/mo)",
      "5% platform fee on sales",
    ],
  },
  {
    key: "pro",
    name: "Pro",
    price: 69,
    price_id: "price_1TA8iRHHNUkUYwCFWoTJx7FD",
    product_id: "prod_U8PXjCdBxWHHvT",
    split: 3,
    icon: Crown,
    highlight: true,
    features: [
      "Unlimited sessions",
      "All Starter features",
      "AI Agents & automations",
      "Creative Studio",
      "Email marketing (5,000/mo)",
      "3% platform fee on sales",
    ],
  },
  {
    key: "studio",
    name: "Studio",
    price: 129,
    price_id: "price_1TA8j8HHNUkUYwCFxFY4uY1U",
    product_id: "prod_U8PYo2ocBqxIFO",
    split: 1,
    icon: Building2,
    features: [
      "Everything in Pro",
      "Team access control",
      "Custom domain",
      "White-label platform",
      "Priority support",
      "1% platform fee on sales",
    ],
  },
];

interface SubscriptionStatus {
  subscribed: boolean;
  plan: string | null;
  plan_name: string | null;
  split_percent: number | null;
  subscription_end: string | null;
  subscription_id: string | null;
}

interface StripeBalanceAmount {
  amount: number;
  currency: string;
}

interface StripeBalance {
  available: StripeBalanceAmount[];
  pending: StripeBalanceAmount[];
}

interface Invoice {
  id: string;
  amount_paid: number;
  currency: string;
  created: number;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
  description: string;
  status: string | null;
}

interface Payout {
  id: string;
  amount: number;
  currency: string;
  arrival_date: number;
  status: string;
  description: string | null;
  bank_name: string | null;
  last4: string | null;
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(amount / 100);
}

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

const Billing = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const connectInstanceRef = useRef<any>(null);

  const [sub, setSub] = useState<SubscriptionStatus | null>(null);
  const [balance, setBalance] = useState<StripeBalance | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loadingSub, setLoadingSub] = useState(true);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [loadingPayouts, setLoadingPayouts] = useState(true);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [loadingManage, setLoadingManage] = useState(false);

  const [sub, setSub] = useState<SubscriptionStatus | null>(null);
  const [balance, setBalance] = useState<StripeBalance | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingSub, setLoadingSub] = useState(true);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loadingPayouts, setLoadingPayouts] = useState(true);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [openingPortal, setOpeningPortal] = useState(false);

  const fetchAll = async () => {
    if (!user) return;
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const authHeaders = { Authorization: `Bearer ${token}` };

    setLoadingSub(true);
    setLoadingBalance(true);
    setLoadingInvoices(true);
    setLoadingPayouts(true);

    const [subRes, balanceRes, invoicesRes] = await Promise.all([
      supabase.functions.invoke("check-subscription", { headers: authHeaders }),
      supabase.functions.invoke("get-stripe-balance", { headers: authHeaders }),
      supabase.functions.invoke("get-billing-invoices", { headers: authHeaders }),
    ]);

    if (subRes.data && !subRes.error) setSub(subRes.data);
    setLoadingSub(false);

    if (balanceRes.data?.balance) setBalance(balanceRes.data.balance);
    if (balanceRes.data?.payouts) {
      const raw = balanceRes.data.payouts as any[];
      setPayouts(raw.map((p) => ({
        id: p.id,
        amount: p.amount,
        currency: p.currency,
        arrival_date: p.arrival_date,
        status: p.status,
        description: p.description ?? null,
        bank_name: p.destination?.bank_name ?? p.bank_account?.bank_name ?? null,
        last4: p.destination?.last4 ?? p.bank_account?.last4 ?? null,
      })));
    }
    setLoadingBalance(false);
    setLoadingPayouts(false);

    if (invoicesRes.data?.invoices) setInvoices(invoicesRes.data.invoices);
    setLoadingInvoices(false);
  };

  useEffect(() => {
    fetchAll();
    // Check for success redirect
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      toast({ title: "Subscription activated!", description: "Welcome to your new plan." });
      window.history.replaceState({}, "", "/dashboard/billing");
    }
  }, [user]);

  const handleSubscribe = async (priceId: string, planKey: string) => {
    setCheckingOut(planKey);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke("create-subscription-checkout", {
        body: { price_id: priceId },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error || !data?.url) throw new Error(error?.message ?? "Failed to create checkout");
      window.location.href = data.url;
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setCheckingOut(null);
  };

  const handleManage = async () => {
    setOpeningPortal(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke("customer-portal", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error || !data?.url) throw new Error(error?.message ?? "Failed to open portal");
      window.location.href = data.url;
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setOpeningPortal(false);
  };

  const activePlan = sub?.subscribed ? PLANS.find((p) => p.key === sub.plan) : null;

  const totalAvailable = balance?.available?.reduce((s, a) => s + a.amount, 0) ?? 0;
  const totalPending = balance?.pending?.reduce((s, a) => s + a.amount, 0) ?? 0;
  const balanceCurrency = balance?.available?.[0]?.currency ?? balance?.pending?.[0]?.currency ?? "usd";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar onSignOut={signOut} userEmail={user?.email} />
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader />
          <main className="flex-1 p-6 md:p-10 overflow-y-auto">
            <div className="max-w-5xl flex flex-col gap-10">

              {/* Header */}
              <div>
                <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground flex items-center gap-3 mb-2">
                  <span className="inline-block w-6 h-px bg-border" />
                  Account
                </p>
                <h1 className="text-2xl font-light tracking-wide">Billing</h1>
              </div>


              {/* Plans */}
              <section className="flex flex-col gap-4">
                <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground flex items-center gap-3">
                  <span className="inline-block w-6 h-px bg-border" />
                  {sub?.subscribed ? "Current Plan" : "Choose a Plan"}
                </p>

                {/* Subscribed: show banner only */}
                {!loadingSub && sub?.subscribed && activePlan ? (
                  <div className="border border-foreground p-8 flex flex-col sm:flex-row sm:items-center gap-6 justify-between relative overflow-hidden">
                    {/* background decoration */}
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
                      <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-foreground" />
                      <div className="absolute -left-10 -bottom-10 w-32 h-32 rounded-full bg-foreground" />
                    </div>

                    <div className="flex items-center gap-5 relative">
                      <div className="w-14 h-14 border border-foreground flex items-center justify-center shrink-0">
                        <activePlan.icon className="h-6 w-6" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground font-light">Active Plan</span>
                          <span className="inline-flex items-center gap-1 bg-foreground text-background text-[9px] tracking-[0.15em] uppercase font-light px-2 py-0.5">
                            <Star className="h-2.5 w-2.5 fill-current" />
                            Active
                          </span>
                        </div>
                        <h2 className="text-2xl font-light tracking-wide">{activePlan.name}</h2>
                        <p className="text-sm text-muted-foreground font-light">
                          ${activePlan.price}/month · {activePlan.split}% fee on sales
                        </p>
                        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                          {activePlan.features.map((f) => (
                            <li key={f} className="flex items-center gap-1.5 text-[11px] font-light text-muted-foreground">
                              <Check className="h-3 w-3 shrink-0 text-foreground" />
                              {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 shrink-0 relative">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleManage}
                        disabled={openingPortal}
                        className="gap-2"
                      >
                        {openingPortal ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
                        Manage Plan
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchAll}
                        className="gap-2"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Refresh
                      </Button>
                      {sub.subscription_end && (
                        <p className="text-[10px] text-muted-foreground font-light text-center">
                          Renews {new Date(sub.subscription_end).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                      )}
                    </div>
                  </div>
                ) : !loadingSub && !sub?.subscribed ? (
                  /* Not subscribed: show plan cards */
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {PLANS.map((plan) => {
                      const PlanIcon = plan.icon;
                      return (
                        <div
                          key={plan.key}
                          className={`border p-6 flex flex-col gap-5 relative ${
                            plan.highlight ? "border-foreground" : "border-border"
                          }`}
                        >
                          {plan.highlight && (
                            <span className="absolute -top-px left-6 bg-foreground text-background text-[9px] tracking-[0.2em] uppercase font-light px-2 py-0.5">
                              Most Popular
                            </span>
                          )}

                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 border border-border flex items-center justify-center shrink-0">
                              <PlanIcon className="h-3.5 w-3.5" />
                            </div>
                            <div>
                              <h3 className="text-sm font-light tracking-widest uppercase">{plan.name}</h3>
                              <p className="text-[10px] text-muted-foreground font-light">{plan.split}% on sales</p>
                            </div>
                          </div>

                          <div>
                            <span className="text-3xl font-light">${plan.price}</span>
                            <span className="text-xs text-muted-foreground font-light">/month</span>
                          </div>

                          <ul className="flex flex-col gap-2 flex-1">
                            {plan.features.map((f) => (
                              <li key={f} className="flex items-start gap-2 text-xs font-light text-muted-foreground">
                                <Check className="h-3.5 w-3.5 shrink-0 mt-0.5 text-foreground" />
                                {f}
                              </li>
                            ))}
                          </ul>

                          <Button
                            variant={plan.highlight ? "default" : "outline"}
                            size="sm"
                            disabled={checkingOut === plan.key}
                            onClick={() => handleSubscribe(plan.price_id, plan.key)}
                            className="w-full"
                          >
                            {checkingOut === plan.key ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              "Get Started"
                            )}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : loadingSub ? (
                  <p className="text-xs text-muted-foreground animate-pulse tracking-widest uppercase">Loading…</p>
                ) : null}
              </section>

              {/* Stripe balance */}
              <section className="flex flex-col gap-4">
                <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground flex items-center gap-3">
                  <span className="inline-block w-6 h-px bg-border" />
                  Payment Account Balance
                </p>
                {loadingBalance ? (
                  <p className="text-xs text-muted-foreground animate-pulse tracking-widest uppercase">Loading…</p>
                ) : !balance ? (
                  <div className="border border-border p-5 text-sm font-light text-muted-foreground">
                    No payment account connected yet. Set up payments in{" "}
                    <a href="/dashboard/settings" className="underline underline-offset-2">Settings → Payments</a>.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="border border-border p-5 flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Wallet className="h-3.5 w-3.5" />
                        <span className="text-[10px] tracking-[0.2em] uppercase font-light">Available</span>
                      </div>
                      <span className="text-2xl font-light">{formatCurrency(totalAvailable, balanceCurrency)}</span>
                      <p className="text-[10px] text-muted-foreground font-light">Ready for payout</p>
                    </div>
                    <div className="border border-border p-5 flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <ArrowDownToLine className="h-3.5 w-3.5" />
                        <span className="text-[10px] tracking-[0.2em] uppercase font-light">Pending</span>
                      </div>
                      <span className="text-2xl font-light">{formatCurrency(totalPending, balanceCurrency)}</span>
                      <p className="text-[10px] text-muted-foreground font-light">Processing, not yet available</p>
                    </div>
                  </div>
                )}
              </section>

              {/* Recent Payouts */}
              {balance !== null && (
                <section className="flex flex-col gap-4">
                  <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground flex items-center gap-3">
                    <span className="inline-block w-6 h-px bg-border" />
                    Recent Payouts
                  </p>
                  {loadingPayouts ? (
                    <p className="text-xs text-muted-foreground animate-pulse tracking-widest uppercase">Loading…</p>
                  ) : payouts.length === 0 ? (
                    <div className="border border-border p-5 text-sm font-light text-muted-foreground">
                      No payouts yet.
                    </div>
                  ) : (
                    <div className="border border-border">
                      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-6 px-5 py-3 border-b border-border">
                        <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-light">Date</span>
                        <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-light">Amount</span>
                        <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-light">Status</span>
                        <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-light">Destination</span>
                      </div>
                      {payouts.map((p) => {
                        const dotColor =
                          p.status === "paid" ? "bg-green-500" :
                          p.status === "in_transit" ? "bg-amber-400" :
                          p.status === "pending" ? "bg-muted-foreground" :
                          "bg-destructive";
                        const statusLabel =
                          p.status === "paid" ? "Paid" :
                          p.status === "in_transit" ? "In Transit" :
                          p.status === "pending" ? "Pending" :
                          p.status === "canceled" ? "Canceled" : "Failed";
                        const destination = p.bank_name && p.last4
                          ? `${p.bank_name} ••••${p.last4}`
                          : p.last4 ? `••••${p.last4}` : "—";
                        return (
                          <div
                            key={p.id}
                            className="grid grid-cols-[1fr_auto_auto_auto] gap-x-6 px-5 py-3 border-b border-border last:border-0 items-center"
                          >
                            <span className="text-xs font-light">{formatDate(p.arrival_date)}</span>
                            <span className="text-xs font-light whitespace-nowrap">{formatCurrency(p.amount, p.currency)}</span>
                            <span className="flex items-center gap-1.5 text-xs font-light whitespace-nowrap">
                              <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
                              {statusLabel}
                            </span>
                            <span className="text-xs font-light text-muted-foreground whitespace-nowrap">{destination}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}

              {/* Billing history */}
              <section className="flex flex-col gap-4">
                <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground flex items-center gap-3">
                  <span className="inline-block w-6 h-px bg-border" />
                  Billing History
                </p>
                {loadingInvoices ? (
                  <p className="text-xs text-muted-foreground animate-pulse tracking-widest uppercase">Loading…</p>
                ) : invoices.length === 0 ? (
                  <div className="border border-border p-5 text-sm font-light text-muted-foreground">
                    No invoices yet.
                  </div>
                ) : (
                  <div className="border border-border">
                    <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-6 px-5 py-3 border-b border-border">
                      <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-light">Description</span>
                      <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-light">Date</span>
                      <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-light">Amount</span>
                      <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-light">Receipt</span>
                    </div>
                    {invoices.map((inv) => (
                      <div
                        key={inv.id}
                        className="grid grid-cols-[1fr_auto_auto_auto] gap-x-6 px-5 py-3 border-b border-border last:border-0 items-center"
                      >
                        <span className="text-xs font-light truncate">{inv.description}</span>
                        <span className="text-xs font-light text-muted-foreground whitespace-nowrap">{formatDate(inv.created)}</span>
                        <span className="text-xs font-light whitespace-nowrap">{formatCurrency(inv.amount_paid, inv.currency)}</span>
                        <div className="flex gap-2">
                          {inv.hosted_invoice_url && (
                            <a
                              href={inv.hosted_invoice_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Receipt className="h-3.5 w-3.5" />
                            </a>
                          )}
                          {inv.invoice_pdf && (
                            <a
                              href={inv.invoice_pdf}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <ArrowDownToLine className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Billing;
