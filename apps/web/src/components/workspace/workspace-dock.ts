/**
 * Whether a workspace screen carries the dock. Pure, so a node test and both
 * shells read one answer.
 *
 *   immersive   an open conversation or the workspace assistant owns the whole
 *               viewport with a composer pinned to the bottom edge; a dock
 *               floating over that composer is in the way of the one thing the
 *               screen is for (the same rule as `isImmersiveRoute`).
 *   a flow      the listing wizard and the host application own the bottom
 *               edge with their own step footer, and a person in the middle of
 *               uploading a certificate does not need the dock under their
 *               thumb (`HostShell` says the same). They opt out.
 */
export function workspaceDockShows({ immersive = false, flow = false }: { immersive?: boolean; flow?: boolean }): boolean {
  return !immersive && !flow;
}
