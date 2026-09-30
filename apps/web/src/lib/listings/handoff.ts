/**
 * THE CARD HANDS ITS FACTS TO THE LISTING (recommendation B4, 30 September
 * 2026: the listing opens in one frame).
 *
 * A tap on a listing card already holds the photo on screen, the title, the
 * place, the price line and the mark. The listing route used to start from a
 * skeleton that knew none of it, so a warm tap on a mid-range phone showed
 * grey for as long as the server took. At tap time the card writes its
 * glance here, keyed by listing id, with the photo URL the browser actually
 * drew (`currentSrc`, already in its cache, so painting it costs no second
 * download). The listing's loading shell reads it and paints the lead photo,
 * the title and the price at once, in the real page's own boxes, and the real
 * page streams in over it without a jump.
 *
 * In memory only, for this tab: a refresh or a shared link has nothing here
 * and gets the ordinary skeleton. Nothing new is said: every string is one
 * the card printed. Small and bounded (the last 12 taps).
 */
import type { CardGlance } from "./card-glance";

export type Handoff = CardGlance & {
  /** The exact image URL the card had painted, or null. */
  drawn: string | null;
};

const MAX = 12;
const store = new Map<string, Handoff>();

export function handOff(glance: CardGlance, drawn: string | null): void {
  store.delete(glance.id);
  store.set(glance.id, { ...glance, drawn });
  while (store.size > MAX) {
    const oldest = store.keys().next().value;
    if (oldest === undefined) break;
    store.delete(oldest);
  }
}

/** The card's facts for this listing, or null (a cold open). Not consumed:
    the loading shell may render more than once. */
export function handoffFor(id: string | null | undefined): Handoff | null {
  if (!id) return null;
  return store.get(id) ?? null;
}

/** The image the card drew: its `currentSrc`, when it is a safe URL. */
export function drawnSrcIn(root: Element | null): string | null {
  const img = root?.querySelector("img");
  const src = img?.currentSrc || img?.getAttribute("src") || "";
  if (!src) return null;
  if (src.startsWith("/") && !src.startsWith("//")) return src;
  try {
    const url = new URL(src);
    return url.protocol === "https:" || url.origin === window.location.origin ? src : null;
  } catch {
    return null;
  }
}

/** Tests only. */
export function __clearHandoffs(): void {
  store.clear();
}
