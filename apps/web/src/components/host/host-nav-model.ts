import type { UiIconName } from "@/design-system/icons/UiIcon";
import type { NavSection } from "@/components/app/nav-model";
import type { Dictionary } from "@vallo/i18n/core";

/**
 * The host workspace's destinations, as data.
 *
 * Every screen under `/host` used to be an island: the shell drew a back
 * control and a logo that went to the consumer home, so a venue owner on
 * Rooms could reach Photographs only by going back to `/host` first. These are
 * the seven working screens a host moves between. The application (`/host/apply`)
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

/**
 * THE WORDS, IN THE READER'S LANGUAGE (M-2, 29 September 2026). These labels
 * were English literals, so a Hausa, Yoruba or Igbo host read their whole
 * workspace map in a language they had not chosen. `HostShell` is a server
 * component: it reads the dictionary there with `hostNavLabels(t)` and hands
 * these plain strings to `HostNav` and `HostDrawer`, so the dictionary never
 * reaches the browser and the client copy every screen carries does not grow.
 */
export type HostNavLabels = {
  overview: string;
  reservations: string;
  roomBookings: string;
  rooms: string;
  photos: string;
  arrival: string;
  transfer: string;
  earnings: string;
  assistant: string;
  settings: string;
  account: string;
  accountSettings: string;
  help: string;
  workspace: string;
  openMenu: string;
  closeMenu: string;
  application: string;
  notifications: string;
  host: string;
};

export function hostNavLabels(t: Dictionary): HostNavLabels {
  return {
    ...t.hostNav,
    settings: t.nav.settings,
    account: t.nav.accountLabel,
    help: t.nav.helpSupport,
    workspace: t.nav.hostMode,
    notifications: t.nav.notifications,
  };
}

export const HOST_DASHBOARD = "/host";

type HostNavEntry = { href: string; key: keyof HostNavLabels; icon: UiIconName };

export const HOST_NAV: readonly HostNavEntry[] = [
  { href: HOST_DASHBOARD, key: "overview", icon: "grid" },
  { href: "/host/reservations", key: "reservations", icon: "calendar-booking" },
  /* ROOM BOOKINGS 1: guests' requests for rooms, to accept or decline. */
  { href: "/host/bookings", key: "roomBookings", icon: "calendar-check" },
  { href: "/host/rooms", key: "rooms", icon: "bed" },
  { href: "/host/photos", key: "photos", icon: "picture" },
  { href: "/host/arrival", key: "arrival", icon: "receipt" },
  { href: "/host/transfer", key: "transfer", icon: "key" },
  /* Read-only: what guests' payments paid this host, by Paystack split. */
  { href: "/host/earnings", key: "earnings", icon: "wallet" },
  /* THE WORKSPACE KEEPS ITS OWN ASSISTANT AND ITS OWN SETTINGS (29 September
     2026), so a host never leaves the console to ask a question or change
     what reaches them. Account-wide settings are one link away from the
     workspace's own. */
  { href: "/host/assistant", key: "assistant", icon: "sparkle" },
  { href: "/host/settings", key: "settings", icon: "settings-gear" },
];

/** The destinations with their words. */
export function hostNavItems(labels: HostNavLabels): HostNavItem[] {
  return HOST_NAV.map(({ href, key, icon }) => ({ href, label: labels[key], icon }));
}

const OWN = new Set(["/host/assistant", "/host/settings"]);

/** The drawer's rows: the workspace's destinations, then the way to the account. */
export function buildHostNav(labels: HostNavLabels): NavSection[] {
  const items = hostNavItems(labels);
  return [
    { heading: null, items: items.filter((item) => !OWN.has(item.href)) },
    {
      heading: labels.account,
      items: [
        ...items.filter((item) => OWN.has(item.href)),
        { href: "/settings", label: labels.accountSettings, icon: "user" },
        { href: "/support", label: labels.help, icon: "headset" },
      ],
    },
  ];
}

/** The bar's title for a host path: the destination's name, or the console's. */
export function hostTitleFor(labels: HostNavLabels, pathname: string | null | undefined): string {
  const active = hostNavActive(pathname);
  if (active) {
    const hit = HOST_NAV.find((item) => item.href === active);
    return hit ? labels[hit.key] : labels.host;
  }
  if (pathname?.startsWith("/host/apply")) return labels.application;
  if (pathname?.startsWith("/host/notifications")) return labels.notifications;
  return labels.host;
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
