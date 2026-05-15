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

// ── Plan × currency matrix ─────────────────────────────────────────────
// The fee snapshot must pick the correct subscription_plans row by
// (plan_key, currency). A photographer billed in USD on the "pro" plan
// must NOT inherit the BRL "pro" rate, and once snapshotted the rate
// of THAT payment is preserved even if the plan rate later changes.

interface PlanRow { plan_key: string; currency: string; transaction_fee_percent: number }

function makeSupabaseWithPlans(opts: {
  photographer: { plan_key: string | null; business_currency: string };
  plans: PlanRow[];
  settings?: { davions_commission_percent: number } | null;
}) {
  const updates: Array<Record<string, unknown>> = [];
  const from = (name: string) => {
    const filters: Record<string, unknown> = {};
    const builder: any = {
      _isSelect: false,
      _payload: null as Record<string, unknown> | null,
      select() { this._isSelect = true; return this; },
      update(p: Record<string, unknown>) { this._payload = p; return this; },
      eq(col: string, val: unknown) { filters[col] = val; return this; },
      limit() { return this; },
      async maybeSingle() {
        if (name === "bookings") return { data: { photographer_id: "ph-1" }, error: null };
        if (name === "app_payment_settings") return { data: opts.settings ?? null, error: null };
        if (name === "photographers") return { data: opts.photographer, error: null };
        if (name === "subscription_plans") {
          const match = opts.plans.find(
            (p) => p.plan_key === filters.plan_key && p.currency === filters.currency,
          );
          return { data: match ?? null, error: null };
        }
        return { data: null, error: null };
      },
      then(resolve: (v: unknown) => void) {
        if (name === "bookings" && this._payload) updates.push(this._payload);
        resolve({ data: null, error: null });
      },
    };
    return builder;
  };
  return { client: { from } as any, updates };
}

const PLANS: PlanRow[] = [
  { plan_key: "starter", currency: "BRL", transaction_fee_percent: 5 },
  { plan_key: "pro",     currency: "BRL", transaction_fee_percent: 3 },
  { plan_key: "studio",  currency: "BRL", transaction_fee_percent: 1 },
  { plan_key: "starter", currency: "USD", transaction_fee_percent: 6 },
  { plan_key: "pro",     currency: "USD", transaction_fee_percent: 4 },
  { plan_key: "studio",  currency: "USD", transaction_fee_percent: 2 },
  { plan_key: "starter", currency: "MXN", transaction_fee_percent: 7 },
  { plan_key: "pro",     currency: "MXN", transaction_fee_percent: 4.5 },
  { plan_key: "studio",  currency: "MXN", transaction_fee_percent: 2.5 },
];

Deno.test("snapshotPlatformFee — picks plan rate by (plan_key, currency) for BRL/USD/MXN", async () => {
  const cases: Array<{ plan: string; currency: string; expectedPct: number }> = [
    { plan: "starter", currency: "BRL", expectedPct: 5 },
    { plan: "pro",     currency: "BRL", expectedPct: 3 },
    { plan: "studio",  currency: "BRL", expectedPct: 1 },
    { plan: "starter", currency: "USD", expectedPct: 6 },
    { plan: "pro",     currency: "USD", expectedPct: 4 },
    { plan: "studio",  currency: "USD", expectedPct: 2 },
    { plan: "starter", currency: "MXN", expectedPct: 7 },
    { plan: "pro",     currency: "MXN", expectedPct: 4.5 },
    { plan: "studio",  currency: "MXN", expectedPct: 2.5 },
  ];

  for (const c of cases) {
    const { client, updates } = makeSupabaseWithPlans({
      photographer: { plan_key: c.plan, business_currency: c.currency },
      plans: PLANS,
      settings: { davions_commission_percent: 99 }, // must NOT be used
    });
    await snapshotPlatformFee(client, "bk", 100_000);
    assertEquals(
      updates[0],
      {
        platform_fee_percent: c.expectedPct,
        platform_fee_amount: Math.round(100_000 * (c.expectedPct / 100)),
      },
      `plan=${c.plan} currency=${c.currency}`,
    );
  }
});

Deno.test("snapshotPlatformFee — same plan_key resolves different fee per currency", async () => {
  // BRL pro = 3%, USD pro = 4%, MXN pro = 4.5%
  const brl = makeSupabaseWithPlans({
    photographer: { plan_key: "pro", business_currency: "BRL" }, plans: PLANS,
  });
  const usd = makeSupabaseWithPlans({
    photographer: { plan_key: "pro", business_currency: "USD" }, plans: PLANS,
  });
  const mxn = makeSupabaseWithPlans({
    photographer: { plan_key: "pro", business_currency: "MXN" }, plans: PLANS,
  });

  await snapshotPlatformFee(brl.client, "bk", 100_000);
  await snapshotPlatformFee(usd.client, "bk", 100_000);
  await snapshotPlatformFee(mxn.client, "bk", 100_000);

  assertEquals(brl.updates[0].platform_fee_percent, 3);
  assertEquals(usd.updates[0].platform_fee_percent, 4);
  assertEquals(mxn.updates[0].platform_fee_percent, 4.5);
  assertEquals(brl.updates[0].platform_fee_amount, 3_000);
  assertEquals(usd.updates[0].platform_fee_amount, 4_000);
  assertEquals(mxn.updates[0].platform_fee_amount, 4_500);
});

Deno.test("snapshotPlatformFee — falls back to PLAN_DEFAULT_FEE when (plan, currency) row missing", async () => {
  // Photographer is on "pro" but only BRL plans exist; he is on USD.
  const onlyBRL = PLANS.filter((p) => p.currency === "BRL");
  const { client, updates } = makeSupabaseWithPlans({
    photographer: { plan_key: "pro", business_currency: "USD" },
    plans: onlyBRL,
    settings: { davions_commission_percent: 9 },
  });
  await snapshotPlatformFee(client, "bk", 100_000);
  // PLAN_DEFAULT_FEE.pro === 3, NOT app_payment_settings (9) nor BRL pro (3 — same value but via different path)
  assertEquals(updates[0].platform_fee_percent, 3);
  assertEquals(updates[0].platform_fee_amount, 3_000);
});

Deno.test("snapshotPlatformFee — preserves the fee of THAT payment (no later override)", async () => {
  // First payment under pro/BRL = 3%. Plan rate later changes to 8%.
  // The first snapshot row must remain 3% / 3000; the second uses 8%.
  const state = {
    photographer: { plan_key: "pro", business_currency: "BRL" } as { plan_key: string | null; business_currency: string },
    plans: PLANS,
  };
  const first = makeSupabaseWithPlans(state);
  await snapshotPlatformFee(first.client, "bk", 100_000);
  assertEquals(first.updates[0], { platform_fee_percent: 3, platform_fee_amount: 3_000 });

  const newPlans: PlanRow[] = PLANS.map((p) =>
    p.plan_key === "pro" && p.currency === "BRL" ? { ...p, transaction_fee_percent: 8 } : p,
  );
  const second = makeSupabaseWithPlans({ ...state, plans: newPlans });
  await snapshotPlatformFee(second.client, "bk2", 100_000);
  assertEquals(second.updates[0], { platform_fee_percent: 8, platform_fee_amount: 8_000 });

  // The first snapshot is independent and untouched (it's a different mock client).
  assertEquals(first.updates.length, 1);
  assertEquals(first.updates[0].platform_fee_percent, 3);
});

Deno.test("snapshotPlatformFee — defaults business_currency to BRL when null", async () => {
  const { client, updates } = makeSupabaseWithPlans({
    photographer: { plan_key: "studio", business_currency: "" },
    plans: PLANS,
  });
  await snapshotPlatformFee(client, "bk", 100_000);
  // empty currency -> defaulted to BRL -> studio/BRL = 1%
  assertEquals(updates[0].platform_fee_percent, 1);
  assertEquals(updates[0].platform_fee_amount, 1_000);
});

// ── Zero-fee plans ─────────────────────────────────────────────────────
// When the resolved plan rate is 0 (enterprise / comped / promo), the
// snapshot must persist platform_fee_percent: 0 and platform_fee_amount: 0
// so that Net = Total in the dashboards.

Deno.test("snapshotPlatformFee — persists 0/0 when subscription_plans rate is 0", async () => {
  const zeroPlans: PlanRow[] = [{ plan_key: "enterprise", currency: "BRL", transaction_fee_percent: 0 }];
  const { client, updates } = makeSupabaseWithPlans({
    photographer: { plan_key: "enterprise", business_currency: "BRL" },
    plans: zeroPlans,
    settings: { davions_commission_percent: 7 }, // must NOT leak through
  });
  await snapshotPlatformFee(client, "bk", 100_000);
  assertEquals(updates.length, 1);
  assertEquals(updates[0], { platform_fee_percent: 0, platform_fee_amount: 0 });
});

Deno.test("snapshotPlatformFee — persists 0/0 when app_payment_settings is 0 and no plan_key", async () => {
  const { client, updates } = makeSupabaseWithPlans({
    photographer: { plan_key: null, business_currency: "BRL" },
    plans: [],
    settings: { davions_commission_percent: 0 },
  });
  await snapshotPlatformFee(client, "bk", 250_000);
  assertEquals(updates[0], { platform_fee_percent: 0, platform_fee_amount: 0 });
});

Deno.test("snapshotPlatformFee — 0% across BRL/USD/MXN keeps Net = Total", async () => {
  for (const currency of ["BRL", "USD", "MXN"]) {
    const { client, updates } = makeSupabaseWithPlans({
      photographer: { plan_key: "enterprise", business_currency: currency },
      plans: [{ plan_key: "enterprise", currency, transaction_fee_percent: 0 }],
    });
    const total = 137_53; // awkward odd cents
    await snapshotPlatformFee(client, "bk", total);
    assertEquals(updates[0].platform_fee_percent, 0, currency);
    assertEquals(updates[0].platform_fee_amount, 0, currency);
    // Net = Total - Fee = total
    assertEquals(total - (updates[0].platform_fee_amount as number), total);
  }
});
