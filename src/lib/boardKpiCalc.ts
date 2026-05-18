/**
 * Pure helpers for Board KPI dashboard math.
 * Kept free of React/Supabase imports so they're trivially unit-testable.
 */

/**
 * Returns a 0–100 progress value representing outstanding revenue
 * as a proportion of total revenue. Always clamped to [0, 100] and
 * never NaN/Infinity, regardless of input edge cases.
 */
export function outstandingProgressValue(
  outstanding: number | null | undefined,
  revenue: number | null | undefined,
): number {
  const o = Number(outstanding);
  const r = Number(revenue);
  if (!Number.isFinite(o) || !Number.isFinite(r)) return 0;
  if (r <= 0) return 0;
  if (o <= 0) return 0;
  const pct = (o / r) * 100;
  if (!Number.isFinite(pct)) return 0;
  return Math.max(0, Math.min(100, pct));
}

export type PdfExportQuality = "standard" | "high";

export function pdfScaleFor(quality: PdfExportQuality): number {
  return quality === "high" ? 3 : 1.5;
}

/**
 * Builds a deterministic, traceable filename: includes month range and a
 * UTC export timestamp so reports never collide and are easy to sort.
 */
export function buildExportFilename(
  monthStart: Date,
  monthEnd: Date,
  exportedAt: Date = new Date(),
): string {
  const fmt = (d: Date) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  const ts = exportedAt
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .slice(0, 19);
  const range =
    fmt(monthStart) === fmt(monthEnd) ? fmt(monthStart) : `${fmt(monthStart)}_to_${fmt(monthEnd)}`;
  return `board-executive-dashboard_${range}_exported-${ts}Z.pdf`;
}
