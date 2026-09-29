import type { UiIconName } from "@/design-system/icons/UiIcon";
import type { NavSection } from "@/components/app/nav-model";

/**
 * The host workspace's destinations, as data.
 *
 * Every screen under `/host` used to be an island: the shell drew a back
 * control and a logo that went to the consumer home, so a venue owner on
 * Rooms could reach Photographs only by going back to `/host` first. These are
 * the six working screens a host moves between. The application (`/host/apply`)
 * and the kind chooser (`/host/start`) are flows, not destinations, and their
 * shell draws no bar (`HostShell`'s `nav`).
 *
 * Each screen already picks the host's first business when none is named, so
 * a destination carries no `?business=`. What each one may show is decided on
 * the server under the host's own RLS; this list is only where the doors are.
 */
export type HostNavItem = {
  href: string;
  label: string;
  icon: UiIconName;
};

export const HOST_DASHBOARD = "/host";

export const HOST_NAV: readonly HostNavItem[] = [
  { href: HOST_DASHBOARD, label: "Overview", icon: "grid" },
  { href: "/host/reservations", label: "Reservations", icon: "calendar-booking" },
  { href: "/host/rooms", label: "Rooms and nights", icon: "bed" },
  { href: "/host/photos", label: "Photographs", icon: "picture" },
  { href: "/host/arrival", label: "Charges at the door", icon: "price-tag" },
  { href: "/host/transfer", label: "Hand over", icon: "key" },
  /* THE WORKSPACE KEEPS ITS OWN ASSISTANT AND ITS OWN SETTINGS (29 September
     2026), so a host never leaves the console to ask a question or change
     what reaches them. Account-wide settings are one link away from the
     workspace's own. */
  { href: "/host/assistant", label: "Assistant", icon: "sparkle" },
  { href: "/host/settings", label: "Settings", icon: "settings-gear" },
];

/** The drawer's rows: the workspace's destinations, then the way to the account. */
export function buildHostNav(): NavSection[] {
  const working = HOST_NAV.filter((item) => item.href !== "/host/assistant" && item.href !== "/host/settings");
  const own = HOST_NAV.filter((item) => item.href === "/host/assistant" || item.href === "/host/settings");
  return [
    { heading: null, items: [...working] },
    {
      heading: "Account",
      items: [
        ...own,
        { href: "/settings", label: "Account settings", icon: "user" },
        { href: "/support", label: "Help and support", icon: "ticket" },
      ],
    },
  ];
}

/** The bar's title for a host path: the destination's name, or the console's. */
export function hostTitleFor(pathname: string | null | undefined): string {
  const active = hostNavActive(pathname);
  if (active) return HOST_NAV.find((item) => item.href === active)?.label ?? "Host";
  if (pathname?.startsWith("/host/apply")) return "Application";
  if (pathname?.startsWith("/host/notifications")) return "Notifications";
  return "Host";
}

/**
 * Which destination a path belongs to, or null.
 *
 * The overview matches exactly, because every host path starts with `/host`
 * and a prefix match would light it on every screen. The rest match their own
 * subtree.
 */
export function hostNavActive(pathname: string | null | undefined): string | null {
  if (!pathname) return null;
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (path === HOST_DASHBOARD) return HOST_DASHBOARD;
  const hit = HOST_NAV.find(
    (item) => item.href !== HOST_DASHBOARD && (path === item.href || path.startsWith(`${item.href}/`)),
  );
  return hit?.href ?? null;
}
