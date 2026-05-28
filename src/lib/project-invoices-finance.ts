// Helpers to merge project_invoices into the finance pages.
// project_invoices.amount/paid_amount are stored in MAJOR units (e.g. 350.00).
// The finance pages work in CENTS. All amounts returned here are in CENTS.

import { supabase } from "@/integrations/supabase/client";

export interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  fee: number;
}

export interface PaidInvoice {
  id: string;
  project_id: string | null;
  description: string | null;
  paid_cents: number;
  paid_at: string; // ISO
  client_name: string | null;
  client_email: string | null;
  items: InvoiceItem[];
}


export interface OutstandingInvoice {
  id: string;
  project_id: string | null;
  description: string | null;
  amount_cents: number;
  paid_cents: number;
  balance_cents: number;
  status: string; // pending | partial
  due_date: string | null;
  created_at: string;
  client_name: string | null;
  client_email: string | null;
}

export async function fetchInvoiceFinance(photographerId: string): Promise<{
  paid: PaidInvoice[];
  outstanding: OutstandingInvoice[];
  for (const inv of (data ?? []) as any[]) {
    const amount_cents = Math.round(Number(inv.amount ?? 0) * 100);
    const paid_cents = Math.round(Number(inv.paid_amount ?? 0) * 100);
    const cp = inv.client_projects as { client_name?: string; client_email?: string } | null;
    const client_name = cp?.client_name ?? null;
    const client_email = cp?.client_email ?? null;
    const rawItems = Array.isArray(inv.items) ? inv.items : [];
    const items: InvoiceItem[] = rawItems.map((it: any) => ({
      description: String(it?.description ?? ""),
      quantity: Number(it?.quantity ?? 0),
      unit_price: Number(it?.unit_price ?? 0),
      fee: Number(it?.fee ?? 0),
    }));

    if (paid_cents > 0 && inv.paid_at) {
      paid.push({
        id: inv.id,
        project_id: inv.project_id ?? null,
        description: inv.description ?? null,
        paid_cents,
        paid_at: inv.paid_at,
        client_name,
        client_email,
        items,
      });
    }

    }
    if (inv.status === "pending" || inv.status === "partial") {
      outstanding.push({
        id: inv.id,
        project_id: inv.project_id ?? null,
        description: inv.description ?? null,
        amount_cents,
        paid_cents,
        balance_cents: Math.max(0, amount_cents - paid_cents),
        status: inv.status,
        due_date: inv.due_date ?? null,
        created_at: inv.created_at,
        client_name,
        client_email,
      });
    }
  }

  return { paid, outstanding };
}

export function sumPaidByMonth(paid: PaidInvoice[], monthStr: string): number {
  return paid
    .filter((p) => (p.paid_at ?? "").startsWith(monthStr))
    .reduce((s, p) => s + p.paid_cents, 0);
}

export function sumOutstandingByMonth(items: OutstandingInvoice[], monthStr: string): number {
  return items
    .filter((p) => (p.due_date || p.created_at).startsWith(monthStr))
    .reduce((s, p) => s + p.balance_cents, 0);
}
