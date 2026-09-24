import "server-only";

import { resolveSession } from "../actions/session";
import { COMMUTE_FLAG, flagIsOn } from "../flags/read";
import { originKey, readBands, type Anchor, type CommuteBand, type CommuteRow } from "./commute";

/**
 * The reads behind V-43. Landmarks are public geography (world readable);
 * the bands come from `commute_for`, one call per distinct origin on the
 * page. Every read that fails answers "nothing", so a search never breaks
 * because the commute tables are not there yet.
 */

type Rpc = { rpc: (fn: string, args?: object) => Promise<{ data: unknown; error: unknown }> };

/** Every anchor a renter can pick, by city then name. Empty until the seed is approved. */
export async function readAnchors(): Promise<Anchor[]> {
  /* Off until the founder opens it: no anchors, so no group and no lines. */
  if (!(await flagIsOn(COMMUTE_FLAG))) return [];
  try {
    const session = await resolveSession();
    const supabase = session.state === "signed-in" ? session.supabase : null;
    if (!supabase) return [];
    const { data, error } = await supabase
      .from("landmarks")
      .select("id, slug, name, city")
      .order("city")
      .order("name")
      .limit(200);
    if (error || !data) return [];
    return data as Anchor[];
  } catch {
    return [];
  }
}

/** The bands from each listed origin to one anchor, keyed by `originKey`. */
export async function readCommutes(
  anchorId: string,
  origins: { stateCode?: string | undefined; area?: string | undefined }[],
): Promise<Map<string, CommuteBand[]>> {
  const out = new Map<string, CommuteBand[]>();
  const pairs = new Map<string, { state: string; area: string }>();
  for (const origin of origins) {
    const key = originKey(origin.stateCode, origin.area);
    if (key && !pairs.has(key)) pairs.set(key, { state: origin.stateCode!, area: origin.area!.trim() });
  }
  if (pairs.size === 0) return out;
  try {
    const session = await resolveSession();
    if (session.state !== "signed-in") return out;
    const rpc = session.supabase as unknown as Rpc;
    await Promise.all(
      [...pairs].slice(0, 30).map(async ([key, pair]) => {
        const { data, error } = await rpc.rpc("commute_for", { p_state: pair.state, p_area: pair.area, p_anchor: anchorId });
        if (error || !Array.isArray(data)) return;
        const bands = readBands(data as CommuteRow[]);
        if (bands.length > 0) out.set(key, bands);
      }),
    );
  } catch {
    /* No commute shown is the honest answer to a read that failed. */
  }
  return out;
}

/**
 * From ONE listing's area to the anchors in its city (at most six), for the
 * listing page's Location section. Only anchors with a band come back, so an
 * area with no guide and no residents shows the honest "none yet" line.
 */
export async function readCommutesFrom(
  origin: { stateCode?: string | undefined; area?: string | undefined; city: string },
): Promise<{ anchors: number; rows: { anchor: Anchor; bands: CommuteBand[] }[] }> {
  const anchors = (await readAnchors()).filter((a) => a.city.toLowerCase() === origin.city.toLowerCase()).slice(0, 6);
  const rows: { anchor: Anchor; bands: CommuteBand[] }[] = [];
  const key = originKey(origin.stateCode, origin.area);
  if (!key) return { anchors: anchors.length, rows };
  await Promise.all(
    anchors.map(async (anchor) => {
      const bands = (await readCommutes(anchor.id, [origin])).get(key);
      if (bands && bands.length > 0) rows.push({ anchor, bands });
    }),
  );
  rows.sort((a, b) => a.anchor.name.localeCompare(b.anchor.name));
  return { anchors: anchors.length, rows };
}
