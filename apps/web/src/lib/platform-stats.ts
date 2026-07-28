/**
 * Platform inventory counts shown on the landing page.
 *
 * The landing reference shows figures like "Hotels 5,130+". Those are mockup
 * numbers. Publishing invented inventory counts on a public marketing page is
 * misleading advertising, and Master Rule 8 forbids presenting fake statistics
 * as real, so this returns null until the real aggregate endpoint exists.
 *
 * The UI is built to render cleanly in both states: label only while null, and
 * label plus count the moment this is wired to the API. Nothing needs
 * redesigning when that happens.
 *
 * Wiring this up is Phase 2 work, tracked in ROADMAP.md.
 */

export type PlatformStats = {
  hotels: number;
  apartments: number;
  restaurants: number;
};

export async function getPlatformStats(): Promise<PlatformStats | null> {
  // Intentionally not implemented. See the note above.
  // Replace with a cached call to GET /api/v1/stats/inventory.
  return null;
}
