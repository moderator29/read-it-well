import { intlTag, type Locale } from "@vallo/i18n";
import type { ChartPoint, CryptoVs, MarketRow } from "./client";

/**
 * How the market surface says a number.
 *
 * These are MARKET PRICES, not the person's money: floats from a feed,
 * shown for information. The wallet's integer-kobo law does not apply to
 * them and nothing here ever touches a balance. What does apply is the
 * locale: every figure goes through Intl with the app's own tag, so a
 * Hausa phone groups a bitcoin price the same way it groups a rent.
 *
 * Pure, so it is tested rather than trusted.
 */

const CURRENCY: Record<CryptoVs, string> = { ngn: "NGN", usd: "USD" };

/** A price with the precision its size deserves: 2 places above 1, more below. */
export function formatPrice(value: number, vs: CryptoVs, locale: Locale): string {
  if (!Number.isFinite(value)) return "";
  const abs = Math.abs(value);
  /* Two places above one; below one, enough places for two significant
     digits, so 0.0063 and 0.000024 both read as a price and not as a zero. */
  const digits = abs >= 1 || abs === 0 ? 2 : Math.min(8, Math.max(2, Math.ceil(-Math.log10(abs)) + 1));
  return new Intl.NumberFormat(intlTag[locale], {
    style: "currency",
    currency: CURRENCY[vs],
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

/** "₦2.4t", "$118.6b": the compact form for caps and volumes. */
export function formatCompact(value: number, vs: CryptoVs, locale: Locale): string {
  if (!Number.isFinite(value)) return "";
  /* Intl's compact notation stops at a trillion, so a naira market cap came
     out as "₦1940.0T". Past that rung the figure is grouped in trillions. */
  if (Math.abs(value) >= 1e15) {
    const trillions = new Intl.NumberFormat(intlTag[locale], {
      style: "currency",
      currency: CURRENCY[vs],
      maximumFractionDigits: 0,
    }).format(value / 1e12);
    return `${trillions}t`;
  }
  const text = new Intl.NumberFormat(intlTag[locale], {
    style: "currency",
    currency: CURRENCY[vs],
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
  /* Intl emits an upper-case magnitude suffix; the platform writes it lower,
     as it does on every listing price. */
  return text.replace(/[A-Z]+$/, (m) => m.toLowerCase());
}

/** "+2.48%", "-0.90%", always signed, so the sign never depends on colour. */
export function formatPercent(value: number, locale: Locale): string {
  if (!Number.isFinite(value)) return "";
  const text = new Intl.NumberFormat(intlTag[locale], {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(value));
  return `${value > 0 ? "+" : value < 0 ? "-" : ""}${text}%`;
}

/** The chart, as bare prices whatever shape the feed sent. */
export function chartValues(points: ChartPoint[]): number[] {
  const out: number[] = [];
  for (const point of points) {
    const value = Array.isArray(point) ? point[1] : point;
    if (typeof value === "number" && Number.isFinite(value)) out.push(value);
  }
  return out;
}

/**
 * The SVG path for a sparkline or a chart, mapped onto a width by height
 * box. Null when there are too few points for a line. Division appears only
 * in mapping values to pixels, never in a figure anybody reads.
 */
export function linePath(
  values: number[],
  width: number,
  height: number,
  inset = 1,
): { line: string; area: string; min: number; max: number } | null {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const usable = height - inset * 2;
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = inset + usable - ((v - min) / span) * usable;
    return [Number(x.toFixed(2)), Number(y.toFixed(2))] as const;
  });
  const line = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x} ${y}`).join(" ");
  const area = `${line} L${width} ${height} L0 ${height} Z`;
  return { line, area, min, max };
}

/** The biggest movers either way, by 24h change, from the market rows. */
export function movers(rows: MarketRow[], count = 5): { gainers: MarketRow[]; losers: MarketRow[] } {
  const sorted = rows
    .filter((row) => Number.isFinite(row.change24h))
    .slice()
    .sort((a, b) => b.change24h - a.change24h);
  return {
    gainers: sorted.filter((row) => row.change24h > 0).slice(0, count),
    losers: sorted
      .filter((row) => row.change24h < 0)
      .slice(-count)
      .reverse(),
  };
}

/** Name, symbol or id, case-insensitively. Empty query keeps everything. */
export function matchesCoin(row: MarketRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return true;
  return (
    row.name.toLowerCase().includes(q) ||
    row.symbol.toLowerCase().includes(q) ||
    row.id.toLowerCase().includes(q)
  );
}

/** The feed's description arrives as HTML; the surface shows text. */
export function plainText(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+\n/g, "\n")
    .trim();
}
