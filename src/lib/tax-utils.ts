export function isBrazilCountry(country?: string | null) {
  const normalized = (country ?? "").trim().toUpperCase();
  return normalized === "BR" || normalized === "BRA" || normalized === "BRAZIL" || normalized === "BRASIL";
}

export function getBillableTaxRate(taxRate?: number | null, businessCountry?: string | null) {
  if (isBrazilCountry(businessCountry)) return 0;
  return Number(taxRate ?? 0) || 0;
}