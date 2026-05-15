import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  Wallet, Clock, ArrowDownToLine, RefreshCw, Loader2, AlertCircle, Pencil,
} from "lucide-react";
import { format } from "date-fns";

const T = {
  en: {
    section: "FINANCE",
    title: "Balance",
    desc: "Manage funds processed via PIX, boleto and credit card.",
    available: "Available",
    waiting: "Pending receivables",
    transferred: "Transferred (lifetime)",
    bank: "Bank account",
    withdraw: "Request withdrawal",
    refresh: "Refresh",
    notConnected: "Brazilian payments not enabled yet.",
    notConnectedCta: "Set up payment account",
    operations: "Recent activity",
    withdrawals: "Withdrawals",
    noOps: "No activity yet.",
    noWith: "No withdrawals yet.",
    type: "Type", date: "Date", amount: "Amount", status: "Status",
    modalTitle: "Withdraw to your bank account",
    modalAmount: "Amount (BRL)",
    modalAvailable: "Available:",
    modalConfirm: "Confirm withdrawal",
    modalCancel: "Cancel",
    success: "Withdrawal requested",
    failed: "Withdrawal failed",
    invalidAmount: "Invalid amount",
    missingFields: "Please fill in all required fields",
    change: "Change",
    changeBankTitle: "Change bank account",
    changeBankDesc: "Update where your withdrawals are deposited. The holder must match the recipient document.",
    holderName: "Holder name",
    holderDocument: "Holder document (CPF/CNPJ)",
    holderType: "Holder type",
    holderIndividual: "Individual",
    holderCompany: "Company",
    bankCode: "Bank code (3 digits)",
    branchNumber: "Branch",
    branchDigit: "Branch digit (optional)",
    accountNumber: "Account",
    accountDigit: "Account digit",
    accountType: "Account type",
    accountChecking: "Checking",
    accountSavings: "Savings",
    saveBank: "Save bank account",
    bankUpdated: "Bank account updated",
    bankUpdateFailed: "Failed to update bank account",
  },
  pt: {
    section: "FINANCEIRO",
    title: "Saldo",
    desc: "Gerencie os valores processados via PIX, boleto e cartão.",
    available: "Disponível",
    waiting: "A receber",
    transferred: "Já transferido",
    bank: "Conta bancária",
    withdraw: "Solicitar saque",
    refresh: "Atualizar",
    notConnected: "Pagamentos no Brasil ainda não estão ativos.",
    notConnectedCta: "Configurar conta de pagamento",
    operations: "Movimentações recentes",
    withdrawals: "Saques",
    noOps: "Nenhuma movimentação ainda.",
    noWith: "Nenhum saque realizado.",
    type: "Tipo", date: "Data", amount: "Valor", status: "Status",
    modalTitle: "Sacar para sua conta bancária",
    modalAmount: "Valor (R$)",
    modalAvailable: "Disponível:",
    modalConfirm: "Confirmar saque",
    modalCancel: "Cancelar",
    success: "Saque solicitado",
    failed: "Falha no saque",
    invalidAmount: "Valor inválido",
    missingFields: "Preencha todos os campos obrigatórios",
    change: "Trocar",
    changeBankTitle: "Trocar conta bancária",
    changeBankDesc: "Atualize a conta para onde os saques serão depositados. O titular precisa coincidir com o documento da conta de pagamento.",
    holderName: "Nome do titular",
    holderDocument: "Documento do titular (CPF/CNPJ)",
    holderType: "Tipo de titular",
    holderIndividual: "Pessoa física",
    holderCompany: "Pessoa jurídica",
    bankCode: "Código do banco (3 dígitos)",
    branchNumber: "Agência",
    branchDigit: "Dígito da agência (opcional)",
    accountNumber: "Conta",
    accountDigit: "Dígito da conta",
    accountType: "Tipo de conta",
    accountChecking: "Corrente",
    accountSavings: "Poupança",
    saveBank: "Salvar conta",
    bankUpdated: "Conta bancária atualizada",
    bankUpdateFailed: "Falha ao atualizar conta",
  },
  es: {
    section: "FINANZAS",
    title: "Saldo",
    desc: "Gestiona los fondos procesados vía PIX, boleto y tarjeta.",
    available: "Disponible",
    waiting: "Por cobrar",
    transferred: "Ya transferido",
    bank: "Cuenta bancaria",
    withdraw: "Solicitar retiro",
    refresh: "Actualizar",
    notConnected: "Pagos en Brasil aún no están activos.",
    notConnectedCta: "Configurar cuenta de pago",
    operations: "Movimientos recientes",
    withdrawals: "Retiros",
    noOps: "Sin movimientos aún.",
    noWith: "Sin retiros aún.",
    type: "Tipo", date: "Fecha", amount: "Importe", status: "Estado",
    modalTitle: "Retirar a tu cuenta bancaria",
    modalAmount: "Importe (R$)",
    modalAvailable: "Disponible:",
    modalConfirm: "Confirmar retiro",
    modalCancel: "Cancelar",
    success: "Retiro solicitado",
    failed: "Retiro fallido",
    invalidAmount: "Importe inválido",
    missingFields: "Completa todos los campos obligatorios",
    change: "Cambiar",
    changeBankTitle: "Cambiar cuenta bancaria",
    changeBankDesc: "Actualiza la cuenta donde se depositan tus retiros. El titular debe coincidir con el documento de la cuenta de pago.",
    holderName: "Nombre del titular",
    holderDocument: "Documento del titular (CPF/CNPJ)",
    holderType: "Tipo de titular",
    holderIndividual: "Persona física",
    holderCompany: "Persona jurídica",
    bankCode: "Código del banco (3 dígitos)",
    branchNumber: "Agencia",
    branchDigit: "Dígito de la agencia (opcional)",
    accountNumber: "Cuenta",
    accountDigit: "Dígito de la cuenta",
    accountType: "Tipo de cuenta",
    accountChecking: "Corriente",
    accountSavings: "Ahorro",
    saveBank: "Guardar cuenta",
    bankUpdated: "Cuenta bancaria actualizada",
    bankUpdateFailed: "Error al actualizar la cuenta",
  },
} as const;

const fmtBRL = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
    .format((Number(cents) || 0) / 100);

interface BalanceData {
  available?: { amount: number };
  waiting_funds?: { amount: number };
  transferred?: { amount: number };
}
interface Operation {
  id: string;
  type: string;
  amount: number;
  date_created?: string;
  movement_object?: { status?: string };
}
interface Withdrawal {
  id: string;
  amount: number;
  status: string;
  created_at?: string;
}
interface BankAccount {
  bank?: string;
  branch_number?: string;
  account_number?: string;
  account_check_digit?: string;
  holder_name?: string;
}

export default function FinancePagarme() {
  const { user, signOut } = useAuth();
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const t = T[lang];

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [ops, setOps] = useState<Operation[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [bank, setBank] = useState<BankAccount | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Change-bank-account dialog state
  const [bankOpen, setBankOpen] = useState(false);
  const [bankSubmitting, setBankSubmitting] = useState(false);
  const [bankForm, setBankForm] = useState({
    holder_name: "",
    holder_document: "",
    holder_type: "individual" as "individual" | "company",
    bank: "",
    branch_number: "",
    branch_check_digit: "",
    account_number: "",
    account_check_digit: "",
    type: "checking" as "checking" | "savings",
  });

  const openChangeBank = () => {
    setBankForm((f) => ({
      ...f,
      holder_name: bank?.holder_name ?? "",
      bank: bank?.bank ?? "",
      branch_number: bank?.branch_number ?? "",
      account_number: bank?.account_number ?? "",
      account_check_digit: bank?.account_check_digit ?? "",
    }));
    setBankOpen(true);
  };

  const submitChangeBank = async () => {
    if (
      !bankForm.holder_name ||
      !bankForm.holder_document ||
      !bankForm.bank ||
      !bankForm.branch_number ||
      !bankForm.account_number ||
      !bankForm.account_check_digit
    ) {
      toast({ title: t.bankUpdateFailed, description: t.missingFields, variant: "destructive" });
      return;
    }
    setBankSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "pagarme-update-bank-account",
        { body: bankForm },
      );
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast({ title: t.bankUpdated });
      setBankOpen(false);
      load();
    } catch (e: any) {
      toast({ title: t.bankUpdateFailed, description: e.message, variant: "destructive" });
    } finally {
      setBankSubmitting(false);
    }
  };

  const load = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "pagarme-recipient-balance",
      );
      if (error) throw error;
      if (data?.error === "not_connected") {
        setError("not_connected");
      } else if (data?.error) {
        setError(data.error);
      } else {
        setError(null);
        setBalance(data.balance);
        setOps(data.operations || []);
        setWithdrawals(data.withdrawals || []);
        setBank(data.bank_account || null);
      }
    } catch (e: any) {
      setError(e.message || "load_failed");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { if (user) load(); /* eslint-disable-next-line */ }, [user]);

  const available = balance?.available?.amount ?? 0;
  const waiting = balance?.waiting_funds?.amount ?? 0;
  const transferred = balance?.transferred?.amount ?? 0;

  const openWithdraw = () => {
    setWithdrawAmount((available / 100).toFixed(2));
    setModalOpen(true);
  };

  const confirmWithdraw = async () => {
    const cents = Math.round(parseFloat(withdrawAmount.replace(",", ".")) * 100);
    if (!Number.isFinite(cents) || cents <= 0 || cents > available) {
      toast({ title: t.failed, description: "Invalid amount", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "pagarme-create-withdrawal",
        { body: { amount: cents } },
      );
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast({ title: t.success });
      setModalOpen(false);
      load();
    } catch (e: any) {
      toast({ title: t.failed, description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar onSignOut={signOut} userEmail={user?.email} />
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader />
          <main className="flex-1 p-6 md:p-10 overflow-y-auto">
            <div className="flex flex-col gap-8 max-w-5xl">

              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground flex items-center gap-3 mb-2">
                    <span className="inline-block w-6 h-px bg-border" />{t.section}
                  </p>
                  <h1 className="text-2xl font-light tracking-wide">{t.title}</h1>
                  <p className="text-xs text-muted-foreground mt-1 font-light">{t.desc}</p>
                </div>
                {!loading && !error && (
                  <Button variant="ghost" size="sm" onClick={load} disabled={refreshing}
                    className="text-[10px] tracking-widest uppercase">
                    <RefreshCw className={`h-3 w-3 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                    {t.refresh}
                  </Button>
                )}
              </div>

              {loading ? (
                <div className="py-20 flex justify-center">
                  <Loader2 className="animate-spin text-muted-foreground" size={18} />
                </div>
              ) : error === "not_connected" ? (
                <div className="border border-border p-10 flex flex-col items-center text-center gap-4">
                  <AlertCircle className="h-6 w-6 text-muted-foreground/50" />
                  <p className="text-sm font-light">{t.notConnected}</p>
                  <Button onClick={() => navigate("/dashboard/settings?tab=payments")}
                    className="text-[10px] tracking-widest uppercase">
                    {t.notConnectedCta}
                  </Button>
                </div>
              ) : error ? (
                <div className="border border-destructive/40 p-6 text-xs text-destructive">{error}</div>
              ) : (
                <>
                  {/* Balance KPIs */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <KpiCard icon={Wallet} label={t.available} value={fmtBRL(available)} highlight />
                    <KpiCard icon={Clock} label={t.waiting} value={fmtBRL(waiting)} />
                    <KpiCard icon={ArrowDownToLine} label={t.transferred} value={fmtBRL(transferred)} />
                  </div>

                  {/* Withdraw row */}
                  <div className="border border-border p-5 flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex flex-col gap-1 min-w-0">
                      <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{t.bank}</p>
                      <p className="text-sm font-light truncate">
                        {bank
                          ? `${bank.holder_name ?? ""} · ${bank.bank ?? ""} · ag ${bank.branch_number ?? "-"} · cc ${bank.account_number ?? "-"}-${bank.account_check_digit ?? ""}`
                          : "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={openChangeBank}
                        className="text-[10px] tracking-widest uppercase">
                        <Pencil className="h-3 w-3 mr-2" />
                        {t.change}
                      </Button>
                      <Button onClick={openWithdraw} disabled={available <= 0}
                        className="text-[10px] tracking-widest uppercase">
                        <ArrowDownToLine className="h-3 w-3 mr-2" />
                        {t.withdraw}
                      </Button>
                    </div>
                  </div>

                  {/* Operations */}
                  <div className="border border-border">
                    <div className="px-5 py-4 border-b border-border">
                      <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{t.operations}</p>
                    </div>
                    {ops.length === 0 ? (
                      <p className="px-5 py-8 text-xs text-muted-foreground/60 font-light">{t.noOps}</p>
                    ) : (
                      <div className="divide-y divide-border">
                        {ops.map((o) => (
                          <div key={o.id} className="px-5 py-3 grid grid-cols-12 gap-3 items-center text-xs">
                            <div className="col-span-3 text-muted-foreground">
                              {o.date_created ? format(new Date(o.date_created), "dd/MM/yy HH:mm") : "—"}
                            </div>
                            <div className="col-span-5 capitalize font-light">{o.type?.replace(/_/g, " ")}</div>
                            <div className="col-span-2 text-muted-foreground capitalize">{o.movement_object?.status ?? ""}</div>
                            <div className={`col-span-2 text-right tabular-nums ${o.amount < 0 ? "text-destructive" : "text-foreground"}`}>
                              {fmtBRL(o.amount)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Withdrawals */}
                  <div className="border border-border">
                    <div className="px-5 py-4 border-b border-border">
                      <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{t.withdrawals}</p>
                    </div>
                    {withdrawals.length === 0 ? (
                      <p className="px-5 py-8 text-xs text-muted-foreground/60 font-light">{t.noWith}</p>
                    ) : (
                      <div className="divide-y divide-border">
                        {withdrawals.map((w) => (
                          <div key={w.id} className="px-5 py-3 grid grid-cols-12 gap-3 items-center text-xs">
                            <div className="col-span-3 text-muted-foreground">
                              {w.created_at ? format(new Date(w.created_at), "dd/MM/yy HH:mm") : "—"}
                            </div>
                            <div className="col-span-5 font-mono text-[10px] text-muted-foreground/70 truncate">{w.id}</div>
                            <div className="col-span-2 capitalize text-muted-foreground">{w.status}</div>
                            <div className="col-span-2 text-right tabular-nums">{fmtBRL(w.amount)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </main>
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-light tracking-wide">{t.modalTitle}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
              {t.modalAvailable} <span className="text-foreground tabular-nums normal-case tracking-normal">{fmtBRL(available)}</span>
            </p>
            <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{t.modalAmount}</label>
            <Input
              type="number" inputMode="decimal" step="0.01" min="0"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}
              className="text-[10px] tracking-widest uppercase">{t.modalCancel}</Button>
            <Button size="sm" onClick={confirmWithdraw} disabled={submitting}
              className="text-[10px] tracking-widest uppercase">
              {submitting && <Loader2 className="h-3 w-3 mr-2 animate-spin" />}
              {t.modalConfirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change bank account */}
      <Dialog open={bankOpen} onOpenChange={setBankOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm font-light tracking-wide">{t.changeBankTitle}</DialogTitle>
          </DialogHeader>
          <p className="text-[11px] text-muted-foreground font-light">{t.changeBankDesc}</p>
          <div className="grid grid-cols-2 gap-3 py-2">
            <BankField label={t.holderName} className="col-span-2"
              value={bankForm.holder_name}
              onChange={(v) => setBankForm({ ...bankForm, holder_name: v })} />
            <BankField label={t.holderDocument}
              value={bankForm.holder_document}
              onChange={(v) => setBankForm({ ...bankForm, holder_document: v })} />
            <div className="flex flex-col gap-1">
              <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{t.holderType}</label>
              <select
                className="h-9 px-2 text-sm bg-background border border-input"
                value={bankForm.holder_type}
                onChange={(e) => setBankForm({ ...bankForm, holder_type: e.target.value as any })}
              >
                <option value="individual">{t.holderIndividual}</option>
                <option value="company">{t.holderCompany}</option>
              </select>
            </div>
            <BankField label={t.bankCode}
              value={bankForm.bank}
              onChange={(v) => setBankForm({ ...bankForm, bank: v })} />
            <div className="flex flex-col gap-1">
              <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{t.accountType}</label>
              <select
                className="h-9 px-2 text-sm bg-background border border-input"
                value={bankForm.type}
                onChange={(e) => setBankForm({ ...bankForm, type: e.target.value as any })}
              >
                <option value="checking">{t.accountChecking}</option>
                <option value="savings">{t.accountSavings}</option>
              </select>
            </div>
            <BankField label={t.branchNumber}
              value={bankForm.branch_number}
              onChange={(v) => setBankForm({ ...bankForm, branch_number: v })} />
            <BankField label={t.branchDigit}
              value={bankForm.branch_check_digit}
              onChange={(v) => setBankForm({ ...bankForm, branch_check_digit: v })} />
            <BankField label={t.accountNumber}
              value={bankForm.account_number}
              onChange={(v) => setBankForm({ ...bankForm, account_number: v })} />
            <BankField label={t.accountDigit}
              value={bankForm.account_check_digit}
              onChange={(v) => setBankForm({ ...bankForm, account_check_digit: v })} />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" onClick={() => setBankOpen(false)}
              className="text-[10px] tracking-widest uppercase">{t.modalCancel}</Button>
            <Button size="sm" onClick={submitChangeBank} disabled={bankSubmitting}
              className="text-[10px] tracking-widest uppercase">
              {bankSubmitting && <Loader2 className="h-3 w-3 mr-2 animate-spin" />}
              {t.saveBank}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}

function KpiCard({ icon: Icon, label, value, highlight }: {
  icon: React.ElementType; label: string; value: string; highlight?: boolean;
}) {
  return (
    <div className={`border p-5 flex flex-col gap-2 ${highlight ? "border-foreground" : "border-border"}`}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{label}</p>
        <Icon className="h-3.5 w-3.5 text-muted-foreground/30" />
      </div>
      <p className="text-xl font-light tabular-nums">{value}</p>
    </div>
  );
}

function BankField({ label, value, onChange, className }: {
  label: string; value: string; onChange: (v: string) => void; className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1 ${className ?? ""}`}>
      <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{label}</label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
