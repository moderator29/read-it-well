"use client";

import { useEffect } from "react";
import { applyContrast, useNfSettings } from "./settings-store";

/**
 * B15: puts the stored "Increase contrast" choice on the root on every member
 * screen, not only once Settings has been opened. Renders nothing.
 */
export function ContrastSync() {
  const { settings } = useNfSettings();
  useEffect(() => {
    applyContrast(settings.increaseContrast);
  }, [settings.increaseContrast]);
  return null;
}
