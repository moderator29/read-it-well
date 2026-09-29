/**
 * WHICH LISTING'S PHOTO IS IN FLIGHT (motion sweep, 29 September 2026).
 *
 * A listing card names its photo box when it is tapped (ListingCard.tsx), and
 * the detail gallery names its lead pane to match (ListingGallery.tsx). The
 * gallery should only do that when a card really did start the flight: a
 * named pane with no partner arrives as a lone group that fades in place
 * while the rest of the page slides, which looks like a fault.
 *
 * Module state rather than storage: the card and the gallery live in the same
 * client bundle, and a hard load, which has no card, starts it empty.
 */
let inFlight: { id: string; at: number } | null = null;

const WINDOW_MS = 1500;

export function startPhotoMorph(id: string): void {
  inFlight = { id, at: Date.now() };
}

export function isPhotoMorphFor(id: string): boolean {
  return inFlight !== null && inFlight.id === id && Date.now() - inFlight.at < WINDOW_MS;
}
