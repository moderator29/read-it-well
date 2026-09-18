/**
 * The restaurant page, first light.
 *
 * The same row as `/listing/[id]` for a restaurant kind, under the URL that
 * keeps the Stays shell: `sideOfPath` treats `/restaurant/` as Stays. The
 * screen is the existing listing page with `ReserveTable`, which files a real
 * reservation through `lib/reservations`. The dedicated surface (hours,
 * service windows, open now, the reservation thread) replaces this file when
 * restaurant profiles land on the business-grade schema.
 */
export { default, generateMetadata } from "../../listing/[id]/page";
