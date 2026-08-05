import "server-only";

/**
 * Nigeria, read once and held.
 *
 * The picker needs all 37 states and all 774 local governments in the browser
 * at the same time, because the alternative is a round trip on every tap and
 * this is the front door of the whole social layer. Sending it whole is a
 * deliberate trade: about thirty kilobytes before compression, in exchange for
 * a picker where tapping Kano draws 44 chips instantly and typing three letters
 * searches the entire country with no network at all.
 *
 * Both tables are `for select using (true)` and carry no personal data, so this
 * read is identical for every visitor, signed in or not. That is what makes it
 * safe to memoise in the process: there is no viewer in it to leak. Membership,
 * counts and which doors are already open are read separately and per request,
 * because those genuinely do change and genuinely are per viewer.
 *
 * The window is an hour. The rows change when an administrator edits reference
 * data in `/admin/reference`, which is a thing that happens roughly never, and
 * an hour of staleness on a local government name is not a defect anybody can
 * feel. A failed read is never cached, so a hiccup costs one request rather
 * than an hour of an empty picker.
 */

import { isSupabaseConfigured } from "../supabase/env";
import { createClient } from "../supabase/server";
import type { LgaNode, PlaceTree, StateNode } from "./places-schema";

const TTL_MS = 60 * 60 * 1000;

let cached: { at: number; tree: PlaceTree } | null = null;
/** One in-flight read shared by concurrent renders, so a cold start on a busy
    moment costs one query rather than one per request. */
let inFlight: Promise<PlaceTree> | null = null;

async function readTree(): Promise<PlaceTree> {
  const supabase = await createClient();

  const [states, lgas] = await Promise.all([
    supabase.from("states").select("code, name").order("name", { ascending: true }),
    supabase
      .from("local_governments")
      .select("code, state_code, name")
      /* 774 rows, and PostgREST's default ceiling is 1000. Stated rather than
         assumed, because the day a 775th arrives this is the line that decides
         whether one local government quietly stops existing. */
      .order("name", { ascending: true })
      .limit(1200),
  ]);

  if (states.error || !states.data) throw new Error("states unavailable");
  if (lgas.error || !lgas.data) throw new Error("local governments unavailable");

  const byState = new Map<string, LgaNode[]>();
  for (const row of lgas.data) {
    const list = byState.get(row.state_code);
    if (list) list.push({ code: row.code, name: row.name });
    else byState.set(row.state_code, [{ code: row.code, name: row.name }]);
  }

  const tree: StateNode[] = states.data.map((state) => ({
    code: state.code,
    name: state.name,
    lgas: byState.get(state.code) ?? [],
  }));

  return tree;
}

/**
 * The whole country. An empty array when Supabase is not configured or the read
 * fails, never an exception: the picker has a designed state for a country it
 * could not load, and a discovery surface that 500s because one table blinked
 * is worse than one that is briefly honest about being empty.
 */
export async function getPlaceTree(): Promise<PlaceTree> {
  if (!isSupabaseConfigured()) return [];

  const now = Date.now();
  if (cached && now - cached.at < TTL_MS) return cached.tree;
  if (inFlight) return inFlight;

  inFlight = readTree()
    .then((tree) => {
      cached = { at: Date.now(), tree };
      return tree;
    })
    .catch(() => cached?.tree ?? [])
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}
