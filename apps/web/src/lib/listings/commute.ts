/**
 * COMMUTE BY THE CLOCK (V-43): minutes to a named anchor in a rush-hour
 * window, never a distance and never a single number.
 *
 * Two labelled sources, decided by the database (`commute_for`): the route
 * guide ("from our route guide") until five members of the Around place have
 * reported in 30 days, then their range ("reported by N residents, last 30
 * days"). No third-party routing API is called anywhere. Pure and tested.
 */

export type Peak = "am" | "pm";

/** A named place a renter goes to every day (`public.landmarks`). */
export type Anchor = { id: string; slug: string; name: string; city: string };

/** What `report_commute` may answer; each is said in full on the card. */
export const COMMUTE_RESULTS = [
  "ok",
  "off",
  "signed-out",
  "not-member",
  "too-new",
  "bad-minutes",
  "bad-anchor",
  "off-peak",
  "already",
  "failed",
] as const;
export type CommuteResult = (typeof COMMUTE_RESULTS)[number];

/** The drawer's one commute choice: under this many minutes at the morning rush. */
export const RUSH_WITHIN = 45;

export type CommuteBand = {
  peak: Peak;
  lowMin: number;
  highMin: number;
  routeLabel: string | null;
  source: "guide" | "residents";
  reports: number;
};

export type CommuteRow = {
  peak: string;
  low_min: number;
  high_min: number;
  route_label: string | null;
  source: string;
  reports: number;
};

/** Rows as bands, dropping anything malformed. Morning first. */
export function readBands(rows: readonly CommuteRow[] | null | undefined): CommuteBand[] {
  const out: CommuteBand[] = [];
  for (const row of rows ?? []) {
    if (row.peak !== "am" && row.peak !== "pm") continue;
    if (!(row.low_min > 0) || !(row.high_min >= row.low_min)) continue;
    out.push({
      peak: row.peak,
      lowMin: row.low_min,
      highMin: row.high_min,
      routeLabel: row.route_label,
      source: row.source === "residents" ? "residents" : "guide",
      reports: row.reports,
    });
  }
  return out.sort((a, b) => (a.peak === b.peak ? 0 : a.peak === "am" ? -1 : 1));
}

export type CommuteCopy = {
  line: string;
  lineVia: string;
  am: string;
  pm: string;
  guide: string;
  residents: string;
};

/**
 * "About 55 to 80 min in the morning rush to Marina, via Third Mainland.
 * From our route guide." The morning band leads; null when there is none.
 */
export function commuteLine(bands: readonly CommuteBand[], anchor: string, copy: CommuteCopy): string | null {
  const band = bands.find((b) => b.peak === "am") ?? bands[0];
  if (!band) return null;
  const template = band.routeLabel ? copy.lineVia : copy.line;
  const main = template
    .replace("{low}", String(band.lowMin))
    .replace("{high}", String(band.highMin))
    .replace("{peak}", band.peak === "am" ? copy.am : copy.pm)
    .replace("{anchor}", anchor)
    .replace("{route}", band.routeLabel ?? "");
  const source =
    band.source === "residents" ? copy.residents.replace("{n}", String(band.reports)) : copy.guide;
  return `${main} ${source}`;
}

/**
 * "Under N minutes at rush hour": the morning band's upper end must be within
 * it. Strict, like every filter here: no band, no match.
 */
export function withinCommute(bands: readonly CommuteBand[], within: number): boolean {
  const band = bands.find((b) => b.peak === "am");
  return band !== undefined && band.highMin <= within;
}

/** The key a listing's origin is looked up by: state and area, as the database compares them. */
export function originKey(stateCode: string | undefined, area: string | undefined): string | null {
  if (!stateCode || !area || !area.trim()) return null;
  return `${stateCode}|${area.trim().toLowerCase()}`;
}
