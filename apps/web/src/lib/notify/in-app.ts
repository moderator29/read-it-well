import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

/**
 * THE ONE DOOR FOR AN IN-APP NOTICE WRITTEN FROM THE APP.
 *
 * `private.notify` is the database's door into `public.notifications`: it
 * honours the person's Bookings and Messages switches (profiles.settings
 * .notifications.bookings and .messages, an explicit false silences) and then
 * writes the one row that the push and WhatsApp triggers hang off. Every
 * server action that wrote a row straight into the table skipped that check,
 * so a person who had switched Bookings off still got "Your booking request
 * was not accepted" and a table decision in the bell and on the lock screen.
 *
 * This is the same rule, in the app, for the writes the app has to make with
 * the service role (a host declining, staff deciding, an announcement, a cron
 * run). The mapping below is `private.notify`'s, one for one:
 *
 *   booking -> the Bookings switch
 *   message -> the Messages switch
 *   every other kind -> no switch claims to govern it, so it is written
 *
 * FAIL OPEN, LIKE THE DATABASE. A missing profile, a missing key, a malformed
 * settings document or a profile read that fails all mean "they never said
 * no": the notice is written. Only an explicit `false` silences.
 *
 * Nothing in here throws. A failed insert comes back as an error for the
 * caller to treat as it always did.
 */

export type NoticeKind = Database["public"]["Enums"]["notification_kind"];

/** The switches on /settings that govern a notification kind. */
export type NoticeSwitch = "bookings" | "messages";

/** One row for `public.notifications`, as the app writes it. */
export type NoticeRow = {
  user_id: string;
  kind: NoticeKind;
  title: string;
  body: string;
  href: string;
};

export type NoticeResult = {
  /** Rows written. */
  written: number;
  /** Rows left out because the person had switched that kind off. */
  skipped: number;
  /** The insert's error, or null. A skip is not an error. */
  error: { message: string } | null;
};

/** `private.notify`'s mapping from a kind to the switch that governs it. */
export function switchForKind(kind: NoticeKind): NoticeSwitch | null {
  if (kind === "booking") return "bookings";
  if (kind === "message") return "messages";
  return null;
}

/**
 * Has this person explicitly switched this off? Reads a `profiles.settings`
 * document. Only a boolean false counts, exactly as in `private.notify`.
 */
export function settingsSwitchIsOff(settings: unknown, key: string): boolean {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return false;
  const notifications = (settings as Record<string, unknown>)["notifications"];
  if (!notifications || typeof notifications !== "object" || Array.isArray(notifications)) return false;
  return (notifications as Record<string, unknown>)[key] === false;
}

type Client = SupabaseClient<Database>;

/** The people, among these, who have switched `key` off. Fails open. */
async function peopleWhoSwitchedOff(client: Client, userIds: string[], key: NoticeSwitch): Promise<Set<string>> {
  const off = new Set<string>();
  if (userIds.length === 0) return off;
  try {
    const { data, error } = await client.from("profiles").select("id, settings").in("id", userIds);
    if (error || !Array.isArray(data)) return off;
    for (const row of data as { id: string; settings: unknown }[]) {
      if (settingsSwitchIsOff(row.settings, key)) off.add(row.id);
    }
  } catch {
    /* Unreadable: nobody is silenced. */
  }
  return off;
}

/**
 * Write these notices, leaving out the ones the person has switched off.
 *
 * One profile read for all the governed rows, then one insert for the rest.
 * A single row is inserted as an object and several as an array, which is what
 * the callers always did.
 */
export async function writeInAppNotices(client: Client, notices: NoticeRow[]): Promise<NoticeResult> {
  if (notices.length === 0) return { written: 0, skipped: 0, error: null };

  const switched = new Map<NoticeSwitch, Set<string>>();
  for (const key of ["bookings", "messages"] as const) {
    const ids = [
      ...new Set(notices.filter((n) => switchForKind(n.kind) === key).map((n) => n.user_id)),
    ];
    if (ids.length > 0) switched.set(key, await peopleWhoSwitchedOff(client, ids, key));
  }

  const keep = notices.filter((n) => {
    const key = switchForKind(n.kind);
    return key === null || !switched.get(key)?.has(n.user_id);
  });
  const skipped = notices.length - keep.length;
  if (keep.length === 0) return { written: 0, skipped, error: null };

  try {
    const first = keep[0]!;
    const { error } = keep.length === 1 ? await client.from("notifications").insert(first) : await client.from("notifications").insert(keep);
    if (error) return { written: 0, skipped, error: { message: error.message } };
    return { written: keep.length, skipped, error: null };
  } catch (cause) {
    return { written: 0, skipped, error: { message: cause instanceof Error ? cause.message : "insert failed" } };
  }
}

/** One notice, through the same door. */
export async function writeInAppNotice(client: Client, notice: NoticeRow): Promise<NoticeResult> {
  return writeInAppNotices(client, [notice]);
}
