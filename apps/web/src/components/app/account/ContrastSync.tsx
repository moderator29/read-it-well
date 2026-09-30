"use client";

import { useApplyDeviceSettings } from "./settings-store";

/**
 * B15 and the text size: keeps the stored "Increase contrast" and "Text size"
 * choices on the root on every member screen, not only once Settings has been
 * opened. The first frame is already right (the before-paint script in
 * `lib/theme/theme.ts`); this follows later changes. Renders nothing.
 */
export function ContrastSync() {
  useApplyDeviceSettings();
  return null;
}
