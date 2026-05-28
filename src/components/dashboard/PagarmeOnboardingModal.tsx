import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultEmail?: string;
  onSuccess?: () => void;
}

const DEFAULT_ADDRESS = {
  street: "",
  street_number: "",
  complementary: "",
  neighborhood: "",
  city: "",
  state: "",
  zip_code: "",
};

const DEFAULT_BANK = {
  holder_name: "",
  holder_document: "",
  bank: "",
  branch_number: "",
  branch_check_digit: "",
  account_number: "",
  account_check_digit: "",
  type: "checking" as "checking" | "savings",
};

const DEFAULT_PHONE = { ddd: "", number: "" };

const COPY = {
  pt: {
    title: "Configure seu recebimento",
    description:
      "Para começar a receber pagamentos dos seus clientes, precisamos de alguns dados. Tudo é processado de forma segura e os valores caem direto na sua conta.",
    individual: "Pessoa Física",
    corporation: "Pessoa Jurídica",
    save: "Ativar recebimento",
    saving: "Configurando...",
    secure: "Dados protegidos com criptografia bancária",
    yourData: "Seus dados",
    address: "Endereço",
    bank: "Conta bancária para recebimento",
    partner: "Sócio responsável",
    company: "Dados da empresa",
    name: "Nome completo",
    cpf: "CPF",
    cnpj: "CNPJ",
    motherName: "Nome da mãe",
    birthdate: "Data de nascimento (DD/MM/AAAA)",
    monthlyIncome: "Renda mensal (R$)",
    annualRevenue: "Faturamento anual (R$)",
    occupation: "Profissão",
    email: "E-mail",
    ddd: "DDD",
    phone: "Celular",
    street: "Rua",
    number: "Número",
    complement: "Complemento (opcional)",
    neighborhood: "Bairro",
    city: "Cidade",
    state: "UF",
    zip: "CEP",
    companyName: "Razão social",
    tradingName: "Nome fantasia",
    foundingDate: "Data de fundação (DD/MM/AAAA)",
    bankCode: "Código do banco (3 dígitos)",
    branch: "Agência",
    branchDigit: "Dígito (opcional)",
    account: "Conta",
    accountDigit: "Dígito",
    accountType: "Tipo",
    checking: "Corrente",
    savings: "Poupança",
    holderName: "Titular da conta",
    holderDoc: "CPF/CNPJ do titular",
    success: "Recebimento ativado com sucesso!",
    error: "Não foi possível configurar agora. Confira os dados.",
    requiredFields: "Preencha todos os campos obrigatórios",
  },
  en: {
    title: "Set up payouts",
    description:
      "To start receiving customer payments we need a few details. Everything is processed securely and funds go straight to your account.",
    individual: "Individual",
    corporation: "Company",
    save: "Activate payouts",
    saving: "Configuring...",
    secure: "Bank-grade encryption",
    yourData: "Your details",
    address: "Address",
    bank: "Bank account for payouts",
    partner: "Responsible partner",
    company: "Company information",
    name: "Full name",
    cpf: "Tax ID (CPF)",
    cnpj: "Tax ID (CNPJ)",
    motherName: "Mother's name",
    birthdate: "Date of birth (DD/MM/YYYY)",
    monthlyIncome: "Monthly income (BRL)",
    annualRevenue: "Annual revenue (BRL)",
    occupation: "Occupation",
    email: "Email",
    ddd: "Area",
    phone: "Mobile",
    street: "Street",
    number: "Number",
    complement: "Complement (optional)",
    neighborhood: "Neighborhood",
    city: "City",
    state: "State",
    zip: "ZIP",
    companyName: "Legal name",
    tradingName: "Trade name",
    foundingDate: "Founding date (DD/MM/YYYY)",
    bankCode: "Bank code (3 digits)",
    branch: "Branch",
    branchDigit: "Digit (optional)",
    account: "Account",
    accountDigit: "Digit",
    accountType: "Type",
    checking: "Checking",
    savings: "Savings",
    holderName: "Account holder",
    holderDoc: "Holder Tax ID",
    success: "Payouts activated!",
    error: "Could not set up now. Please review the fields.",
    requiredFields: "Fill in all required fields",
  },
  es: {
    title: "Configura tus cobros",
    description:
      "Para empezar a recibir pagos necesitamos algunos datos. Todo se procesa de forma segura y los fondos van directo a tu cuenta.",
    individual: "Persona Física",
    corporation: "Persona Jurídica",
    save: "Activar cobros",
    saving: "Configurando...",
    secure: "Cifrado bancario",
    yourData: "Tus datos",
    address: "Dirección",
    bank: "Cuenta bancaria",
    partner: "Socio responsable",
    company: "Datos de la empresa",
    name: "Nombre completo",
    cpf: "CPF",
    cnpj: "CNPJ",
    motherName: "Nombre de la madre",
    birthdate: "Fecha de nacimiento (DD/MM/AAAA)",
    monthlyIncome: "Ingreso mensual (BRL)",
    annualRevenue: "Facturación anual (BRL)",
    occupation: "Profesión",
    email: "Email",
    ddd: "DDD",
    phone: "Móvil",
    street: "Calle",
    number: "Número",
    complement: "Complemento (opcional)",
    neighborhood: "Barrio",
    city: "Ciudad",
    state: "Estado",
    zip: "CP",
    companyName: "Razón social",
    tradingName: "Nombre comercial",
    foundingDate: "Fecha de fundación (DD/MM/AAAA)",
    bankCode: "Código del banco (3 dígitos)",
    branch: "Agencia",
    branchDigit: "Dígito (opcional)",
    account: "Cuenta",
    accountDigit: "Dígito",
    accountType: "Tipo",
    checking: "Corriente",
    savings: "Ahorro",
    holderName: "Titular",
    holderDoc: "Documento del titular",
    success: "¡Cobros activados!",
    error: "No se pudo configurar. Revisa los datos.",
    requiredFields: "Completa todos los campos obligatorios",
  },
};

/** Format raw digits as dd/mm/yyyy while typing */
function formatDateBR(input: string): string {
  const d = input.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}



interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  className?: string;
}

const Field = ({ label, value, onChange, type = "text", placeholder = "", className = "" }: FieldProps) => (
  <div className={`flex flex-col gap-1.5 ${className}`}>
    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-light">{label}</Label>
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      type={type}
      placeholder={placeholder}
      className="h-9 text-sm"
    />
  </div>
);

const AddressBlock = ({
  value,
  onChange,
  labels,
}: {
  value: typeof DEFAULT_ADDRESS;
  onChange: (v: typeof DEFAULT_ADDRESS) => void;
  labels: { zip: string; street: string; number: string; complement: string; neighborhood: string; city: string; state: string };
}) => (
  <div className="grid grid-cols-12 gap-3">
    <Field className="col-span-12 sm:col-span-3" label={labels.zip} value={value.zip_code} onChange={(v) => onChange({ ...value, zip_code: v })} placeholder="00000-000" />
    <Field className="col-span-12 sm:col-span-7" label={labels.street} value={value.street} onChange={(v) => onChange({ ...value, street: v })} />
    <Field className="col-span-6 sm:col-span-2" label={labels.number} value={value.street_number} onChange={(v) => onChange({ ...value, street_number: v })} />
    <Field className="col-span-12 sm:col-span-6" label={labels.complement} value={value.complementary} onChange={(v) => onChange({ ...value, complementary: v })} />
    <Field className="col-span-12 sm:col-span-6" label={labels.neighborhood} value={value.neighborhood} onChange={(v) => onChange({ ...value, neighborhood: v })} />
    <Field className="col-span-8 sm:col-span-9" label={labels.city} value={value.city} onChange={(v) => onChange({ ...value, city: v })} />
    <Field className="col-span-4 sm:col-span-3" label={labels.state} value={value.state} onChange={(v) => onChange({ ...value, state: v.toUpperCase().slice(0, 2) })} placeholder="SP" />
  </div>
);

export function PagarmeOnboardingModal({ open, onOpenChange, defaultEmail, onSuccess }: Props) {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const t = COPY[(lang as "pt" | "en" | "es")] ?? COPY.pt;
  const [tab, setTab] = useState<"individual" | "corporation">("individual");
  const [submitting, setSubmitting] = useState(false);

  // Individual
  const [pf, setPf] = useState({
    name: "",
    document: "",
    mother_name: "",
    birthdate: "",
    monthly_income: "",
    professional_occupation: "Photographer",
    phone: { ...DEFAULT_PHONE },
    address: { ...DEFAULT_ADDRESS },
  });

  // Corporation
  const [pj, setPj] = useState({
    document: "",
    company_name: "",
    trading_name: "",
    annual_revenue: "",
    founding_date: "",
    phone: { ...DEFAULT_PHONE },
    address: { ...DEFAULT_ADDRESS },
    partner: {
      name: "",
      document: "",
      mother_name: "",
      birthdate: "",
      monthly_income: "",
      email: defaultEmail || user?.email || "",
      phone: { ...DEFAULT_PHONE },
      address: { ...DEFAULT_ADDRESS },
    },
  });

  const [bank, setBank] = useState({ ...DEFAULT_BANK });

  async function submit() {
    const email = defaultEmail || user?.email || "";
    if (!email) return;

    let payload: any;

    if (tab === "individual") {
      const required = [
        pf.name, pf.document, pf.birthdate, pf.monthly_income,
        pf.phone.ddd, pf.phone.number,
        pf.address.street, pf.address.street_number, pf.address.neighborhood,
        pf.address.city, pf.address.state, pf.address.zip_code,
        bank.holder_name, bank.holder_document, bank.bank,
        bank.branch_number, bank.account_number, bank.account_check_digit,
      ];
      if (required.some((v) => !String(v).trim())) {
        toast({ title: t.requiredFields, variant: "destructive" });
        return;
      }
      payload = {
        type: "individual",
        email,
        ...pf,
        monthly_income: Number(pf.monthly_income),
        bank,
      };
    } else {
      const required = [
        pj.document, pj.company_name, pj.annual_revenue, pj.founding_date,
        pj.phone.ddd, pj.phone.number,
        pj.address.street, pj.address.street_number, pj.address.neighborhood,
        pj.address.city, pj.address.state, pj.address.zip_code,
        pj.partner.name, pj.partner.document, pj.partner.birthdate,
        pj.partner.monthly_income, pj.partner.email,
        pj.partner.phone.ddd, pj.partner.phone.number,
        pj.partner.address.street, pj.partner.address.street_number,
        pj.partner.address.neighborhood, pj.partner.address.city,
        pj.partner.address.state, pj.partner.address.zip_code,
        bank.holder_name, bank.holder_document, bank.bank,
        bank.branch_number, bank.account_number, bank.account_check_digit,
      ];
      if (required.some((v) => !String(v).trim())) {
        toast({ title: t.requiredFields, variant: "destructive" });
        return;
      }
      payload = {
        type: "corporation",
        email,
        document: pj.document,
        company_name: pj.company_name,
        trading_name: pj.trading_name,
        annual_revenue: Number(pj.annual_revenue),
        founding_date: pj.founding_date,
        phone: pj.phone,
        address: pj.address,
        managing_partner: {
          ...pj.partner,
          monthly_income: Number(pj.partner.monthly_income),
        },
        bank,
      };
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("pagarme-create-recipient", {
        body: payload,
      });
      if (error || data?.error) {
        const msg = (data?.error as string) || error?.message || t.error;
        toast({ title: t.error, description: msg, variant: "destructive" });
        return;
      }
      toast({ title: t.success });
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      toast({ title: t.error, description: (err as Error).message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  const addressLabels = { zip: t.zip, street: t.street, number: t.number, complement: t.complement, neighborhood: t.neighborhood, city: t.city, state: t.state };

  const BankBlock = (
    <div className="flex flex-col gap-3">
      <h4 className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-light">{t.bank}</h4>
      <div className="grid grid-cols-12 gap-3">
        <Field className="col-span-12 sm:col-span-7" label={t.holderName} value={bank.holder_name} onChange={(v: string) => setBank({ ...bank, holder_name: v })} />
        <Field className="col-span-12 sm:col-span-5" label={t.holderDoc} value={bank.holder_document} onChange={(v: string) => setBank({ ...bank, holder_document: v })} />
        <Field className="col-span-4 sm:col-span-2" label={t.bankCode} value={bank.bank} onChange={(v: string) => setBank({ ...bank, bank: v })} placeholder="001" />
        <Field className="col-span-5 sm:col-span-3" label={t.branch} value={bank.branch_number} onChange={(v: string) => setBank({ ...bank, branch_number: v })} />
        <Field className="col-span-3 sm:col-span-2" label={t.branchDigit} value={bank.branch_check_digit} onChange={(v: string) => setBank({ ...bank, branch_check_digit: v })} />
        <Field className="col-span-7 sm:col-span-3" label={t.account} value={bank.account_number} onChange={(v: string) => setBank({ ...bank, account_number: v })} />
        <Field className="col-span-5 sm:col-span-2" label={t.accountDigit} value={bank.account_check_digit} onChange={(v: string) => setBank({ ...bank, account_check_digit: v })} />
        <div className="col-span-12 flex flex-col gap-1.5">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-light">{t.accountType}</Label>
          <Select value={bank.type} onValueChange={(v) => setBank({ ...bank, type: v as "checking" | "savings" })}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent className="z-[60]">
              <SelectItem value="checking">{t.checking}</SelectItem>
              <SelectItem value="savings">{t.savings}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-light tracking-wide">{t.title}</DialogTitle>
          <DialogDescription className="text-xs font-light leading-relaxed">{t.description}</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="mt-2">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="individual">{t.individual}</TabsTrigger>
            <TabsTrigger value="corporation">{t.corporation}</TabsTrigger>
          </TabsList>

          {/* ── PF ── */}
          <TabsContent value="individual" className="flex flex-col gap-6 pt-4">
            <div className="flex flex-col gap-3">
              <h4 className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-light">{t.yourData}</h4>
              <div className="grid grid-cols-12 gap-3">
                <Field className="col-span-12 sm:col-span-7" label={t.name} value={pf.name} onChange={(v: string) => setPf({ ...pf, name: v })} />
                <Field className="col-span-12 sm:col-span-5" label={t.cpf} value={pf.document} onChange={(v: string) => setPf({ ...pf, document: v })} placeholder="000.000.000-00" />
                <Field className="col-span-12 sm:col-span-7" label={t.motherName} value={pf.mother_name} onChange={(v: string) => setPf({ ...pf, mother_name: v })} />
                <Field className="col-span-6 sm:col-span-5" label={t.birthdate} value={pf.birthdate} onChange={(v: string) => setPf({ ...pf, birthdate: formatDateBR(v) })} placeholder="01/01/1990" />
                <Field className="col-span-6 sm:col-span-4" label={t.monthlyIncome} value={pf.monthly_income} onChange={(v: string) => setPf({ ...pf, monthly_income: v })} type="number" />
                <Field className="col-span-2 sm:col-span-2" label={t.ddd} value={pf.phone.ddd} onChange={(v: string) => setPf({ ...pf, phone: { ...pf.phone, ddd: v } })} placeholder="11" />
                <Field className="col-span-10 sm:col-span-6" label={t.phone} value={pf.phone.number} onChange={(v: string) => setPf({ ...pf, phone: { ...pf.phone, number: v } })} placeholder="999999999" />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <h4 className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-light">{t.address}</h4>
              <AddressBlock labels={addressLabels} value={pf.address} onChange={(v) => setPf({ ...pf, address: v })} />
            </div>

            {BankBlock}
          </TabsContent>

          {/* ── PJ ── */}
          <TabsContent value="corporation" className="flex flex-col gap-6 pt-4">
            <div className="flex flex-col gap-3">
              <h4 className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-light">{t.company}</h4>
              <div className="grid grid-cols-12 gap-3">
                <Field className="col-span-12 sm:col-span-7" label={t.companyName} value={pj.company_name} onChange={(v: string) => setPj({ ...pj, company_name: v })} />
                <Field className="col-span-12 sm:col-span-5" label={t.cnpj} value={pj.document} onChange={(v: string) => setPj({ ...pj, document: v })} placeholder="00.000.000/0000-00" />
                <Field className="col-span-12 sm:col-span-7" label={t.tradingName} value={pj.trading_name} onChange={(v: string) => setPj({ ...pj, trading_name: v })} />
                <Field className="col-span-6 sm:col-span-5" label={t.foundingDate} value={pj.founding_date} onChange={(v: string) => setPj({ ...pj, founding_date: formatDateBR(v) })} placeholder="01/01/2020" />
                <Field className="col-span-12 sm:col-span-4" label={t.annualRevenue} value={pj.annual_revenue} onChange={(v: string) => setPj({ ...pj, annual_revenue: v })} type="number" />
                <Field className="col-span-2" label={t.ddd} value={pj.phone.ddd} onChange={(v: string) => setPj({ ...pj, phone: { ...pj.phone, ddd: v } })} placeholder="11" />
                <Field className="col-span-10 sm:col-span-6" label={t.phone} value={pj.phone.number} onChange={(v: string) => setPj({ ...pj, phone: { ...pj.phone, number: v } })} />
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <h4 className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-light">{t.address}</h4>
              <AddressBlock labels={addressLabels} value={pj.address} onChange={(v) => setPj({ ...pj, address: v })} />
            </div>

            <div className="flex flex-col gap-3 border-t border-border pt-5">
              <h4 className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-light">{t.partner}</h4>
              <div className="grid grid-cols-12 gap-3">
                <Field className="col-span-6 sm:col-span-5" label={t.birthdate} value={pj.partner.birthdate} onChange={(v: string) => setPj({ ...pj, partner: { ...pj.partner, birthdate: formatDateBR(v) } })} placeholder="01/01/1990" />
                <Field className="col-span-12 sm:col-span-5" label={t.cpf} value={pj.partner.document} onChange={(v: string) => setPj({ ...pj, partner: { ...pj.partner, document: v } })} />
                <Field className="col-span-12 sm:col-span-7" label={t.motherName} value={pj.partner.mother_name} onChange={(v: string) => setPj({ ...pj, partner: { ...pj.partner, mother_name: v } })} />
                <Field className="col-span-6 sm:col-span-5" label={t.birthdate} value={pj.partner.birthdate} onChange={(v: string) => setPj({ ...pj, partner: { ...pj.partner, birthdate: v } })} placeholder="01/01/1990" />
                <Field className="col-span-6 sm:col-span-4" label={t.monthlyIncome} value={pj.partner.monthly_income} onChange={(v: string) => setPj({ ...pj, partner: { ...pj.partner, monthly_income: v } })} type="number" />
                <Field className="col-span-12 sm:col-span-8" label={t.email} value={pj.partner.email} onChange={(v: string) => setPj({ ...pj, partner: { ...pj.partner, email: v } })} type="email" />
                <Field className="col-span-2" label={t.ddd} value={pj.partner.phone.ddd} onChange={(v: string) => setPj({ ...pj, partner: { ...pj.partner, phone: { ...pj.partner.phone, ddd: v } } })} />
                <Field className="col-span-10 sm:col-span-6" label={t.phone} value={pj.partner.phone.number} onChange={(v: string) => setPj({ ...pj, partner: { ...pj.partner, phone: { ...pj.partner.phone, number: v } } })} />
              </div>
              <AddressBlock labels={addressLabels} value={pj.partner.address} onChange={(v) => setPj({ ...pj, partner: { ...pj.partner, address: v } })} />
            </div>

            {BankBlock}
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-between gap-4 pt-4 border-t border-border">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground tracking-wider uppercase">
            <ShieldCheck className="h-3 w-3" />
            {t.secure}
          </div>
          <Button onClick={submit} disabled={submitting} className="min-w-[180px]">
            {submitting ? <><Loader2 className="h-3 w-3 mr-2 animate-spin" />{t.saving}</> : t.save}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
