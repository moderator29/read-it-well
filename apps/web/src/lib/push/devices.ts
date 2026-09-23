import "server-only";

import { resolveSession } from "@/lib/actions/session";
import { sessionWhen, type SessionWhen } from "@/lib/security/when";
import type { PushPlatform } from "./schema";

/**
 * THE DEVICES A PERSON CAN BE REACHED ON, READ FOR THEIR OWN EYES.
 *
 * ===========================================================================
 * WITHOUT THIS SCREEN, PUSH IS A PERMISSION SOMEBODY CAN GRANT AND CANNOT
 * WITHDRAW except by uninstalling the application, which is not a setting, it
 * is an ultimatum. That is the whole reason this file exists and it is worth
 * saying before anything technical.
 *
 * ===========================================================================
 * WHAT IS SELECTED, AND WHAT IS NOT, AND THE NOT IS THE IMPORTANT HALF.
 *
 * `push_tokens.token` IS A CAPABILITY. Whoever holds it can notify that
 * handset for as long as it lives. The table's own column comment says so.
 * It is not selected here, not by name and not by `*`, and it is not in the
 * row type below, so there is no expression anywhere downstream that could
 * put it into a log line, an error, an analytics event or a screenshot.
 *
 * `device_ref` is what a device is NAMED by: twelve hex characters generated
 * from the token by the database, non-reversible, and safe to show, read
 * aloud or write down. A person with two Android phones can tell their rows
 * apart by it and nobody who sees it can reach either handset.
 *
 * ===========================================================================
 * ONE THING FOUND WHILE WRITING THIS, RECORDED RATHER THAN QUIETLY FIXED.
 *
 * `20260923092729` grants `SELECT` on the whole table to `authenticated`, and
 * a whole-table grant includes `token`. Row level security still limits it to
 * the reader's own rows, so nobody reads anybody else's, but a person's own
 * push token is reachable from their own browser through PostgREST. Confirmed
 * on the live project with `has_column_privilege`, which answers about the
 * object rather than about the observer. A column-level grant would be
 * tighter. It is not changed from here: narrowing a live grant is a privilege
 * change on a shared table, and it belongs in a migration somebody has read,
 * not in a settings screen.
 */

export type PushDeviceRow = {
  /** For the revoke call. Not a capability: every write is scoped by owner. */
  id: string;
  platform: PushPlatform;
  /** Coarse and chosen by the client. Never a raw User-Agent. */
  label: string | null;
  /** The safe handle. Generated from the token and not reversible. */
  ref: string;
  lastSeen: SessionWhen;
  firstSeen: SessionWhen;
};

export type PushDevicesState =
  | { state: "unconfigured" }
  | { state: "signed-out" }
  /** `readable: false` is a failed read, which is not an empty list. */
  | { state: "signed-in"; devices: PushDeviceRow[]; readable: boolean };

/**
 * This person's live devices, newest contact first.
 *
 * Read through the RLS-bound client rather than the service role, so the
 * ownership filter is the database's and not a `.eq()` somebody could forget.
 * There is no `user_id` in the query at all and that is deliberate: a filter
 * that is not written cannot be written wrongly.
 */
export async function loadPushDevices(now: number = Date.now()): Promise<PushDevicesState> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return { state: "unconfigured" };
  if (session.state === "signed-out") return { state: "signed-out" };

  const { data, error } = await session.supabase
    .from("push_tokens")
    /* Named columns. Never `*`: a `*` here would start carrying the token the
       day somebody adds a column, and it would do it silently. */
    .select("id, platform, device_label, device_ref, last_seen_at, created_at")
    .is("revoked_at", null)
    .order("last_seen_at", { ascending: false })
    .limit(50);

  if (error) return { state: "signed-in", devices: [], readable: false };

  const devices = (data ?? []).map((row) => ({
    id: row.id,
    platform: row.platform,
    label: row.device_label,
    ref: row.device_ref,
    lastSeen: sessionWhen(row.last_seen_at, now),
    firstSeen: sessionWhen(row.created_at, now),
  }));

  return { state: "signed-in", devices, readable: true };
}

/**
 * A name for a device that is a person's own words for it, not a model string.
 *
 * `device_label` is chosen by the client from a short fixed list and may be
 * absent on a row written by an older build. "This device" is not a lie in
 * that case and it is not a placeholder either; it is exactly as much as is
 * known, and the `ref` beside it does the distinguishing.
 */
export function deviceName(row: PushDeviceRow): string {
  if (row.label && row.label.trim().length > 0) return row.label;
  if (row.platform === "ios") return "iPhone or iPad";
  if (row.platform === "android") return "Android phone";
  return "A browser";
}

/** The five `SessionWhen` shapes as one English phrase for "last reached". */
export function whenPhrase(when: SessionWhen): string {
  switch (when.kind) {
    case "now":
      return "Just now";
    case "minutes":
      return when.minutes === 1 ? "1 minute ago" : `${when.minutes} minutes ago`;
    case "today":
      return `Today at ${when.time}`;
    case "yesterday":
      return `Yesterday at ${when.time}`;
    case "date":
      return when.date;
    default:
      /* The timestamp was unusable. Saying nothing is better than "Invalid
         Date", and better than inventing a time on a screen about trust. */
      return "Not recorded";
  }
}
