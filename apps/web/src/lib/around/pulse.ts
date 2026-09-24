/**
 * THE NEIGHBOURS' ACCOUNT (V-41): light, water and flooding as the members
 * living in an Around area report them, beside what the lister says.
 *
 * The rules that make a count worth showing live in the database
 * (`20260924150700`): a member counts only 14 days after joining the area, a
 * lister cannot answer for an area they list in, each kind has its own gap
 * between answers, and a kind is returned only once five different members
 * have answered it. This module turns those rows into sentences and chooses
 * which one-tap question to ask. Pure and tested.
 */

export const PULSE_KINDS = ["light", "water", "flood"] as const;
export type PulseKind = (typeof PULSE_KINDS)[number];

export const PULSE_ANSWERS = {
  light: ["most", "some", "none"],
  water: ["normal", "tanker", "none"],
  flood: ["none", "road", "compound"],
} as const satisfies Record<PulseKind, readonly string[]>;
export type PulseAnswer<K extends PulseKind = PulseKind> = (typeof PULSE_ANSWERS)[K][number];

export const FLOODING = ["none", "road", "compound"] as const;
export type Flooding = (typeof FLOODING)[number];

export function isFlooding(value: unknown): value is Flooding {
  return typeof value === "string" && (FLOODING as readonly string[]).includes(value);
}

export function isPulseAnswer(kind: PulseKind, answer: string): boolean {
  return (PULSE_ANSWERS[kind] as readonly string[]).includes(answer);
}

/** What the database says back to a pulse. Every value has words on screen. */
export const PULSE_RESULTS = ["ok", "signed-out", "not-member", "too-new", "bad-answer", "lister", "already", "failed"] as const;
export type PulseResult = (typeof PULSE_RESULTS)[number];

export function readPulseResult(value: unknown): PulseResult {
  return typeof value === "string" && (PULSE_RESULTS as readonly string[]).includes(value)
    ? (value as PulseResult)
    : "failed";
}

export type SummaryRow = {
  area_name: string | null;
  kind: string;
  answer: string;
  reports: number;
  members: number;
  window_days: number;
};

export type KindSummary = {
  kind: PulseKind;
  /** Answers, most reported first. */
  counts: { answer: string; reports: number }[];
  total: number;
  members: number;
  windowDays: number;
};

export type AreaSummary = { areaName: string | null; kinds: KindSummary[] };

/** The rows as one summary per kind, in the fixed kind order. Unknown kinds are dropped. */
export function summarise(rows: readonly SummaryRow[]): AreaSummary {
  const kinds: KindSummary[] = [];
  let areaName: string | null = null;
  for (const kind of PULSE_KINDS) {
    const mine = rows.filter((row) => row.kind === kind && isPulseAnswer(kind, row.answer));
    if (mine.length === 0) continue;
    areaName = areaName ?? mine[0]!.area_name;
    const counts = mine
      .map((row) => ({ answer: row.answer, reports: row.reports }))
      .sort((a, b) => b.reports - a.reports);
    kinds.push({
      kind,
      counts,
      total: counts.reduce((sum, c) => sum + c.reports, 0),
      members: mine[0]!.members,
      windowDays: mine[0]!.window_days,
    });
  }
  return { areaName: areaName ?? rows[0]?.area_name ?? null, kinds };
}

export type PulseLineCopy = {
  answers: Record<PulseKind, Record<string, string>>;
  line: string;
};

/** "Most of the day on 11 of 14 reports in the last 30 days". Counts, never a grade. */
export function kindLine(summary: KindSummary, copy: PulseLineCopy): string {
  const lead = summary.counts[0]!;
  return copy.line
    .replace("{answer}", copy.answers[summary.kind][lead.answer] ?? lead.answer)
    .replace("{n}", String(lead.reports))
    .replace("{total}", String(summary.total))
    .replace("{days}", String(summary.windowDays));
}

/** The months the flood question is asked, in Lagos: June and September. */
export function isFloodSeason(now: Date): boolean {
  const month = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", month: "numeric" }).format(now),
  );
  return month === 6 || month === 9;
}

export type PulseEligibility = {
  eligible: boolean;
  lister: boolean;
  light: boolean;
  water: boolean;
  flood: boolean;
};

/**
 * The one question to ask now, or why none is asked. Light first (twice a
 * week at most), then water (monthly), then flooding (only in June and
 * September). Never more than one at a time.
 */
export function nextQuestion(
  area: PulseEligibility,
  now: Date,
): { kind: PulseKind } | { none: "too-new" | "lister" | "done" } {
  if (!area.eligible) return { none: "too-new" };
  if (area.lister) return { none: "lister" };
  if (area.light) return { kind: "light" };
  if (area.water) return { kind: "water" };
  if (area.flood && isFloodSeason(now)) return { kind: "flood" };
  return { none: "done" };
}
