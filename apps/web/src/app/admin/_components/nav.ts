import type { UiIconName } from "@/design-system/icons/UiIcon";

/**
 * The console's destinations, in the order an operator works them: the
 * overview, then the two safety queues that must never sit unread, then the
 * two supply queues, then the human queues, then the switches. One list, shared
 * by the desktop rail and the phone tab strip, so the two cannot drift.
 */
export type AdminDestination = {
  key: string;
  href: string;
  label: string;
  short: string;
  icon: UiIconName;
};

export const ADMIN_NAV: AdminDestination[] = [
  { key: "overview", href: "/admin", label: "Overview", short: "Overview", icon: "grid" },
  { key: "flags", href: "/admin/flags", label: "Message flags", short: "Flags", icon: "chat-bubble" },
  { key: "alerts", href: "/admin/alerts", label: "Risk alerts", short: "Alerts", icon: "bell" },
  { key: "reports", href: "/admin/reports", label: "Reports", short: "Reports", icon: "search" },
  { key: "applications", href: "/admin/agents", label: "Agent applications", short: "Agents", icon: "user" },
  {
    key: "listings",
    href: "/admin/listings",
    label: "Listing review",
    short: "Listings",
    icon: "building-apartment",
  },
  { key: "tickets", href: "/admin/support", label: "Support", short: "Support", icon: "ticket" },
  { key: "switches", href: "/admin/switches", label: "Switches", short: "Switches", icon: "key" },
];
