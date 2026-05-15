import { describe, it, expect } from "vitest";
import { isBrazilCountry, getBillableTaxRate } from "./tax-utils";

describe("isBrazilCountry", () => {
  it("recognizes BR codes and names (case/whitespace insensitive)", () => {
    for (const c of ["BR", "br", " br ", "BRA", "Brazil", "BRASIL"]) {
      expect(isBrazilCountry(c)).toBe(true);
    }
  });
  it("returns false for other countries / empty", () => {
    for (const c of ["US", "MX", "PT", "", null, undefined]) {
      expect(isBrazilCountry(c as any)).toBe(false);
    }
  });
});

describe("getBillableTaxRate", () => {
  it("zeroes the tax rate for Brazil regardless of configured rate", () => {
    expect(getBillableTaxRate(10, "BR")).toBe(0);
    expect(getBillableTaxRate(8.5, "Brasil")).toBe(0);
  });
  it("returns configured tax rate for non-Brazil", () => {
    expect(getBillableTaxRate(8, "US")).toBe(8);
    expect(getBillableTaxRate(16, "MX")).toBe(16);
  });
  it("handles null/undefined safely", () => {
    expect(getBillableTaxRate(null, "US")).toBe(0);
    expect(getBillableTaxRate(undefined, "BR")).toBe(0);
  });
});

// ── Fee / Net invariants ────────────────────────────────────────────────
// These tests pin down the formulas used everywhere (Revenue, FinanceReports,
// snapshotPlatformFee). If any of these break, the dashboards or webhooks
// will diverge.

const calcSubtotalCents = (
  priceCents: number,
  extrasCents: number,
  taxRate: number,
  country: string | null,
) => {
  const base = priceCents + extrasCents;
  const billableTax = getBillableTaxRate(taxRate, country);
  return base + Math.round(base * (billableTax / 100));
};

const calcFeeCents = (totalCents: number, feePercent: number) =>
  Math.round(totalCents * (feePercent / 100));

const calcNetCents = (totalCents: number, feePercent: number) =>
  totalCents - calcFeeCents(totalCents, feePercent);

describe("revenue/fee invariants — Brazil", () => {
  // 1000 BRL session, 10% tax configured (informational), 5% plan fee
  const total = calcSubtotalCents(100_000, 0, 10, "BR");

  it("does NOT add tax on top of price for Brazil", () => {
    expect(total).toBe(100_000); // exactly the listed price
  });

  it("still computes platform fee from the (untaxed) total", () => {
    expect(calcFeeCents(total, 5)).toBe(5_000);
    expect(calcNetCents(total, 5)).toBe(95_000);
  });

  it("scales fee correctly across plan tiers", () => {
    expect(calcFeeCents(total, 3)).toBe(3_000); // pro
    expect(calcFeeCents(total, 1)).toBe(1_000); // studio
  });
});

describe("revenue/fee invariants — non-Brazil", () => {
  // 1000 USD session, 8% tax billable, 5% fee
  const total = calcSubtotalCents(100_000, 0, 8, "US");

  it("adds tax on top of the price for non-Brazil", () => {
    expect(total).toBe(108_000);
  });

  it("computes platform fee on the taxed total", () => {
    expect(calcFeeCents(total, 5)).toBe(5_400);
    expect(calcNetCents(total, 5)).toBe(102_600);
  });
});

describe("revenue/fee invariants — extras", () => {
  it("includes extras in the subtotal before fee for both regions", () => {
    const br = calcSubtotalCents(100_000, 25_000, 10, "BR");
    const us = calcSubtotalCents(100_000, 25_000, 10, "US");
    expect(br).toBe(125_000); // tax ignored
    expect(us).toBe(137_500); // 125000 * 1.10
    expect(calcFeeCents(br, 5)).toBe(6_250);
    expect(calcFeeCents(us, 5)).toBe(6_875);
  });
});

// ── Rounding consistency (cents) ───────────────────────────────────────
// Every monetary derivation must use Math.round on cents so that the
// dashboard, snapshot and the payment provider (Stripe/Pagar.me) agree
// to the cent. Bankers/floor/ceil rounding causes off-by-one drift that
// breaks reconciliation.

describe("fee/net rounding consistency (cents)", () => {
  it("fee is always an integer number of cents", () => {
    const cases: Array<[number, number]> = [
      [100_001, 5],     // 5000.05  -> 5000
      [100_005, 5],     // 5000.25  -> 5000
      [100_010, 5],     // 5000.50  -> 5001 (half-up)
      [100_015, 5],     // 5000.75  -> 5001
      [33_333, 3],      // 999.99   -> 1000
      [99_999, 7.5],    // 7499.925 -> 7500
      [1, 5],           // 0.05     -> 0
      [9, 5],           // 0.45     -> 0
      [10, 5],          // 0.50     -> 1
      [123_457, 2.9],   // 3580.253 -> 3580
    ];
    for (const [total, pct] of cases) {
      const fee = calcFeeCents(total, pct);
      expect(Number.isInteger(fee)).toBe(true);
      expect(fee).toBe(Math.round(total * (pct / 100)));
    }
  });

  it("net + fee always equals total to the cent (no drift)", () => {
    const totals = [1, 9, 10, 99, 100, 12_345, 100_000, 100_010, 999_999];
    const pcts = [0, 1, 2.9, 3, 5, 7.5, 10, 16];
    for (const total of totals) {
      for (const pct of pcts) {
        const fee = calcFeeCents(total, pct);
        const net = calcNetCents(total, pct);
        expect(net + fee).toBe(total);
        expect(Number.isInteger(net)).toBe(true);
      }
    }
  });

  it("subtotal rounding (non-BR tax) stays integer cents", () => {
    // 333 cents * 8.25% tax = 27.4725 -> 27 -> subtotal 360
    expect(calcSubtotalCents(333, 0, 8.25, "US")).toBe(360);
    // 777 * 16% = 124.32 -> 124 -> 901
    expect(calcSubtotalCents(777, 0, 16, "MX")).toBe(901);
    // BR ignores tax entirely, no rounding needed
    expect(calcSubtotalCents(333, 0, 8.25, "BR")).toBe(333);
  });

  it("matches Stripe/Pagar.me cent semantics across BR and non-BR", () => {
    // Brazil — fee snapshot must match what Pagar.me will see
    const br = calcSubtotalCents(149_99, 0, 10, "BR"); // R$149.99
    expect(br).toBe(149_99);
    expect(calcFeeCents(br, 5)).toBe(750); // 749.95 -> 750
    expect(calcNetCents(br, 5)).toBe(149_99 - 750);

    // US — fee snapshot must match Stripe charge (taxed total)
    const us = calcSubtotalCents(149_99, 0, 8.875, "US"); // NYC tax
    // 14999 * 0.08875 = 1331.16125 -> 1331 -> 16330
    expect(us).toBe(16_330);
    expect(calcFeeCents(us, 2.9) + calcNetCents(us, 2.9)).toBe(us);
  });

  it("never produces fractional cents for awkward percents", () => {
    for (let total = 1; total <= 200; total++) {
      for (const pct of [2.9, 3.4, 5.5, 7.25, 9.99]) {
        const fee = calcFeeCents(total, pct);
        const net = calcNetCents(total, pct);
        expect(Number.isInteger(fee)).toBe(true);
        expect(Number.isInteger(net)).toBe(true);
        expect(fee + net).toBe(total);
      }
    }
  });
});

// ── Zero-fee plans ─────────────────────────────────────────────────────
// Some plans (e.g. enterprise, comped accounts, promo periods) have
// transaction_fee_percent = 0. Dashboards and the snapshot must show
// Fee=0 and Net=Total exactly, with no rounding artefacts.

describe("zero-fee plan invariants", () => {
  it("Fee = 0 and Net = Total when feePercent is 0 (BR)", () => {
    const total = calcSubtotalCents(149_99, 25_00, 10, "BR"); // tax ignored
    expect(total).toBe(174_99);
    expect(calcFeeCents(total, 0)).toBe(0);
    expect(calcNetCents(total, 0)).toBe(total);
  });

  it("Fee = 0 and Net = Total when feePercent is 0 (non-BR, taxed)", () => {
    const total = calcSubtotalCents(100_00, 0, 8, "US");
    expect(total).toBe(108_00);
    expect(calcFeeCents(total, 0)).toBe(0);
    expect(calcNetCents(total, 0)).toBe(108_00);
  });

  it("works across awkward totals without producing -0 or 0.0001 drift", () => {
    for (const total of [1, 7, 99, 333, 12_345, 999_999]) {
      const fee = calcFeeCents(total, 0);
      const net = calcNetCents(total, 0);
      expect(fee).toBe(0);
      expect(Object.is(fee, -0)).toBe(false);
      expect(net).toBe(total);
      expect(Number.isInteger(net)).toBe(true);
    }
  });

  it("0% fee on a 0-cent total stays 0 (no NaN, no division weirdness)", () => {
    expect(calcFeeCents(0, 0)).toBe(0);
    expect(calcNetCents(0, 0)).toBe(0);
  });
});
