import type { UiIconName } from "@/design-system/icons/UiIcon";

/**
 * THE SETTINGS AREA'S DESTINATIONS, for the glass inner navigation every
 * settings route carries (R3-08, settings half).
 *
 * English-only constants for now, like `lib/money/copy.ts`: `en.ts` is held by
 * another agent this round, so the dictionary keys for these labels are in the
 * C2 report as a patch. Client-safe.
 */
export type SettingsDestination = { id: string; href: string; label: string; icon: UiIconName };

export const SETTINGS_NAV_LABEL = "Settings";
export const SETTINGS_NAV_TOGGLE = "Settings sections";
export const SETTINGS_ON_THIS_PAGE = "On this page";

export const SETTINGS_DESTINATIONS: readonly SettingsDestination[] = [
  { id: "home", href: "/settings", label: "All settings", icon: "settings-gear" },
  { id: "account", href: "/settings/account", label: "Account information", icon: "user" },
  { id: "notifications", href: "/settings/notifications", label: "Notifications", icon: "bell" },
  { id: "appearance", href: "/settings/appearance", label: "Appearance", icon: "sun" },
  { id: "accessibility", href: "/settings/accessibility", label: "Accessibility", icon: "eye" },
  { id: "region", href: "/settings/region", label: "Language and currency", icon: "globe" },
  { id: "payments", href: "/settings/payments", label: "Payment methods", icon: "credit-card" },
  { id: "privacy", href: "/settings/privacy", label: "Privacy and security", icon: "shield-lock" },
  { id: "passcode", href: "/settings/passcode", label: "Passcode", icon: "lock" },
  { id: "phone", href: "/settings/phone", label: "Phone number", icon: "phone" },
  { id: "devices", href: "/settings/devices", label: "Devices", icon: "key" },
  { id: "passport", href: "/settings/passport", label: "Space Passport", icon: "id-card" },
  { id: "place", href: "/settings/place", label: "Your place", icon: "location" },
  { id: "interests", href: "/settings/interests", label: "Interests", icon: "heart" },
  { id: "invite", href: "/settings/invite", label: "Invite", icon: "share" },
  { id: "help", href: "/settings/help", label: "Help and support", icon: "headset" },
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
