// Tests for the shared platform-fee snapshot helper used by both
// session-booking-webhook (Stripe) and pagarme-webhook to persist
// platform_fee_percent + platform_fee_amount on every paid booking.
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { snapshotPlatformFee } from "./platform-fee.ts";

type Row = Record<string, unknown> | null;

interface MockTable {
  selectRow?: Row;            // value returned by maybeSingle on select
  updates: Array<Record<string, unknown>>;
}

function makeSupabase(tables: Record<string, MockTable>) {
  const from = (name: string) => {
    const t = tables[name] ?? (tables[name] = { updates: [] });
    const builder: any = {
      _isSelect: false,
      _payload: null as Record<string, unknown> | null,
      select() { this._isSelect = true; return this; },
      update(payload: Record<string, unknown>) {
        this._isSelect = false;
        this._payload = payload;
        return this;
      },
      eq() { return this; },
      limit() { return this; },
      async maybeSingle() { return { data: t.selectRow ?? null, error: null }; },
      // Awaiting an update() chain ends here:
      then(resolve: (v: unknown) => void) {
        if (!this._isSelect && this._payload) {
          t.updates.push(this._payload);
        }
        resolve({ data: null, error: null });
      },
    };
    return builder;
  };
  return { from } as any;
}

Deno.test("snapshotPlatformFee — uses subscription plan rate", async () => {
  const tables: Record<string, MockTable> = {
    bookings: { selectRow: { photographer_id: "ph-1" }, updates: [] },
    app_payment_settings: { selectRow: { davions_commission_percent: 5 }, updates: [] },
    photographers: { selectRow: { plan_key: "pro", business_currency: "BRL" }, updates: [] },
    subscription_plans: { selectRow: { transaction_fee_percent: 3 }, updates: [] },
  };
  const supa = makeSupabase(tables);

  await snapshotPlatformFee(supa, "bk-1", 100_000); // R$ 1000.00

  assertEquals(tables.bookings.updates.length, 1);
  assertEquals(tables.bookings.updates[0], {
    platform_fee_percent: 3,
    platform_fee_amount: 3_000, // 3% of 100000 cents
  });
});

Deno.test("snapshotPlatformFee — falls back to PLAN_DEFAULT_FEE when no plan row", async () => {
  const tables: Record<string, MockTable> = {
    bookings: { selectRow: { photographer_id: "ph-1" }, updates: [] },
    app_payment_settings: { selectRow: null, updates: [] },
    photographers: { selectRow: { plan_key: "starter", business_currency: "USD" }, updates: [] },
    subscription_plans: { selectRow: null, updates: [] },
  };
  const supa = makeSupabase(tables);

  await snapshotPlatformFee(supa, "bk-2", 50_000);

  assertEquals(tables.bookings.updates[0], {
    platform_fee_percent: 5, // starter default
    platform_fee_amount: 2_500,
  });
});

Deno.test("snapshotPlatformFee — falls back to app_payment_settings when no plan_key", async () => {
  const tables: Record<string, MockTable> = {
    bookings: { selectRow: { photographer_id: "ph-1" }, updates: [] },
    app_payment_settings: { selectRow: { davions_commission_percent: 7 }, updates: [] },
    photographers: { selectRow: { plan_key: null, business_currency: "BRL" }, updates: [] },
    subscription_plans: { selectRow: null, updates: [] },
  };
  const supa = makeSupabase(tables);

  await snapshotPlatformFee(supa, "bk-3", 200_000);

  assertEquals(tables.bookings.updates[0], {
    platform_fee_percent: 7,
    platform_fee_amount: 14_000,
  });
});

Deno.test("snapshotPlatformFee — no-op when amount is 0 or invalid", async () => {
  const tables: Record<string, MockTable> = {
    bookings: { selectRow: { photographer_id: "ph-1" }, updates: [] },
    app_payment_settings: { selectRow: { davions_commission_percent: 5 }, updates: [] },
    photographers: { selectRow: { plan_key: "pro", business_currency: "BRL" }, updates: [] },
    subscription_plans: { selectRow: { transaction_fee_percent: 3 }, updates: [] },
  };
  const supa = makeSupabase(tables);

  await snapshotPlatformFee(supa, "bk-4", 0);
  await snapshotPlatformFee(supa, "bk-4", Number.NaN);
  await snapshotPlatformFee(supa, "", 100_000);

  assertEquals(tables.bookings.updates.length, 0);
});

Deno.test("snapshotPlatformFee — balance_due recomputes against cumulative total", async () => {
  // Webhook contract: for balance_due payments, callers pass
  // (deposit_paid + balance_paid) so the fee snapshot reflects the full sale.
  const tables: Record<string, MockTable> = {
    bookings: { selectRow: { photographer_id: "ph-1" }, updates: [] },
    app_payment_settings: { selectRow: { davions_commission_percent: 5 }, updates: [] },
    photographers: { selectRow: { plan_key: "pro", business_currency: "BRL" }, updates: [] },
    subscription_plans: { selectRow: { transaction_fee_percent: 3 }, updates: [] },
  };
  const supa = makeSupabase(tables);

  // 1) deposit captured: R$ 200.00
  await snapshotPlatformFee(supa, "bk-5", 20_000);
  // 2) balance captured later: cumulative total now R$ 1000.00
  await snapshotPlatformFee(supa, "bk-5", 100_000);

  assertEquals(tables.bookings.updates.length, 2);
  assertEquals(tables.bookings.updates[0], {
    platform_fee_percent: 3,
    platform_fee_amount: 600,
  });
  assertEquals(tables.bookings.updates[1], {
    platform_fee_percent: 3,
    platform_fee_amount: 3_000,
  });
});

Deno.test("snapshotPlatformFee — bails out gracefully when booking is missing", async () => {
  const tables: Record<string, MockTable> = {
    bookings: { selectRow: null, updates: [] },
    app_payment_settings: { selectRow: { davions_commission_percent: 5 }, updates: [] },
    photographers: { selectRow: null, updates: [] },
    subscription_plans: { selectRow: null, updates: [] },
  };
  const supa = makeSupabase(tables);

  await snapshotPlatformFee(supa, "missing", 100_000);

  assertEquals(tables.bookings.updates.length, 0);
});
