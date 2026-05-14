import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Package, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

type Plan = {
  id: string;
  plan_key: string;
  currency: string;
  price_id: string;
  amount: number;
  display: string;
  transaction_fee_percent: number;
  sort_order: number;
  is_active: boolean;
};

const PLAN_TIERS = ["starter", "pro", "studio"] as const;
const CURRENCIES = ["USD", "BRL", "MXN"] as const;

export default function AdminPlans() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("subscription_plans")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) toast.error(error.message);
    else setPlans(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const update = (id: string, patch: Partial<Plan>) => {
    setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const saveAll = async () => {
    setSaving(true);
    const updates = plans.map((p) =>
      (supabase as any)
        .from("subscription_plans")
        .update({
          price_id: p.price_id,
          amount: Number(p.amount),
          display: p.display,
          transaction_fee_percent: Math.max(0, Math.min(100, Number(p.transaction_fee_percent))),
          is_active: p.is_active,
        })
        .eq("id", p.id)
    );
    const results = await Promise.all(updates);
    setSaving(false);
    const failed = results.find((r: any) => r.error);
    if (failed) { toast.error((failed as any).error.message); return; }
    toast.success("Planos atualizados");
    load();
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
      <div className="max-w-5xl mx-auto p-8 space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <Package className="text-muted-foreground" size={18} />
          <h1 className="text-xl font-light tracking-wide">Planos de Assinatura</h1>
        </div>
        <p className="text-xs text-muted-foreground -mt-4">
          Gerencie os preços e a taxa cobrada por operação (split) para cada plano e moeda.
        </p>

        <Tabs defaultValue={PLAN_TIERS[0]}>
          <TabsList>
            {PLAN_TIERS.map((t) => (
              <TabsTrigger key={t} value={t} className="capitalize">{t}</TabsTrigger>
            ))}
          </TabsList>

          {PLAN_TIERS.map((tier) => (
            <TabsContent key={tier} value={tier} className="space-y-4 mt-6">
              {CURRENCIES.map((cur) => {
                const plan = plans.find((p) => p.plan_key === tier && p.currency === cur);
                if (!plan) return null;
                return (
                  <div key={plan.id} className="border border-border rounded-lg p-5 bg-background space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium uppercase tracking-wider">{cur}</span>
                        <span className="text-[11px] text-muted-foreground">{plan.display}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-muted-foreground">Ativo</span>
                        <Switch
                          checked={plan.is_active}
                          onCheckedChange={(v) => update(plan.id, { is_active: v })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <Label className="text-[11px]">Stripe Price ID</Label>
                        <Input
                          value={plan.price_id}
                          onChange={(e) => update(plan.id, { price_id: e.target.value })}
                          className="mt-1 font-mono text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px]">Valor</Label>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={plan.amount}
                          onChange={(e) => update(plan.id, { amount: Number(e.target.value) })}
                          className="mt-1 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px]">Display</Label>
                        <Input
                          value={plan.display}
                          onChange={(e) => update(plan.id, { display: e.target.value })}
                          className="mt-1 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px]">Taxa por operação (%)</Label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step="0.1"
                          value={plan.transaction_fee_percent}
                          onChange={(e) => update(plan.id, { transaction_fee_percent: Number(e.target.value) })}
                          className="mt-1 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </TabsContent>
          ))}
        </Tabs>

        <div className="sticky bottom-0 bg-background border-t border-border pt-4 -mx-8 px-8 flex justify-end">
          <Button onClick={saveAll} disabled={saving}>
            {saving ? <Loader2 className="animate-spin mr-2" size={14} /> : <Save className="mr-2" size={14} />}
            Salvar alterações
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
