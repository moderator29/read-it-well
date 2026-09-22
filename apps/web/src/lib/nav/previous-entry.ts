/**
 * The one thing that can prove the previous history entry is the parent.
 *
 * `canGoBackInApp()` in `lib/ui/history.ts` proves there is a screen of OURS
 * behind this one and stops there, which is all it was ever built to do. It has
 * three answers and two of them are incapable of going further: the `nfSeq`
 * stamp is a counter and a same-origin referrer describes the entry we came
 * FROM on a full load, not the entry sitting behind us in the list. Neither
 * carries the previous entry's URL, so neither can be asked whether that entry
 * is the parent.
 *
 * The Navigation API can. `navigation.entries()` is the contiguous, same-origin
 * entry list, each item carrying its `url`, and `navigation.currentEntry.index`
 * says where we are in it. The entry at `index - 1` is precisely the screen
 * `router.back()` would land on, and its path can be compared with the declared
 * parent. Chromium has this, which is most of this product's mobile traffic.
 *
 * SAFARI AND FIREFOX GET `null`, AND THAT IS THE CORRECT ANSWER RATHER THAN A
 * GAP. Without the API there is no way to learn the previous entry's URL, so
 * there is no proof, so `chooseBack` pushes the declared parent. The person
 * lands in the right place and loses a restored scroll position. The
 * alternative - guessing that the previous entry is probably the parent - is
 * the defect this whole directory exists to remove, and it would be worse on
 * the browsers with the least instrumentation rather than better.
 *
 * `nav` is injectable so the proof itself is testable in a Node process, which
 * is where `resolve.test.ts` runs.
 */

type NavigationEntryLike = { url?: string | null };

export type NavigationLike = {
  currentEntry?: { index?: number } | null;
  entries?: () => ReadonlyArray<NavigationEntryLike>;
};

/** The browser's Navigation API, when it has one. */
export function browserNavigation(): NavigationLike | null {
  if (typeof window === "undefined") return null;
  const nav = (window as unknown as { navigation?: NavigationLike }).navigation;
  return nav ?? null;
}

/**
 * The path of the entry `router.back()` would land on, or `null` when it cannot
 * be known. Never a guess.
 */
export function previousEntryPath(nav: NavigationLike | null = browserNavigation()): string | null {
  if (!nav || typeof nav.entries !== "function") return null;
  try {
    const index = nav.currentEntry?.index;
    if (typeof index !== "number" || index < 1) return null;
    const previous = nav.entries()[index - 1];
    const url = previous?.url;
    if (!url) return null;
    /* A same-origin base keeps a relative or malformed url from throwing, and
       the entry list is same-origin by specification anyway. */
    const base = typeof window === "undefined" ? "http://localhost" : window.location.href;
    return new URL(url, base).pathname;
  } catch {
    /* A disposed entry, or a url the browser will not hand over. No proof. */
    return null;
  }
}
