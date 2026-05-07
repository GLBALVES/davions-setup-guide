/**
 * Currency input formatting helpers (locale-aware).
 *
 * Internal/canonical representation: "1500.50" (dot decimal, no thousand separator).
 * Display representation:
 *   - en      → "1,500.50"
 *   - pt / es → "1.500,50"
 *
 * Use `formatCurrencyInput` to render a state value in an <input>,
 * and `parseCurrencyInput` on the input's onChange to convert back to canonical.
 *
 * `displayMoney` formats a number for read-only previews (no $ sign).
 */

export type CurrencyLang = "en" | "pt" | "es";

const isCommaDecimal = (lang: CurrencyLang) => lang !== "en";

/**
 * Format a canonical/raw string for display in an input.
 * Tolerant of values that already include separators (re-normalizes).
 */
export function formatCurrencyInput(raw: string | number | null | undefined, lang: CurrencyLang): string {
  if (raw === null || raw === undefined) return "";
  let s = String(raw);
  if (s === "") return "";

  const decimalChar = isCommaDecimal(lang) ? "," : ".";
  const thousandChar = isCommaDecimal(lang) ? "." : ",";

  // Normalize: keep digits and any decimal/thousand chars, then collapse to a single decimal.
  // Strategy: strip thousand char, then convert the locale decimal char (if any) to "."
  s = s.replace(/\s/g, "");

  if (isCommaDecimal(lang)) {
    // PT/ES: dot is thousand, comma is decimal.
    // Remove dots used as thousand separators, swap commas to dot for parsing.
    s = s.replace(/\./g, "").replace(/,/g, ".");
  } else {
    // EN: comma is thousand, dot is decimal.
    s = s.replace(/,/g, "");
  }

  // Strip any non-digit/non-dot chars (e.g. accidental letters)
  s = s.replace(/[^0-9.]/g, "");

  // Ensure only one decimal point — keep the first
  const firstDot = s.indexOf(".");
  if (firstDot !== -1) {
    s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, "");
  }

  // Detect the user's intent (trailing decimal separator) to preserve it
  const trailingDecimal = s.endsWith(".");
  const [intPartRaw, decPartRaw = ""] = s.split(".");

  // Cap to 2 decimals
  const decPart = decPartRaw.slice(0, 2);

  // Strip leading zeros from int part but keep at least one digit
  const intPart = intPartRaw.replace(/^0+(?=\d)/, "");

  // Add thousand separators
  const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandChar);

  if (decPart.length > 0) {
    return `${intFormatted || "0"}${decimalChar}${decPart}`;
  }
  if (trailingDecimal) {
    return `${intFormatted || "0"}${decimalChar}`;
  }
  return intFormatted;
}

/**
 * Parse a (possibly user-typed) display string back to canonical "1500.50" form.
 * Empty input returns "".
 */
export function parseCurrencyInput(formatted: string, lang: CurrencyLang): string {
  if (!formatted) return "";
  let s = String(formatted).replace(/\s/g, "");

  if (isCommaDecimal(lang)) {
    s = s.replace(/\./g, "").replace(/,/g, ".");
  } else {
    s = s.replace(/,/g, "");
  }

  s = s.replace(/[^0-9.]/g, "");

  const firstDot = s.indexOf(".");
  if (firstDot !== -1) {
    s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, "");
  }

  const trailingDecimal = s.endsWith(".");
  const [intPartRaw, decPartRaw = ""] = s.split(".");
  const intPart = intPartRaw.replace(/^0+(?=\d)/, "");
  const decPart = decPartRaw.slice(0, 2);

  if (decPart.length > 0) return `${intPart || "0"}.${decPart}`;
  if (trailingDecimal) return `${intPart || "0"}.`;
  return intPart;
}

/**
 * Format a number for read-only display (no currency symbol).
 * Always 2 decimals.
 */
export function displayMoney(value: number, lang: CurrencyLang): string {
  if (!Number.isFinite(value)) value = 0;
  const localeMap: Record<CurrencyLang, string> = {
    en: "en-US",
    pt: "pt-BR",
    es: "es-ES",
  };
  return new Intl.NumberFormat(localeMap[lang], {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function currencyPlaceholder(lang: CurrencyLang): string {
  return isCommaDecimal(lang) ? "0,00" : "0.00";
}
