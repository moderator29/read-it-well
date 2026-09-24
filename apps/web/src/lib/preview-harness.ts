/**
 * WHETHER THE PREVIEW HARNESS MAY OPEN, AND WHY IT IS A FUNCTION.
 *
 * THE PROBLEM IT SOLVES. The founder's fifth point on the shape ruling: a
 * fresh screenshot per surface, and nothing from the broken harness counts.
 * The only server we are allowed to take a proof from is a PRODUCTION one,
 * because `next dev` does not hydrate reliably on this box: same route, same
 * binary, four minutes apart, "React has not hydrated" on dev and clean on
 * `next start`.
 *
 * But `next start` is `NODE_ENV === "production"`, and the preview harness
 * 404s there. So the two rules met head on: the harness is the only way to
 * render a signed-in surface, an empty state or an error state without a
 * session, and the production server is the only place a proof of it counts.
 *
 * THE RESOLUTION, AND THE PART THAT MATTERS IS THE SECOND CONDITION. The
 * harness opens on a production build ONLY when `VALLO_PREVIEW_HARNESS` is set to
 * "1", AND the process is not running on Vercel. The environment variable
 * alone would be a footgun: one person adds it to the project settings to
 * debug something, and fixture pages carrying fake listings and fake money are
 * live on vallospaces.com. The Vercel check makes that impossible rather than
 * merely unlikely, because `VERCEL` is set by the platform itself and cannot
 * be unset from inside a deployment. Two independent conditions, and the one
 * we do not control is the one that fails closed.
 *
 * WHY A FUNCTION AND NOT AN INLINE CHECK IN THE LAYOUT. A gate nobody can
 * write a test against is a gate that quietly stops working. This takes the
 * environment as an argument so `preview-harness.test.ts` can prove all four
 * corners of it, including the one that matters: that setting the variable on
 * Vercel does NOT open it.
 *
 * NEVER SET `VALLO_PREVIEW_HARNESS` ANYWHERE BUT A LOCAL PROOF SERVER. It belongs
 * on a `next start` you launched yourself to take a screenshot, and nowhere
 * else. It is deliberately absent from `.env.example` for that reason.
 */
export function previewHarnessIsOpen(env: {
  NODE_ENV?: string;
  VALLO_PREVIEW_HARNESS?: string;
  VERCEL?: string;
}): boolean {
  /* Development is the harness's home and needs no opt in. */
  if (env.NODE_ENV !== "production") return true;
  /* The platform's own variable, which a deployment cannot lie about. */
  if (env.VERCEL) return false;
  return env.VALLO_PREVIEW_HARNESS === "1";
}
