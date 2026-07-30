import type { Dictionary } from "@naijafinds/i18n";
import type { UiIconName } from "@/design-system/icons/UiIcon";

/**
 * The console's destinations, in the order an operator works them: the
 * overview, then the two safety queues that must never sit unread, then the
 * two supply queues, then the human queues, then the switches. One list, shared
 * by the desktop rail and the phone tab strip, so the two cannot drift.
 *
 * The list carries no words. Each key names a dictionary entry, so the rail, the
 * tab strip and the queue counts all read from the same place and the labels
 * follow the reader's language.
 */
export type AdminNavKey = keyof Dictionary["admin"]["nav"];

export type AdminDestination = {
  key: AdminNavKey;
  href: string;
  icon: UiIconName;
};

export const ADMIN_NAV: AdminDestination[] = [
  { key: "overview", href: "/admin", icon: "grid" },
  { key: "flags", href: "/admin/flags", icon: "chat-bubble" },
  { key: "alerts", href: "/admin/alerts", icon: "bell" },
  { key: "reports", href: "/admin/reports", icon: "search" },
  { key: "applications", href: "/admin/agents", icon: "user" },
  { key: "listings", href: "/admin/listings", icon: "building-apartment" },
  { key: "tickets", href: "/admin/support", icon: "ticket" },
  { key: "switches", href: "/admin/switches", icon: "key" },
];
