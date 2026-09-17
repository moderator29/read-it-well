import { notFound } from "next/navigation";

import { GalleryBoard } from "./GalleryBoard";

/**
 * THE COMPONENT GALLERY, AND WHY IT EXISTS.
 *
 * A third of this product by surface area has never been seen rendered by
 * anybody working on it. The wallet drawer, `Sheet`, the queue empty states,
 * the stalled-money notice: all of them sit behind a session, and there is no
 * seeded environment to get a session from. So the work landed on compiler
 * proofs and careful reading, and every report for a week has carried a NOT
 * VERIFIED section saying the same thing.
 *
 * Most of those components do not actually need a session. They need PROPS.
 * `Sheet` is the most-used overlay in the product and it takes `open`, a title
 * and children; the fact that its real callers are all behind auth is a fact
 * about its callers. So this route mounts them with fixtures, and the things
 * that have never been looked at become things anybody can open in a browser.
 *
 * WHAT IT IS NOT. It is not a test and it does not assert anything. It is a
 * place to LOOK, which is the one thing this project has had no way to do. The
 * automated checks stay where they are.
 *
 * DEVELOPMENT ONLY, ENFORCED HERE RATHER THAN BY A ROUTE RULE. `notFound()` in
 * production means this cannot be reached on a deployed site even if something
 * upstream forgets to exclude it, and it is a 404 rather than a redirect
 * because a redirect tells a stranger the route exists.
 */
export default function GalleryPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <GalleryBoard />;
}
