"use client";

import { InnerNav, type InnerNavItem } from "@/components/ui/InnerNav";
import type { UiIconName } from "@/design-system/icons/UiIcon";

/**
 * SECOND-LEVEL NAVIGATION INSIDE A SETTINGS SCREEN THAT HAS SECTIONS.
 *
 * `COMPONENT_LIBRARY.md` names settings as a home for the glass navigation:
 * never the dock or the side navigation, only a place with its own internal
 * structure. The account, privacy and notifications screens each hold several
 * sections, so the pull menu jumps between them by anchor, where the reader
 * would otherwise scroll past three screens of rows to find one.
 *
 * It is a thin client wrapper so the server page can pass plain data; the
 * pull, the spring, the haptic and the keyboard behaviour are `InnerNav`'s.
 * The sections are real anchors (`#settings-place`), so a link to one still
 * works with the menu closed.
 */
export type SettingsSection = { id: string; label: string; icon?: UiIconName };

export function SettingsInnerNav({
  label,
  toggleLabel,
  sections,
  currentLabel,
}: {
  label: string;
  toggleLabel: string;
  sections: readonly SettingsSection[];
  /** The page's own name, drawn beside the toggle. */
  currentLabel: string;
}) {
  const items: InnerNavItem[] = sections.map((section) => ({
    id: section.id,
    label: section.label,
    ...(section.icon ? { icon: section.icon } : {}),
    href: `#${section.id}`,
  }));
  return (
    <div className="nf-settings-nav" data-testid="settings-inner-nav">
      <InnerNav label={label} toggleLabel={toggleLabel} items={items} currentLabel={currentLabel} />
    </div>
  );
}
