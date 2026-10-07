"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { InnerNav, type InnerNavItem } from "@/components/ui/InnerNav";
import type { UiIconName } from "@/design-system/icons/UiIcon";
import { SETTINGS_DESTINATIONS, activeDestination, type SettingsAreaCopy } from "@/lib/settings/area";

/**
 * ONE GLASS INNER NAVIGATION ON EVERY SETTINGS ROUTE (R3-08).
 *
 * Mounted once by the settings layout, so all of the settings routes carry it
 * and none can forget to. Its items are the settings destinations, the current
 * one marked `aria-current`. A page with sections of its own (account,
 * privacy, notifications) registers them through `useSettingsSections`, and
 * they lead the list as anchors, so a screen never shows two pull menus.
 *
 * Its words are `experienceSettings.area`, handed down by the settings layout
 * (a server component that already holds the reader's dictionary), so the
 * menu reads the reader's language and the bundle carries no dictionary.
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

export function SettingsAreaNav({ copy, children }: { copy: SettingsAreaCopy; children: ReactNode }) {
  const pathname = usePathname() ?? "/settings";
  const [sections, setSections] = useState<readonly Section[] | null>(null);
  const active = activeDestination(pathname);
  const items = useMemo<InnerNavItem[]>(
    () => [
      ...(sections ?? []).map((s) => ({ id: `section-${s.id}`, label: `${copy.onThisPage}: ${s.label}`, href: `#${s.id}`, ...(s.icon ? { icon: s.icon } : {}) })),
      ...SETTINGS_DESTINATIONS.map((d) => ({ id: d.id, label: copy.destinations[d.id], icon: d.icon, href: d.href })),
    ],
    [sections, copy],
  );
  return (
    <SectionsContext.Provider value={setSections}>
      <div className="nf-settings-nav mx-auto flex max-w-2xl justify-end px-gutter pt-inline" data-testid="settings-area-nav">
        <InnerNav
          label={copy.label}
          toggleLabel={copy.toggle}
          items={items}
          activeId={active?.id}
          currentLabel={active ? copy.destinations[active.id] : copy.label}
        />
      </div>
      {children}
    </SectionsContext.Provider>
  );
}
