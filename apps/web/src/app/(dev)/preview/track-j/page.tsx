import { TilesHarness } from "./TilesHarness";

/**
 * Track J harness: the filter drawer's SPACE tiles with every shape the
 * product knows, because no live catalogue carries shapes yet and the drawer
 * only draws the group for shapes that are present.
 */
export default function TrackJPreview() {
  return (
    <main id="main" className="mx-auto max-w-xl p-gutter">
      <TilesHarness />
    </main>
  );
}
