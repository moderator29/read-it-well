/**
 * "THIS PHONE HAS OPENED LISTINGS", KNOWN BEFORE FIRST PAINT (13 October 2026,
 * the layout-stability audit: "the platform looks scattered on a weak
 * network").
 *
 * The Recently viewed row on Home reads the phone's own memory, which only
 * exists in the browser. It drew nothing in the server's HTML and appeared
 * after hydration, so everything under it jumped down by the row's height,
 * seconds after the page had first painted on a slow link (measured: a layout
 * shift of 0.098 at 7.5 s on Fast 3G, with three listings remembered).
 *
 * The server cannot know, so the browser tells the stylesheet. This one line
 * runs in the head, before paint, reads the one key the row reads, and marks
 * the root `data-recent-listings` when there is at least one entry. The
 * stylesheet (`member-loop.css`, `.nf-lookback-slot`) then holds the row's
 * height open from the first frame, and the row fills the space it was
 * holding. A phone with no history draws no slot, as before.
 *
 * `syncRecentFlag` keeps the mark true while the app stays open: a listing
 * opened and a clear both move it, so a client-side return to Home reserves
 * (or does not reserve) correctly without a reload. The row itself is the
 * authority: when it hydrates and finds nothing, it collapses the slot.
 *
 * Written out in full, so the CSP nonce covers exactly the text a reviewer
 * reads. It never throws. The key is the one in `memory.ts`
 * (`recent-flag.test.ts` holds the two together).
 */
export const RECENT_LISTINGS_STORAGE_KEY = "nf_recent_listings";
export const RECENT_FLAG_ATTRIBUTE = "data-recent-listings";

export const RECENT_FLAG_SCRIPT =
  "try{var r=JSON.parse(localStorage.getItem('nf_recent_listings')||'[]');" +
  "if(Array.isArray(r)&&r.length>0)document.documentElement.setAttribute('data-recent-listings','')}catch(e){}";

/** Client only: set or clear the root's mark from what is stored now. */
export function syncRecentFlag(count: number): void {
  if (typeof document === "undefined") return;
  if (count > 0) document.documentElement.setAttribute(RECENT_FLAG_ATTRIBUTE, "");
  else document.documentElement.removeAttribute(RECENT_FLAG_ATTRIBUTE);
}
