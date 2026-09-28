import type { UiIconName } from "@/design-system/icons/UiIcon";

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
];

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
