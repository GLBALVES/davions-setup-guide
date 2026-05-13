import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, XCircle, Copy, ExternalLink, CreditCard } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

type Settings = {
  id: string;
  pagarme_master_recipient_id: string | null;
  davions_commission_percent: number;
  charge_processing_fee: boolean;
};

type SecretsStatus = {
  hasApiKey: boolean;
  hasPublicKey: boolean;
  hasWebhookSecret: boolean;
  hasStripeSecretKey: boolean;
  hasStripeWebhookSecret: boolean;
  hasStripeClientId: boolean;
  hasStripePublishableKey: boolean;
};

const PROJECT_REF = "pjcegphrngpedujeatrl";
const FN_BASE = `https://${PROJECT_REF}.functions.supabase.co`;

export default function AdminPayments() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [secrets, setSecrets] = useState<SecretsStatus | null>(null);
  const [recipientInput, setRecipientInput] = useState("");
  const [commissionInput, setCommissionInput] = useState("5");
  const [chargeProcessingFee, setChargeProcessingFee] = useState(true);
  const [testResult, setTestResult] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: s }, { data: secData }] = await Promise.all([
      (supabase as any).from("app_payment_settings").select("*").maybeSingle(),
      supabase.functions.invoke("admin-check-pagarme-secrets"),
    ]);
    if (s) {
      setSettings(s);
      setRecipientInput(s.pagarme_master_recipient_id ?? "");
      setCommissionInput(String(s.davions_commission_percent ?? 5));
      setChargeProcessingFee(s.charge_processing_fee ?? true);
    }
    if (secData) setSecrets(secData as SecretsStatus);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    const pct = Math.max(0, Math.min(30, Number(commissionInput) || 0));
    const { error } = await (supabase as any)
      .from("app_payment_settings")
      .update({
        pagarme_master_recipient_id: recipientInput.trim() || null,
        davions_commission_percent: pct,
        charge_processing_fee: chargeProcessingFee,
      })
      .eq("id", settings.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Configurações salvas");
    load();
  };

  const testRecipient = async () => {
    if (!recipientInput.trim()) { toast.error("Informe o Recipient ID"); return; }
    setTesting(true);
    setTestResult(null);
    const { data, error } = await supabase.functions.invoke("admin-test-pagarme-recipient", {
      body: { recipientId: recipientInput.trim() },
    });
    setTesting(false);
    if (error) { toast.error(error.message); return; }
    setTestResult(data);
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado");
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="animate-spin text-muted-foreground" size={18} />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto p-8 space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <CreditCard className="text-muted-foreground" size={18} />
          <h1 className="text-xl font-light tracking-wide">Pagamentos</h1>
        </div>
        <p className="text-xs text-muted-foreground -mt-4">
          Configurações dos provedores de pagamento usados pela plataforma.
        </p>

        <Tabs defaultValue="pagarme">
          <TabsList>
            <TabsTrigger value="pagarme">Pagar.me (Brasil)</TabsTrigger>
            <TabsTrigger value="stripe">Stripe (Global)</TabsTrigger>
            <TabsTrigger value="commission">Comissão & Split</TabsTrigger>
          </TabsList>

          {/* PAGAR.ME */}
          <TabsContent value="pagarme" className="space-y-4 mt-6">
            <Card title="Conta Master Davions" desc="Recipient que recebe a comissão da Davions em todas as transações brasileiras.">
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Master Recipient ID</Label>
                  <Input
                    value={recipientInput}
                    onChange={(e) => setRecipientInput(e.target.value)}
                    placeholder="rp_xxxxxxxxxxxxxxxx"
                    className="mt-1 font-mono text-xs"
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={testRecipient} disabled={testing}>
                    {testing && <Loader2 className="animate-spin mr-2" size={12} />}
                    Testar conexão
                  </Button>
                </div>
                {testResult && (
                  <div className="border border-border rounded-md p-3 text-xs space-y-1 bg-muted/30">
                    {testResult.ok ? (
                      <>
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle2 size={14} /> Recipient encontrado
                        </div>
                        <div><span className="text-muted-foreground">Status:</span> {testResult.status}</div>
                        {testResult.name && <div><span className="text-muted-foreground">Nome:</span> {testResult.name}</div>}
                        {testResult.balance && (
                          <div>
                            <span className="text-muted-foreground">Saldo disponível:</span>{" "}
                            R$ {((testResult.balance.available_amount ?? 0) / 100).toFixed(2)}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center gap-2 text-destructive">
                        <XCircle size={14} /> {testResult.raw?.message || "Falha ao buscar recipient"}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>

            <Card title="Credenciais de API" desc="Os valores são gerenciados pelo Lovable Cloud. Aqui mostramos apenas se cada chave está configurada.">
              <div className="space-y-2">
                <SecretRow label="PAGARME_API_KEY" ok={secrets?.hasApiKey} />
                <SecretRow label="PAGARME_PUBLIC_KEY" ok={secrets?.hasPublicKey} />
                <SecretRow label="PAGARME_WEBHOOK_SECRET" ok={secrets?.hasWebhookSecret} />
                <p className="text-[11px] text-muted-foreground pt-2">
                  Para atualizar, vá em Lovable Cloud → Secrets.
                </p>
              </div>
            </Card>

            <Card title="Webhook URL" desc="Cole esta URL nas configurações de webhooks do Pagar.me.">
              <UrlRow url={`${FN_BASE}/pagarme-webhook`} onCopy={copy} />
            </Card>
          </TabsContent>

          {/* STRIPE */}
          <TabsContent value="stripe" className="space-y-4 mt-6">
            <Card title="Credenciais Stripe" desc="Status das chaves Stripe usadas para assinaturas e pagamentos US/MX.">
              <div className="space-y-2">
                <SecretRow label="STRIPE_SECRET_KEY" ok={secrets?.hasStripeSecretKey} />
                <SecretRow label="STRIPE_PUBLISHABLE_KEY" ok={secrets?.hasStripePublishableKey} />
                <SecretRow label="STRIPE_WEBHOOK_SECRET" ok={secrets?.hasStripeWebhookSecret} />
                <SecretRow label="STRIPE_CLIENT_ID" ok={secrets?.hasStripeClientId} />
              </div>
            </Card>

            <Card title="Stripe Connect" desc="Painel para gerenciar as contas conectadas dos fotógrafos US/MX.">
              <a
                href="https://dashboard.stripe.com/connect/accounts/overview"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-xs text-primary hover:underline"
              >
                Abrir Stripe Dashboard <ExternalLink size={12} />
              </a>
            </Card>

            <Card title="Webhook URL" desc="Webhook do Stripe usado para confirmar bookings e pagamentos.">
              <UrlRow url={`${FN_BASE}/session-booking-webhook`} onCopy={copy} />
            </Card>
          </TabsContent>

          {/* COMMISSION */}
          <TabsContent value="commission" className="space-y-4 mt-6">
            <Card title="Comissão Davions (Brasil)" desc="Percentual da Davions sobre cada pagamento de cliente final via Pagar.me.">
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={0}
                  max={30}
                  step={0.5}
                  value={commissionInput}
                  onChange={(e) => setCommissionInput(e.target.value)}
                  className="w-28 text-sm"
                />
                <span className="text-sm">%</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                Valor entre 0 e 30%. Aplicado em todos os pagamentos via Pagar.me com split.
              </p>
            </Card>

            <Card title="Taxa de processamento" desc="Quem arca com a taxa de processamento Pagar.me dentro do split.">
              <div className="flex items-center justify-between">
                <span className="text-xs">Davions arca com a taxa do Pagar.me</span>
                <Switch checked={chargeProcessingFee} onCheckedChange={setChargeProcessingFee} />
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                Quando ligado, a taxa do Pagar.me é descontada da parcela da Davions, não da do fotógrafo.
              </p>
            </Card>

            <Card title="Comissão US/MX (Stripe Connect)" desc="Configurada por plano via application_fee em cada cobrança.">
              <p className="text-xs text-muted-foreground">
                Para alterar a comissão de pagamentos US/MX, edite os planos correspondentes.
              </p>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="sticky bottom-0 bg-background border-t border-border pt-4 -mx-8 px-8 flex justify-end">
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="animate-spin mr-2" size={14} />}
            Salvar configurações
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}

function Card({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="border border-border rounded-lg p-5 bg-background">
      <h3 className="text-sm font-medium">{title}</h3>
      {desc && <p className="text-[11px] text-muted-foreground mt-0.5 mb-3">{desc}</p>}
      <div className={desc ? "" : "mt-3"}>{children}</div>
    </div>
  );
}

function SecretRow({ label, ok }: { label: string; ok?: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs py-1.5 border-b border-border/50 last:border-0">
      <code className="font-mono text-[11px]">{label}</code>
      {ok ? (
        <span className="flex items-center gap-1 text-green-600">
          <CheckCircle2 size={12} /> Configurada
        </span>
      ) : (
        <span className="flex items-center gap-1 text-destructive">
          <XCircle size={12} /> Não configurada
        </span>
      )}
    </div>
  );
}

function UrlRow({ url, onCopy }: { url: string; onCopy: (s: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <code className="flex-1 text-[11px] font-mono bg-muted/50 px-3 py-2 rounded border border-border break-all">
        {url}
      </code>
      <Button size="sm" variant="outline" onClick={() => onCopy(url)}>
        <Copy size={12} />
      </Button>
    </div>
  );
}
