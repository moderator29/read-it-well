/**
 * The 35 store images, in store order (the first three matter most). The
 * layouts are in shots/premium.mjs; each shot has a number, a slug (the file
 * name), the capture(s) it shows (docs/marketing/screens/<id>-ios.png and
 * -android.png) and a layout that draws it for either store.
 *
 * Copy follows scripts/marketing/DESIGN.md section 2: no em dashes,
 * "verified" only about people, no promise or valuation words, no invented
 * numbers, and an Example chip on every card that shows a booking, a table,
 * a payment or an inspection.
 */
export { SHOTS, FEATURE } from "./shots/premium.mjs";

export const pad = (n) => String(n).padStart(2, "0");
export const shotName = (s) => `${pad(s.n)}-${s.slug}`;
