/**
 * The 35 store images, in store order (the first three matter most).
 *
 * Each shot has a number, a slug (the file name), the capture(s) it shows
 * (docs/marketing/screens/<id>-ios.png and -android.png) and a layout that
 * draws it for either store. `pairWith` joins a shot to the next: the two are
 * drawn on one page twice as wide and a `bridge` (a ribbon, a photograph, a
 * line or a string of lights) crosses the seam between them, while each image
 * still shows its whole handset.
 *
 * Copy follows scripts/marketing/DESIGN.md section 2: no em dashes,
 * "verified" only about people, no promise or valuation words, no invented
 * numbers, and an Example chip on every pop-up that shows a booking, a table,
 * a payment or an inspection.
 */
import { SET_A } from "./shots/set-a.mjs";
import { SET_B } from "./shots/set-b.mjs";
import { SET_C, FEATURE } from "./shots/set-c.mjs";

export const pad = (n) => String(n).padStart(2, "0");
export const shotName = (s) => `${pad(s.n)}-${s.slug}`;

export const SHOTS = [...SET_A, ...SET_B, ...SET_C];
export { FEATURE };
