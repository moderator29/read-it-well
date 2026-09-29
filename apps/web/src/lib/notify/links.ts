import type { NotificationRow } from "./inbox";

/**
 * Where a notification row opens.
 *
 * `public.notifications.href` is written by database functions and by the
 * service role, never by a client, but it is still a string from storage
 * handed to a link. This is the one place the inbox turns it into a
 * destination, for two reasons:
 *
 *   1. AN IN-APP PATH OR NOTHING. A value that is not a same-origin path
 *      (`https://...`, `//host`, `/\host`, `javascript:`) becomes null, and
 *      the row renders as a button that only marks it read. The inbox never
 *      navigates off the site on the strength of a stored string.
 *
 *   2. ROWS WRITTEN BEFORE A LINK WAS FIXED. Fixing a database function only
 *      changes rows written afterwards. The rows below were written with a
 *      link that has since been corrected at the source (migration
 *      `20260928234231_notification_links_open_real_routes`), so rows already
 *      sitting in somebody's inbox open the corrected place too:
 *
 *        /events/<id>  -> /around   there has never been an /events route;
 *                                   new rows link the event's own place
 *        /verify       -> /verification   the page the redirect lands on
 *
 * Anything else is passed through unchanged, including the links that reach
 * their page through a next.config redirect (`/trips`, `/inspections`,
 * `/wallet`, `/agent`), because the redirect is the single statement of where
 * those go and a second copy here would drift from it.
 */
const LEGACY: readonly { match: RegExp; to: string }[] = [
  { match: /^\/events(?:\/[^?#]*)?(?:[?#].*)?$/, to: "/around" },
  { match: /^\/verify(?:[?#].*)?$/, to: "/verification" },
];

export function notificationHref(href: string | null | undefined): string | null {
  const value = (href ?? "").trim();
  if (value.length === 0) return null;
  /* Same origin only: one leading slash, not two, and no backslash that a
     browser would normalise into a second one. No control character either:
     a URL parser strips tab and newline, so "/\t/evil.com" would become
     "//evil.com", another host. And, as the final word, the value resolved
     against a placeholder origin must still be on that origin. */
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null;
  if (/[\u0000-\u001F\u007F]/.test(value)) return null;
  const PLACEHOLDER = "https://in-app.invalid";
  try {
    if (new URL(value, PLACEHOLDER).origin !== PLACEHOLDER) return null;
  } catch {
    return null;
  }
  for (const { match, to } of LEGACY) {
    if (match.test(value)) return to;
  }
  return value;
}

/** One inbox row as the screen draws it. */
export type NotificationItem = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  /** Already through `notificationHref`: an in-app path, or null. */
  href: string | null;
  read: boolean;
  createdAt: string;
};

/** A stored row, server-loaded or arriving over realtime, as the screen draws it. */
export function toNotificationItem(
  row: Pick<NotificationRow, "id" | "kind" | "title" | "body" | "href" | "read_at" | "created_at">,
): NotificationItem {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    href: notificationHref(row.href),
    read: row.read_at !== null,
    createdAt: row.created_at,
  };
}
