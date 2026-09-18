/**
 * The stay detail page, first light.
 *
 * `/stay/[id]` and `/listing/[id]` serve the same catalogue row today; what
 * differs is the URL, and the URL decides the shell: `sideOfPath` treats
 * `/stay/` as Stays, so a hotel opened from the Stays shelf, a shared link or
 * a notification stays in the Stays shell with its own navigation, dock and
 * accent, and the reconciler keeps it there.
 *
 * The screen itself is the existing listing page, gallery edge to edge,
 * `ReservePanel` for a nightly stay, `ReserveTable` for a restaurant, real
 * availability from `getBlockedDates`, real checkout. It re-exports rather
 * than copies so the two URLs cannot drift while the showcase (room types as
 * rows, the rate-plan sheet, the total as the headline, policy in plain
 * words) is built on the business-grade schema and replaces this file.
 */
export { default, generateMetadata } from "../../listing/[id]/page";
