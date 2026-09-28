"use server";

import { revalidatePath } from "next/cache";
import { resolveSession } from "../actions/session";
import { isShowMeItem, readShowMeResult, SHOW_ME_MAX_SECONDS, type ShowMeResult } from "./show-me";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Rpc = { rpc: (fn: string, args: object) => Promise<{ data: unknown; error: unknown }> };

/** The renter asks for one clip (V-69). Every rule is the database's. */
export async function requestShowMe(conversationId: string, item: string, note?: string): Promise<ShowMeResult> {
  if (!UUID.test(conversationId) || !isShowMeItem(item)) return "bad-item";
  try {
    const session = await resolveSession();
    if (session.state !== "signed-in") return "signed-out";
    const { data, error } = await (session.supabase as unknown as Rpc).rpc("request_show_me", {
      p_conversation: conversationId,
      p_item: item,
      p_note: item === "other" ? (note ?? "").slice(0, 120) : null,
    });
    if (error) return "failed";
    revalidatePath(`/messages/${conversationId}`);
    /* The lister's copy of the thread, opened from the agent inbox. */
    revalidatePath(`/agent/messages/${conversationId}`);
    return readShowMeResult(data);
  } catch {
    return "failed";
  }
}

/** The lister answers with a clip already uploaded into the request's folder. */
export async function answerShowMe(
  conversationId: string,
  requestId: string,
  path: string,
  seconds: number,
): Promise<ShowMeResult> {
  if (!UUID.test(conversationId) || !UUID.test(requestId)) return "not-yours";
  if (!Number.isFinite(seconds) || seconds < 1 || seconds > SHOW_ME_MAX_SECONDS) return "too-long";
  try {
    const session = await resolveSession();
    if (session.state !== "signed-in") return "signed-out";
    const { data, error } = await (session.supabase as unknown as Rpc).rpc("answer_show_me", {
      p_request: requestId,
      p_path: path,
      p_seconds: Math.ceil(seconds),
    });
    if (error) return "failed";
    revalidatePath(`/messages/${conversationId}`);
    /* The lister's copy of the thread, opened from the agent inbox. */
    revalidatePath(`/agent/messages/${conversationId}`);
    return readShowMeResult(data);
  } catch {
    return "failed";
  }
}
