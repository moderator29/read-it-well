"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { UiIconName } from "@/design-system/icons/UiIcon";
import type { SettingsAreaCopy } from "@/lib/settings/area";

/**
 * THE SETTINGS AREA'S CONTEXT. Until D78 this also drew a pull menu listing
 * every settings page on every settings route; that menu is gone (see the
 * component below). What remains is the context a page's own section menu
 * registers with, so a screen never draws two menus.
 */
type Section = { id: string; label: string; icon?: UiIconName };

const SectionsContext = createContext<((sections: readonly Section[] | null) => void) | null>(null);

/** Registers this page's own sections with the area nav; a no-op outside it. */
export function useSettingsSections(sections: readonly Section[]): boolean {
  const register = useContext(SectionsContext);
  const key = sections.map((s) => `${s.id}:${s.label}`).join("|");
  useEffect(() => {
    if (!register) return;
    register(sections);
    return () => register(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by content
  }, [register, key]);
  return register !== null;
}

export function SettingsAreaNav({ children }: { copy?: SettingsAreaCopy; children: ReactNode }) {
  /*
   * NO PULL MENU (D78, 7 October 2026, evening). The founder: the list of
   * every settings page that slid out on each settings route is removed;
   * everything lives on the Settings page itself, as its own rows, and a
   * settings page goes back to it. The provider stays so a page's own
   * section menu (`SettingsInnerNav`) still knows it is inside the area and
   * does not draw a second one.
   */
  const [, setSections] = useState<readonly Section[] | null>(null);
  return <SectionsContext.Provider value={setSections}>{children}</SectionsContext.Provider>;
}
