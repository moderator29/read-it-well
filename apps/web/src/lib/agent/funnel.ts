/**
 * THE PER-LISTING FUNNEL, AND ONE FIX (V-73).
 *
 * Six stages for one listing over seven days: seen in results, opened, saved,
 * enquired, viewing booked, viewed. Beside each, the median for similar
 * listings (same property type, same city, published, not examples), read by
 * `public.listing_funnel` (migration `20260924150500`). Below them, ONE fix,
 * chosen by the first rule that fires in the table below, because an agent
 * shown five suggestions acts on none.
 *
 * WHAT THE FIXES ARE ALLOWED TO SAY. Only what the numbers and the listing's
 * own fields show, and what the agent can do about it. No fix claims a
 * statistic the platform has not measured ("listings with five photos get
 * twice the saves" would be exactly that), so each one states this listing's
 * own figures and a concrete action.
 *
 * A median is shown only when at least three similar listings exist to take it
 * from; one or two is an anecdote, and the row says so rather than printing a
 * number that means nothing.
 *
 * Pure: the rows and the listing's facts are arguments, so every rule is
 * tested.
 */

export const FUNNEL_STAGES = ["seen", "opened", "saved", "enquired", "booked", "viewed"] as const;
export type FunnelStage = (typeof FUNNEL_STAGES)[number];

export type FunnelRow = {
  stage: FunnelStage;
  mine: number;
  /** The median of similar listings, or null when too few exist to compare. */
  median: number | null;
};

export type Funnel = { rows: FunnelRow[]; compared: number };

/** Fewer similar listings than this and there is no median worth printing. */
export const MIN_PEERS = 3;

/** The raw rows `listing_funnel` returns. */
export type FunnelRpcRow = {
  stage: string;
  mine: number | string | null;
  area_median: number | string | null;
  compared: number | null;
};

export function funnelFrom(rows: FunnelRpcRow[] | null | undefined): Funnel | null {
  if (!rows || rows.length === 0) return null;
  const compared = Number(rows[0]?.compared ?? 0);
  const byStage = new Map(rows.map((row) => [row.stage, row]));
  const out: FunnelRow[] = [];
  for (const stage of FUNNEL_STAGES) {
    const row = byStage.get(stage);
    if (!row) return null;
    const median = row.area_median === null ? null : Number(row.area_median);
    out.push({
      stage,
      mine: Number(row.mine ?? 0),
      median: compared >= MIN_PEERS && median !== null && Number.isFinite(median) ? median : null,
    });
  }
  return { rows: out, compared };
}

export type FixFacts = {
  photoCount: number;
  /** True when the lister stated a total to move in, or it is not a tenancy. */
  moveInStated: boolean;
  published: boolean;
};

export type FixKey = "not-seen" | "not-opened" | "not-saved" | "no-enquiry" | "no-viewing";

export type Fix = { key: FixKey; values: Record<string, number> };

/**
 * The first rule that fires, top down, or null. The order is the funnel's own:
 * a listing nobody sees has no use for advice about viewings.
 */
export function fixFor(funnel: Funnel, facts: FixFacts): Fix | null {
  const get = (stage: FunnelStage) => funnel.rows.find((row) => row.stage === stage)?.mine ?? 0;
  const seen = get("seen");
  const opened = get("opened");
  const saved = get("saved");
  const enquired = get("enquired");
  const booked = get("booked");

  if (facts.published && seen === 0) return { key: "not-seen", values: {} };
  if (seen >= 20 && opened === 0) return { key: "not-opened", values: { seen } };
  if (opened >= 10 && saved === 0 && facts.photoCount < 5) {
    return { key: "not-saved", values: { opened, photos: facts.photoCount } };
  }
  if (opened >= 10 && enquired === 0 && !facts.moveInStated) {
    return { key: "no-enquiry", values: { opened } };
  }
  if (enquired >= 3 && booked === 0) return { key: "no-viewing", values: { enquired } };
  return null;
}

/** Fill `{name}` from the fix's own numbers. */
export function fixText(template: string, values: Record<string, number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    values[key] === undefined ? whole : String(values[key]),
  );
}
