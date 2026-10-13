/**
 * ADOPTING A PRE-SCOPE KEY, ONCE (auditor A7).
 *
 * The seen-story ring list and the shown-badge list were one key per device
 * (`nf_seen_stories`, `nf_badges_shown`) until auditor A2 scoped them to the
 * viewer (`<key>:<viewerId>`). Nothing carried the old list across, so after
 * the upgrade every ring relit once and a recent badge celebrated a second
 * time: the product forgetting what this device had already told it.
 *
 * The rule, the same for both lists:
 *
 *   - Only a SIGNED-IN viewer adopts. The old list was written by whoever
 *     used this browser; the first account to read its own empty scoped key
 *     takes it over, and the legacy key is deleted, so a second account on
 *     the same phone starts clean rather than inheriting it too.
 *   - Only when the scoped key holds nothing. A viewer who already has a
 *     scoped list keeps it untouched; the legacy key is then left for nobody
 *     and removed.
 *   - A signed-out reader never adopts: their scope is `:anon`, a new key,
 *     and the old list stays for the next signed-in read.
 *
 * Every storage call can throw (private windows, blocked site data, preview
 * capture); a throw here simply means nothing is adopted, which is the state
 * the reader was in before this existed.
 *
 * Pure over a `Storage`-shaped argument, so `scoped-storage.test.ts` proves it
 * without a browser.
 */
export type KeyValueStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/**
 * The raw value to read for `scopedKey`: its own, or the legacy key's,
 * adopted into it. Returns null when there is nothing under either.
 */
export function readAdopting(
  store: KeyValueStore,
  scopedKey: string,
  legacyKey: string,
  signedIn: boolean,
): string | null {
  const own = store.getItem(scopedKey);
  if (!signedIn) return own;
  const legacy = store.getItem(legacyKey);
  if (legacy === null) return own;
  if (own === null || own === "" || own === "[]") {
    store.setItem(scopedKey, legacy);
    store.removeItem(legacyKey);
    return legacy;
  }
  /* This viewer already has their own list; the old one belongs to nobody now. */
  store.removeItem(legacyKey);
  return own;
}
