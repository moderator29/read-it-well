import { CleanPreview } from "./CleanPreview";
import { ControlsPreview } from "./ControlsPreview";

/**
 * The controls spec sheet, page one. First the clean unified primitives
 * (docs/design/CLEAN_UNIFIED_DIRECTION.md), in the root theme and inside a
 * night island side by side; then every older control primitive in every
 * variant and state. Screenshotted by the preview harness in both themes.
 */
export default function G1PreviewPage() {
  return (
    <>
      <CleanPreview />
      <ControlsPreview />
    </>
  );
}
