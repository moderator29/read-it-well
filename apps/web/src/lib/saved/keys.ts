/**
 * The shortlist's shared vocabulary.
 *
 * A save has two possible homes. A published platform listing is a row in
 * public.saved_items, owned by the account and protected by RLS. A catalogue
 * listing cannot be a row at all, because saved_items.listing_id carries a
 * foreign key to public.listings, so it lives on the device instead. Both
 * halves speak the shape defined here.
 *
 * The device half is written to localStorage (durable, private) and mirrored
 * into a small cookie so the server can render those cards on the first paint
 * instead of after a client round trip. The cookie is a mirror, never the
 * source of truth: localStorage wins whenever the two disagree.
 */

export const SAVED_COOKIE = "nf_saved";
export const SAVED_STORAGE_KEY = "nf_saved";

/** How many device saves are carried. Keeps the cookie small on 3G. */
export const SAVED_LIMIT = 60;

/** One saved listing held on the device. `savedAt` is epoch seconds. */
export type LocalSave = { id: string; savedAt: number };

const PAIR = ".";
const FIELD = "~";

/** Newest first, capped, one entry per id. */
export function normaliseSaves(saves: LocalSave[]): LocalSave[] {
  const byId = new Map<string, LocalSave>();
  for (const save of saves) {
    if (!save || typeof save.id !== "string" || save.id.length === 0) continue;
    const existing = byId.get(save.id);
    if (!existing || existing.savedAt < save.savedAt) byId.set(save.id, save);
  }
  return [...byId.values()]
    .sort((a, b) => b.savedAt - a.savedAt)
    .slice(0, SAVED_LIMIT);
}

/** Read the cookie mirror. Anything malformed is ignored rather than thrown. */
export function parseSavedCookie(raw: string | undefined): LocalSave[] {
  if (!raw) return [];
  const saves: LocalSave[] = [];
  for (const chunk of raw.split(PAIR)) {
    if (chunk.length === 0) continue;
    const [id, at] = chunk.split(FIELD);
    if (!id) continue;
    const savedAt = Number.parseInt(at ?? "", 10);
    saves.push({ id, savedAt: Number.isFinite(savedAt) ? savedAt : 0 });
  }
  return normaliseSaves(saves);
}

export function serialiseSavedCookie(saves: LocalSave[]): string {
  return normaliseSaves(saves)
    .map((s) => `${s.id}${FIELD}${Math.max(0, Math.trunc(s.savedAt))}`)
    .join(PAIR);
}
