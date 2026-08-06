/**
 * Where a marketing link points when it points at the product.
 *
 * The landing page is the one page a stranger sees, and nine of its links went
 * straight into the product: `/search`, `/listing/<id>`, `/assistant`. Since
 * the product moved behind a session, every one of those was a link to a
 * redirect. A visitor tapped "Explore stays", watched the page change twice,
 * and arrived somewhere they did not ask for with no explanation.
 *
 * So a marketing link to a product destination becomes an invitation to join,
 * and it carries where the person was trying to go. The destination is kept
 * rather than dropped because it is the most useful thing we know about them:
 * somebody who tapped Lagos wants Lagos, and losing that on the way through
 * sign-up makes them start their search over.
 *
 * This is deliberately NOT a guard. The lock is in `middleware.ts`, which runs
 * before any page and catches a typed address, an old bookmark and a search
 * engine alike. This only stops the platform's own front door promising a room
 * it will not open.
 */
export function gatedHref(destination: string): string {
  return `/sign-up?next=${encodeURIComponent(destination)}`;
}
