import type { Dictionary } from "@vallo/i18n";
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
  key: AdminNavKey | MoneyNavKey;
  href: string;
  icon: UiIconName;
  /**
   * An English label, for a destination the dictionary does not carry yet.
   *
   * The four money sections were added after the dictionary was written, and
   * packages/i18n is not this app's to change. A hardcoded English string is
   * honest about that; inventing a key that resolves to undefined and renders a
   * blank rail entry would not be. When the translations land, the key moves
   * into Dictionary["admin"]["nav"] and this field comes off.
   */
  label?: string;
};

/** Destinations whose labels are not in the dictionary yet. See `label` above. */
type MoneyNavKey = "money" | "escrow" | "kyc" | "fees" | "payments" | "examples";

/**
 * A band of the rail, and the reason the rail has bands at all.
 *
 * There are nineteen destinations. As one unbroken column that is nineteen
 * labels to read before the eye finds the one it wants, and the ordering
 * argument that the comments below spend paragraphs making - safety first,
 * then supply, then people, then money, then settings - was invisible on
 * screen. It existed only in this file, for whoever opened this file.
 *
 * The bands make it visible. Nothing moved: the order is exactly what it was,
 * and the headings name the reasoning that was already here.
 *
 * THE HEADINGS ARE ENGLISH, for the same reason the money destinations carry
 * an English `label`. `Dictionary` is a closed type and ha, ig and yo are all
 * declared as one, so a new key is four translations or a type error, and
 * inventing three of them is worse than one honest English word. When the
 * console's copy is next translated these move into the dictionary with the
 * rest of `admin.nav`.
 */
export type AdminGroup = {
  key: string;
  /** Null for the first band: the overview needs no heading above it. */
  heading: string | null;
  items: AdminDestination[];
};

export const ADMIN_NAV_GROUPS: AdminGroup[] = [
  { key: "start", heading: null, items: [{ key: "overview", href: "/admin", icon: "grid" }] },
  {
    key: "safety",
    heading: "Safety",
    items: [
      { key: "flags", href: "/admin/flags", icon: "chat-bubble" },
      // Held sits with the safety queues and immediately after the message
      // flags, because a held post is somebody's words stopped mid-sentence and
      // the author has already been told a person is looking at them.
      { key: "moderation", href: "/admin/moderation", icon: "sliders" },
      { key: "alerts", href: "/admin/alerts", icon: "bell" },
      { key: "reports", href: "/admin/reports", icon: "search" },
    ],
  },
  {
    key: "supply",
    heading: "Supply",
    items: [
      { key: "applications", href: "/admin/agents", icon: "user" },
      // Stops sits immediately after applications, because it is the other half
      // of the same relationship: one screen decides whether somebody may
      // trade, this one decides whether they still may. It carries a count, and
      // the count is people currently stopped rather than work waiting, because
      // an agent left stopped and forgotten is the failure this screen exists
      // to prevent.
      { key: "stops", href: "/admin/stops", icon: "shield-stop" },
      { key: "listings", href: "/admin/listings", icon: "building-apartment" },
      // Stays sits between the supply queues and the human ones, because it is
      // both: a stay is a property's calendar and somebody's money at once. It
      // carries no badge, deliberately. Nothing on it is waiting on a decision,
      // and a number beside it would read as work that is not there.
      { key: "bookings", href: "/admin/bookings", icon: "calendar-booking" },
    ],
  },
  {
    key: "people",
    heading: "People",
    items: [
      { key: "tickets", href: "/admin/support", icon: "ticket" },
      // Around sits with the human queues rather than the safety ones: a place
      // waiting to open is somebody hoping for an answer, not an incident.
      { key: "social", href: "/admin/social", icon: "compass" },
      // Standing sits with the human queues: granting a badge by hand is a
      // judgement about a person, not an incident to clear.
      { key: "standing", href: "/admin/standing", icon: "star" },
    ],
  },
  /*
   * The money block, and it sits here rather than at the top for a reason.
   *
   * The safety queues above it are things that must never sit unread: a flagged
   * message, a held post, a risk alert. Money is not that shape. An operator
   * comes to these because somebody asked them a question, or because they are
   * looking at a dispute. Putting a wallet list above a message flag would push
   * the queues that decay down the rail.
   *
   * Escrow carries the dispute count as a badge and Money, Fees and Verification
   * carry nothing, deliberately. A wallet list and a rate table are not work
   * waiting.
   */
  {
    key: "money",
    heading: "Money",
    items: [
      { key: "money", href: "/admin/money", icon: "wallet", label: "Wallets" },
      { key: "escrow", href: "/admin/escrow", icon: "shield-stop", label: "Escrow" },
      /*
       * Payments sits directly under escrow, and it is the one entry in this
       * block that CAN carry work waiting.
       *
       * The note above says a wallet list and a rate table are not a queue, and
       * that is still true of Wallets and Fees. Payments is different in kind:
       * an overdrawn wallet and a withdrawal frozen past its window are both
       * somebody short of their own money right now, which is the same shape as
       * a dispute and belongs beside it rather than below the reference data.
       */
      { key: "payments", href: "/admin/payments", icon: "wallet", label: "Payments" },
      { key: "kyc", href: "/admin/kyc", icon: "verified", label: "Verification" },
      { key: "fees", href: "/admin/fees", icon: "document", label: "Fees" },
    ],
  },
  /*
   * Settings, which is where the platform's own configuration lives rather than
   * anybody's work. Reference data is the vocabulary every profile picks from:
   * the occupations and the local governments. Examples is the seeded stock,
   * and the badge it carries counts rows past the date somebody recorded for
   * them rather than people waiting on an answer.
   */
  {
    key: "platform",
    heading: "Platform",
    items: [
      { key: "examples", href: "/admin/examples", icon: "building-apartment", label: "Examples" },
      { key: "reference", href: "/admin/reference", icon: "grid" },
      { key: "switches", href: "/admin/switches", icon: "key" },
    ],
  },
];

/**
 * The same destinations, flat, in the same order.
 *
 * The phone tab strip is a single scrollable row and has nowhere to put a
 * heading, so it reads this. Derived rather than written out, so the two can
 * never come to hold different destinations.
 */
export const ADMIN_NAV: AdminDestination[] = ADMIN_NAV_GROUPS.flatMap((group) => group.items);
