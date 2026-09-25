import type { Dictionary } from "@vallo/i18n";
import type { UiIconName } from "@/design-system/icons/UiIcon";
import type { AdminGlyphName, AdminIcon } from "./AdminGlyph";

export type { AdminIcon };

/**
 * The console's map, in the order the governing renders draw it (5EAA44CB,
 * 01F7DFC7, 8E9602E2, C1D98B3C): Overview, Listings, Supply, Verification,
 * Money, Agreements, Bookings, Moderation, Support, Operations, Analytics, and
 * Settings on its own at the foot.
 *
 * The renders draw twelve rows. The console has more desks than that, and
 * none of them is dropped: every desk that is not one of the twelve is a
 * CHILD of the row it belongs to. A child is listed under its parent while
 * the operator is inside that section, it lights the parent while it is open,
 * and every child is also in the "All desks" list at the foot of the rail, so
 * no working desk is ever more than one click away.
 *
 * The words are English. The twelve names are the renders' own and the
 * dictionary's `admin.nav` shape predates them; a destination whose key the
 * dictionary does carry still reads the translated label first.
 */
export type AdminNavKey = keyof Dictionary["admin"]["nav"];

export type AdminDestination = {
  key: string;
  href: string;
  icon: AdminIcon;
  label: string;
  /**
   * The `getQueueCounts()` key whose figure this row carries as its badge:
   * work waiting on THIS desk, the same figure the desk itself shows.
   */
  countKeys?: readonly string[];
  /** What the badge counts, read out and shown as its tooltip ("3 flagged messages waiting"). */
  countLabel?: string;
  children?: AdminDestination[];
};

const ui = (name: UiIconName): AdminIcon => ({ tier: "ui", name });
const glyph = (name: AdminGlyphName): AdminIcon => ({ tier: "admin", name });

export const ADMIN_PRIMARY: AdminDestination[] = [
  {
    key: "overview",
    href: "/admin",
    icon: glyph("home-solid"),
    label: "Overview",
    children: [
      {
        key: "queue",
        href: "/admin/queue",
        icon: ui("panel-left"),
        label: "Unified queue",
        /* V-88: reports, flags and held content are lanes of the queue now. */
        countKeys: ["reports", "flags", "moderation"],
        countLabel: "reports, flagged messages and held content waiting on a decision",
      },
    ],
  },
  {
    key: "listings",
    href: "/admin/listings",
    icon: glyph("clipboard"),
    label: "Listings",
    countKeys: ["listings"],
    countLabel: "listings waiting on a review decision",
  },
  {
    key: "supply",
    href: "/admin/supply",
    icon: glyph("list-doc"),
    label: "Supply",
    children: [
      { key: "applications", href: "/admin/agents", icon: ui("user"), label: "Applications", countKeys: ["applications"], countLabel: "applications waiting on a decision" },
      { key: "businesses", href: "/admin/businesses", icon: ui("building-hotel"), label: "Businesses" },
      { key: "stops", href: "/admin/stops", icon: ui("shield-stop"), label: "Stops" },
    ],
  },
  {
    key: "kyc",
    href: "/admin/kyc",
    icon: glyph("check-square"),
    label: "Verification",
    /* SCUML: the AML/CFT duties, one lane each. */
    children: [{ key: "compliance", href: "/admin/compliance", icon: glyph("shield-lock"), label: "Compliance" }],
  },
  {
    key: "money",
    href: "/admin/money",
    icon: glyph("naira-square"),
    label: "Money",
    children: [
      { key: "payments", href: "/admin/payments", icon: ui("wallet"), label: "Payments" },
      { key: "fees", href: "/admin/fees", icon: ui("document"), label: "Fees" },
    ],
  },
  /* TRACK A: the escrow desk is retired (Vallo holds no money). Its place is
     the review gate between an agreement and payment. */
  {
    key: "agreements",
    href: "/admin/agreements",
    icon: glyph("shield-lock"),
    label: "Agreements",
    countKeys: ["agreements"],
    countLabel: "agreements waiting for review before payment opens",
  },
  { key: "bookings", href: "/admin/bookings", icon: ui("calendar-booking"), label: "Bookings" },
  {
    /* V-88: Moderation keeps what is not a queue. Its three queues (message
       flags, reports, held content) are lanes of the unified queue. */
    key: "moderation",
    href: "/admin/social",
    icon: glyph("moderation"),
    label: "Moderation",
    children: [
      { key: "social", href: "/admin/social", icon: ui("compass"), label: "Around" },
      { key: "standing", href: "/admin/standing", icon: ui("star"), label: "Standing" },
    ],
  },
  { key: "tickets", href: "/admin/support", icon: glyph("support"), label: "Support", countKeys: ["tickets"], countLabel: "support tickets open or pending" },
  {
    key: "operations",
    href: "/admin/operations",
    icon: glyph("operations"),
    label: "Operations",
    countKeys: ["alerts"],
    countLabel: "alerts open, waiting on a person",
    children: [
      { key: "alerts", href: "/admin/alerts", icon: ui("bell"), label: "Alerts", countKeys: ["alerts"], countLabel: "alerts open, waiting on a person" },
      { key: "audit", href: "/admin/audit", icon: ui("history"), label: "Audit log" },
    ],
  },
  { key: "analytics", href: "/admin/analytics", icon: glyph("bars"), label: "Analytics" },
];

export const ADMIN_SETTINGS: AdminDestination = {
  key: "settings",
  href: "/admin/settings",
  icon: ui("settings-gear"),
  label: "Settings",
  children: [
    { key: "switches", href: "/admin/switches", icon: ui("key"), label: "Switches" },
    { key: "reference", href: "/admin/reference", icon: ui("grid"), label: "Reference data" },
    { key: "examples", href: "/admin/examples", icon: ui("building-apartment"), label: "Examples" },
    /* Track K: who holds staff access (super admin only) and the handbook. */
    { key: "staff", href: "/admin/staff", icon: ui("user"), label: "Staff" },
    { key: "handbook", href: "/admin/handbook", icon: ui("document"), label: "Staff handbook" },
  ],
};

/** Every destination, parents first then their children, in rail order. */
export const ADMIN_NAV: AdminDestination[] = [...ADMIN_PRIMARY, ADMIN_SETTINGS].flatMap((item) => [
  item,
  ...(item.children ?? []),
]);

/** The desks that are not one of the twelve rows, for the "All desks" list. */
export const ADMIN_SECONDARY: AdminDestination[] = [...ADMIN_PRIMARY, ADMIN_SETTINGS].flatMap(
  (item) => item.children ?? [],
);

export function isActiveHref(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** A parent row is lit when it, or any of its children, is the open page. */
export function isSectionActive(pathname: string, item: AdminDestination): boolean {
  if (isActiveHref(pathname, item.href)) return true;
  return (item.children ?? []).some((child) => isActiveHref(pathname, child.href));
}

export function countFor(item: AdminDestination, counts: Record<string, number>): number {
  return (item.countKeys ?? []).reduce((total, key) => total + (counts[key] ?? 0), 0);
}

/** The destination the open page belongs to, child first. */
export function currentDestination(pathname: string): AdminDestination | undefined {
  const child = ADMIN_SECONDARY.find((item) => isActiveHref(pathname, item.href));
  if (child) return child;
  return [...ADMIN_PRIMARY, ADMIN_SETTINGS].find((item) => isSectionActive(pathname, item));
}

export type ShellCopy = Dictionary["admin"]["shell"];

/** A destination's name in the reader's language, English where none is written yet. */
export function labelFor(item: AdminDestination, shell?: ShellCopy): string {
  const fromDictionary = shell ? (shell.nav as Record<string, string | undefined>)[item.key] : undefined;
  return fromDictionary ?? item.label;
}

/** What a destination's badge counts, in the reader's language. */
export function countLabelFor(item: AdminDestination, shell?: ShellCopy): string {
  const key = item.countKeys?.[0];
  const fromDictionary = shell && key ? (shell.counts as Record<string, string | undefined>)[key] : undefined;
  return fromDictionary ?? item.countLabel ?? "waiting";
}
