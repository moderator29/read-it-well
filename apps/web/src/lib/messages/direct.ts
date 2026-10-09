import "server-only";

import { resolveSession } from "../actions/session";
import { createClient } from "../supabase/server";
import { normaliseHandle } from "../social/profiles-queries";

/**
 * DIRECT MESSAGES (founder, 9 October 2026): a member can message any other
 * member from their profile. This is the read the message screen and the
 * send action share: who the person is, and whether a chat with them already
 * exists. Nothing here writes.
 *
 * A person is found by handle through `social_profiles`, whose select policy
 * already hides anyone a block touches in either direction, so a blocked
 * person simply is not there to message ("not-found"), with no second check to
 * keep in step.
 */
export type DirectTarget = {
  userId: string;
  handle: string;
  displayLabel: string;
  avatarUrl: string;
  isAgent: boolean;
};

export type DirectRead =
  | { state: "unconfigured" }
  | { state: "signed-out"; handle: string }
  | { state: "malformed"; handle: string }
  | { state: "not-found"; handle: string }
  | { state: "self"; handle: string }
  | { state: "ready"; viewerId: string; target: DirectTarget; conversationId: string | null };

const HANDLE_SHAPE = /^[a-z][a-z0-9_]{2,19}$/;
const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function readDirectTarget(rawHandle: string): Promise<DirectRead> {
  const handle = normaliseHandle(rawHandle);
  if (!HANDLE_SHAPE.test(handle)) return { state: "malformed", handle };

  const session = await resolveSession();
  if (session.state === "unconfigured") return { state: "unconfigured" };
  if (session.state !== "signed-in") return { state: "signed-out", handle };

  const supabase = session.supabase ?? (await createClient());
  const { data, error } = await supabase
    .from("social_profiles")
    .select("user_id, handle, display_label, avatar_path, is_agent")
    .eq("handle", handle)
    .maybeSingle();
  if (error || !data) return { state: "not-found", handle };

  if (data.user_id === session.user.id) return { state: "self", handle };

  const me = session.user.id;
  const other = data.user_id;
  let conversationId: string | null = null;
  /* Both ids are UUIDs from the session and the database, never typed text, so
     they are safe inside the filter expression. */
  if (UUID_SHAPE.test(me) && UUID_SHAPE.test(other)) {
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("context_kind", "direct")
      .or(`and(guest_id.eq.${me},agent_id.eq.${other}),and(guest_id.eq.${other},agent_id.eq.${me})`)
      .limit(1)
      .maybeSingle();
    conversationId = existing?.id ?? null;
  }

  return {
    state: "ready",
    viewerId: me,
    conversationId,
    target: {
      userId: other,
      handle: data.handle,
      displayLabel: data.display_label || `@${data.handle}`,
      avatarUrl: data.avatar_path ?? "",
      isAgent: Boolean(data.is_agent),
    },
  };
}
