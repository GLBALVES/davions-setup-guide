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
