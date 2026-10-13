import "server-only";

import { resolveSession } from "@/lib/actions/session";
import { reportReadFault } from "@/lib/observability/read-error";
import { factsFrom, settingsFrom, type PassportFacts, type PassportSettings } from "./model";

/**
 * THE VALLO PASSPORT'S READS.
 *
 * Three doors, all through the caller's own client, all answering to the
 * database and not to this file:
 *
 *   readPassportOf     another member's passport, or a refusal. The function
 *                      `passport_read` answers only to a signed-in member, a
 *                      subject who has it on and no block between the two, and
 *                      it nulls every line the subject switched off before the
 *                      row leaves it. A refusal is one state, "unavailable",
 *                      whatever the cause: a person never learns whether a
 *                      passport is off, blocked or absent.
 *   readMyPassport     the owner's own: every line, and the switches.
 *   passportIsOpen     whether the "View passport" button should be drawn.
 *
 * Signed out is refused HERE as well, before any call, so a signed-out request
 * never reaches the database to be refused there.
 *
 * The functions come from `pass01` and `pass02` (supabase/migrations/pending).
 * Until they are applied every read answers "unavailable" and says nothing to
 * the member; `reportReadFault` keeps that expected state quiet and reports any
 * other fault.
 */

type Rpc = {
  rpc(fn: string, args?: Record<string, unknown>): Promise<{ data: unknown; error: unknown }>;
  from(table: string): {
    select(columns: string): {
      eq(column: string, value: string): { maybeSingle(): Promise<{ data: unknown; error: unknown }> };
    };
  };
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type PassportOf =
  | { state: "signed-out" }
  | { state: "unavailable" }
  /** The address names the reader themselves: their own passport lives in settings. */
  | { state: "self" }
  | { state: "found"; facts: PassportFacts };

/** A handle or an account id, whichever the address carries, as an account id. Null when it names nobody. */
export async function resolvePassportSubject(db: Rpc, param: string): Promise<string | null> {
  let raw = param;
  try {
    raw = decodeURIComponent(param);
  } catch {
    return null;
  }
  const value = raw.trim().replace(/^@/, "").toLowerCase();
  if (UUID.test(value)) return value;
  if (!/^[a-z0-9_.]{1,40}$/.test(value)) return null;
  const { data, error } = await db.from("social_profiles").select("user_id").eq("handle", value).maybeSingle();
  await reportReadFault("read.passport.resolvePassportSubject", error);
  if (error) return null;
  const id = (data as { user_id?: unknown } | null)?.user_id;
  return typeof id === "string" ? id : null;
}

export async function readPassportOf(param: string): Promise<PassportOf> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return { state: "signed-out" };
  try {
    const db = session.supabase as unknown as Rpc;
    const subject = await resolvePassportSubject(db, param);
    if (!subject) return { state: "unavailable" };
    if (subject === session.user.id) return { state: "self" };
    const { data, error } = await db.rpc("passport_read", { p_subject: subject });
    await reportReadFault("read.passport.readPassportOf", error);
    if (error) return { state: "unavailable" };
    const facts = factsFrom(data);
    if (!facts || facts.userId !== subject) return { state: "unavailable" };
    return { state: "found", facts };
  } catch {
    return { state: "unavailable" };
  }
}

/**
 * The passport as a card in a chat, by account id. The same refusals as the
 * page (signed out, off, blocked), with one difference: the owner's own card
 * draws for the owner while the passport is on, so the member who posted it
 * sees it in their own thread.
 */
export async function readPassportCard(subjectId: string): Promise<PassportFacts | null> {
  const session = await resolveSession();
  if (session.state !== "signed-in" || !UUID.test(subjectId)) return null;
  try {
    const { data, error } = await (session.supabase as unknown as Rpc).rpc("passport_read", { p_subject: subjectId });
    await reportReadFault("read.passport.readPassportCard", error);
    if (error) return null;
    const facts = factsFrom(data);
    return facts && facts.userId === subjectId ? facts : null;
  } catch {
    return null;
  }
}

export type MyPassport = { settings: PassportSettings; facts: PassportFacts };

/** The owner's view with every line and the switches, or null when it could not be read. */
export async function readMyPassport(): Promise<MyPassport | null> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return null;
  try {
    const { data, error } = await (session.supabase as unknown as Rpc).rpc("my_passport");
    await reportReadFault("read.passport.readMyPassport", error);
    if (error) return null;
    const facts = factsFrom(data);
    if (!facts) return null;
    return { settings: settingsFrom(data), facts };
  } catch {
    return null;
  }
}

/** Whether another member's passport can be opened by this reader. False for anything but a clear yes. */
export async function passportIsOpen(subjectId: string): Promise<boolean> {
  const session = await resolveSession();
  if (session.state !== "signed-in" || session.user.id === subjectId) return false;
  try {
    const { data, error } = await (session.supabase as unknown as Rpc).rpc("passport_open", { p_subject: subjectId });
    await reportReadFault("read.passport.passportIsOpen", error);
    return !error && data === true;
  } catch {
    return false;
  }
}

/** Whether the signed-in member has their own passport on, for the chat menu. Null when unknown. */
export async function readMyPassportOn(): Promise<boolean | null> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return null;
  try {
    const { data, error } = await (session.supabase as unknown as Rpc)
      .from("passport_settings")
      .select("enabled")
      .eq("user_id", session.user.id)
      .maybeSingle();
    await reportReadFault("read.passport.readMyPassportOn", error);
    if (error) return null;
    /* No row is the default: on. */
    return (data as { enabled?: unknown } | null)?.enabled === false ? false : true;
  } catch {
    return null;
  }
}
