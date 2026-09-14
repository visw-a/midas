// Formatting follows traditional statement conventions (the same ones on
// MII's actual Vanguard/Fidelity statements): negative values are wrapped
// in parentheses rather than colored red, positive values are plain unless
// explicitly "signed" (prefixed with +) for emphasis in a summary context.

export function formatCurrency(
  value: number | null | undefined,
  opts: { compact?: boolean; signed?: boolean } = {}
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";

  if (opts.compact) {
    const formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
      currencySign: "accounting",
    }).format(value);
    return formatted;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
    currencySign: "accounting",
    signDisplay: opts.signed ? "exceptZero" : "auto",
  }).format(value);
}

export function formatPercent(value: number | null | undefined, opts: { signed?: boolean } = {}): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const pct = value * 100;
  const magnitude = `${Math.abs(pct).toFixed(2)}%`;
  if (pct < 0) return `(${magnitude})`;
  if (opts.signed && pct > 0) return `+${magnitude}`;
  return magnitude;
}

export function formatNumber(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateShort(iso: string): string {
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

/** Negative values render bold to draw the eye, matching how a printed
 * tear sheet uses weight rather than color to flag an unfavorable number. */
export function emphasisClass(value: number | null | undefined): string {
  if (value === null || value === undefined) return "text-navy-400";
  return value < 0 ? "font-semibold text-navy-900" : "text-navy-900";
}
