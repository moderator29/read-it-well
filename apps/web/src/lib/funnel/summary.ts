/**
 * A6. The desk's arithmetic, pure: totals per step and the step-to-step
 * conversion, in the funnel's order. A conversion is printed only when both
 * steps have a count; a zero denominator prints nothing, never "0%".
 */
export const DESK_ORDER = [
  "landing_view",
  "get_started",
  "signup_opened",
  "accounts_created",
  "accounts_confirmed",
  "first_search",
  "first_result",
] as const;

export type DeskStep = (typeof DESK_ORDER)[number];

export const DESK_LABELS: Record<DeskStep, string> = {
  landing_view: "Landing views",
  get_started: "Get started taps",
  signup_opened: "Sign-up opened",
  accounts_created: "Accounts created",
  accounts_confirmed: "Accounts confirmed",
  first_search: "First search",
  first_result: "First save",
};

export function totals(rows: readonly { step: string; visits: number }[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const row of rows) out.set(row.step, (out.get(row.step) ?? 0) + row.visits);
  return out;
}

export function conversion(from: number | undefined, to: number | undefined): number | null {
  if (!from || to === undefined) return null;
  return Math.round((to / from) * 1000) / 10;
}

/** Visits per locale for one step, largest first. */
export function byLocale(rows: readonly { step: string; locale: string | null; visits: number }[], step: string) {
  const out = new Map<string, number>();
  for (const row of rows) if (row.step === step && row.locale) out.set(row.locale, (out.get(row.locale) ?? 0) + row.visits);
  return [...out.entries()].sort((a, b) => b[1] - a[1]);
}
