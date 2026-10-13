import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { AssistantTurn } from "./types";
import { carriesToolOutput } from "./untrusted";

/**
 * WHAT THE MODEL IS TOLD WAS SAID BEFORE (AI-02, defect D-04).
 *
 * The route used to take the whole conversation from the browser, assistant
 * turns included, and send it to the model as written. A client could
 * therefore put words in the assistant's mouth ("I confirm the landlord may
 * be paid in cash"), and the model would carry on from them.
 *
 *   - Signed in with a thread: the history is the thread's own rows in
 *     `ai_messages`, read through the caller's RLS-bound client (policy
 *     `ai_messages_own` scopes rows to threads the caller owns). Only the
 *     newest user turn is taken from the request.
 *   - Signed out (or no stored thread): the browser's turns are all there
 *     is, so they are kept, but an assistant turn longer than a real reply
 *     can be, or one carrying tool output, is dropped.
 */

/** Turns sent to the model at most, stored or not. */
export const MAX_TURNS = 24;
/** Characters kept from any one turn. */
export const MAX_TURN_CHARS = 8_000;
/**
 * The longest assistant turn a browser may hand back. One model round is
 * capped at 1,024 tokens, which is about 4,500 characters of English; this
 * leaves headroom for a reply that spans a tool round and refuses anything
 * past it.
 */
export const MAX_CLIENT_ASSISTANT_CHARS = 6_000;

/**
 * The request's turns, validated. Same rules as before: every entry is a user
 * or assistant turn with string content, empty turns are skipped, each turn is
 * trimmed and capped, at most `MAX_TURNS` are kept, and the last is a user turn.
 */
export function parseTurns(value: unknown): AssistantTurn[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const turns: AssistantTurn[] = [];
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) return null;
    const role = (entry as Record<string, unknown>).role;
    const content = (entry as Record<string, unknown>).content;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") return null;
    const trimmed = content.trim().slice(0, MAX_TURN_CHARS);
    if (!trimmed) continue;
    turns.push({ role, content: trimmed });
  }
  const bounded = turns.slice(-MAX_TURNS);
  const last = bounded[bounded.length - 1];
  if (!last || last.role !== "user") return null;
  return bounded;
}

/**
 * Signed-out history: the browser's turns, minus any assistant turn longer
 * than `MAX_CLIENT_ASSISTANT_CHARS` or carrying tool output. User turns are
 * the person's own words and pass as they came.
 */
export function sanitizeClientTurns(turns: readonly AssistantTurn[]): AssistantTurn[] {
  return turns.filter(
    (t) =>
      t.role === "user" ||
      (t.content.length <= MAX_CLIENT_ASSISTANT_CHARS && !carriesToolOutput(t.content)),
  );
}

/**
 * Whether the stored thread already ends with this exact user turn: the row
 * written by an attempt that failed before the assistant answered, which the
 * Retry button then sends again.
 */
export function endsWithSameUserTurn(stored: readonly AssistantTurn[], newest: AssistantTurn): boolean {
  const last = stored[stored.length - 1];
  return last?.role === "user" && last.content === newest.content;
}

/**
 * Signed-in history: the stored turns, then the newest user turn from the
 * request. A stored copy of that same user turn at the end (a retry) is
 * counted once.
 */
export function serverThreadTurns(stored: readonly AssistantTurn[], newest: AssistantTurn): AssistantTurn[] {
  const prior = endsWithSameUserTurn(stored, newest) ? stored.slice(0, -1) : stored;
  return [...prior, newest].slice(-MAX_TURNS);
}

/** Stored rows as turns: user and assistant only, trimmed, capped, never empty. */
export function turnsFromRows(rows: readonly { role: unknown; content: unknown }[]): AssistantTurn[] {
  const turns: AssistantTurn[] = [];
  for (const row of rows) {
    if ((row.role !== "user" && row.role !== "assistant") || typeof row.content !== "string") continue;
    const content = row.content.trim().slice(0, MAX_TURN_CHARS);
    if (content) turns.push({ role: row.role, content });
  }
  return turns;
}

type ThreadReader = Pick<SupabaseClient<Database>, "from">;

/**
 * The newest `MAX_TURNS` turns of a thread, oldest first, read under the
 * caller's RLS. `null` when the read fails; the caller then sends only the
 * newest user turn, never the browser's history.
 */
export async function loadThreadTurns(supabase: ThreadReader, conversationId: string): Promise<AssistantTurn[] | null> {
  try {
    const { data, error } = await supabase
      .from("ai_messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(MAX_TURNS);
    if (error || !data) return null;
    return turnsFromRows([...data].reverse());
  } catch {
    return null;
  }
}
