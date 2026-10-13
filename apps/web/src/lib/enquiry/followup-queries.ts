import "server-only";
import { reportReadError } from "@/lib/observability/read-error";
import { looseDb, type AnySupabase, type RpcError } from "./followup-rpc";
import { parseFollowups, type Followup } from "./followup";

/**
 * AGENT-01: READING THE FOLLOW-UPS, UNDER THE LISTER'S OWN CLIENT.
 *
 * `enquiry_followups` answers only to the lister of the thread (the policy
 * `enquiry_followups_lister_reads`), so a renter or a stranger gets nothing.
 * A failed read is `null`, which the dashboard and the inbox treat as "could
 * not read", never as "no follow-ups": a reminder list that said "nothing due"
 * because a read blinked would be a claim nobody checked.
 *
 * Until `p1_e` is applied the table does not exist; Postgres says 42P01 and
 * PostgREST says PGRST205. That is the feature being absent, not a fault, so
 * it is answered as `null` without being reported on every page load.
 */

/** At most this many dated rows are read; a lister with more has a worse problem than this list. */
const CEILING = 500;

function tableMissing(error: RpcError): boolean {
  return error?.code === "42P01" || error?.code === "PGRST205";
}

/** Every dated follow-up of the caller, oldest date first. Null when the read failed. */
export async function readFollowups(supabase: AnySupabase): Promise<Followup[] | null> {
  try {
    const { data, error } = await looseDb(supabase)
      .from("enquiry_followups")
      .select("conversation_id, due_on, note")
      .not("due_on", "is", null)
      .order("due_on", { ascending: true })
      .limit(CEILING);
    if (error && !tableMissing(error)) await reportReadError("read.enquiry.readFollowups", error);
    if (error || !Array.isArray(data)) return null;
    return parseFollowups(data);
  } catch {
    return null;
  }
}

/** One thread's follow-up, for the stage control. Null when there is none or the read failed. */
export async function readFollowup(supabase: AnySupabase, conversationId: string): Promise<Followup | null> {
  try {
    const { data, error } = await looseDb(supabase)
      .from("enquiry_followups")
      .select("conversation_id, due_on, note")
      .eq("conversation_id", conversationId)
      .maybeSingle();
    if (error && !tableMissing(error)) await reportReadError("read.enquiry.readFollowup", error);
    if (error || !data) return null;
    return parseFollowups([data])[0] ?? null;
  } catch {
    return null;
  }
}
