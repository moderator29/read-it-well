import type { Dictionary } from "@vallo/i18n/core";
import type { UiIconName } from "@/design-system/icons/UiIcon";

/**
 * THE SETTINGS AREA'S DESTINATIONS, for the glass inner navigation every
 * settings route carries (R3-08, settings half).
 *
 * Where each one goes and what it is drawn with. The words are in the
 * dictionary (`experienceSettings.area`, keyed by `id`), so the menu reads the
 * reader's language; the settings layout hands them to `SettingsAreaNav`.
 * Type-only import of the dictionary shape, so this stays client-safe.
 */
export type SettingsAreaCopy = Dictionary["experienceSettings"]["area"];
export type SettingsDestinationId = keyof SettingsAreaCopy["destinations"];
export type SettingsDestination = { id: SettingsDestinationId; href: string; icon: UiIconName };

export const SETTINGS_DESTINATIONS: readonly SettingsDestination[] = [
  { id: "home", href: "/settings", icon: "settings-gear" },
  { id: "account", href: "/settings/account", icon: "user" },
  { id: "notifications", href: "/settings/notifications", icon: "bell" },
  { id: "appearance", href: "/settings/appearance", icon: "sun" },
  { id: "accessibility", href: "/settings/accessibility", icon: "eye" },
  { id: "region", href: "/settings/region", icon: "globe" },
  { id: "payments", href: "/settings/payments", icon: "credit-card" },
  { id: "privacy", href: "/settings/privacy", icon: "shield-lock" },
  { id: "passcode", href: "/settings/passcode", icon: "lock" },
  { id: "phone", href: "/settings/phone", icon: "phone" },
  { id: "devices", href: "/settings/devices", icon: "key" },
  { id: "passport", href: "/settings/passport", icon: "id-card" },
  { id: "place", href: "/settings/place", icon: "location" },
  { id: "interests", href: "/settings/interests", icon: "heart" },
  { id: "invite", href: "/settings/invite", icon: "share" },
  { id: "help", href: "/settings/help", icon: "headset" },
];

/** The destination a pathname sits under: the longest href that prefixes it. */
export function activeDestination(pathname: string): SettingsDestination | null {
  const path = pathname.replace(/\/+$/, "") || "/";
  let best: SettingsDestination | null = null;
  for (const d of SETTINGS_DESTINATIONS) {
    if (path === d.href || path.startsWith(`${d.href}/`)) {
      if (!best || d.href.length > best.href.length) best = d;
    }
  }
  return best;
}
