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
  // Held sits with the safety queues and immediately after the message flags,
  // because a held post is somebody's words stopped mid-sentence and the author
  // has already been told a person is looking at them.
  { key: "moderation", href: "/admin/moderation", icon: "sliders" },
  { key: "alerts", href: "/admin/alerts", icon: "bell" },
  { key: "reports", href: "/admin/reports", icon: "search" },
  { key: "applications", href: "/admin/agents", icon: "user" },
  { key: "listings", href: "/admin/listings", icon: "building-apartment" },
  // Stays sits between the supply queues and the human ones, because it is
  // both: a stay is a property's calendar and somebody's money at once. It
  // carries no badge, deliberately. Nothing on it is waiting on a decision,
  // and a number beside it would read as work that is not there.
  { key: "bookings", href: "/admin/bookings", icon: "calendar-booking" },
  { key: "tickets", href: "/admin/support", icon: "ticket" },
  // Around sits with the human queues rather than the safety ones: a place
  // waiting to open is somebody hoping for an answer, not an incident.
  { key: "social", href: "/admin/social", icon: "compass" },
  // Standing sits with the human queues: granting a badge by hand is a
  // judgement about a person, not an incident to clear.
  { key: "standing", href: "/admin/standing", icon: "star" },
  // Reference data is the platform's own vocabulary: the occupations and the
  // local governments every profile picks from. It sits with the switches
  // because both are settings for the platform rather than queues of people.
  { key: "reference", href: "/admin/reference", icon: "grid" },
  { key: "switches", href: "/admin/switches", icon: "key" },
];
