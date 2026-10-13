import "server-only";

import { wordsForToken } from "./errors";
import type { CallProvider } from "./provider/types";
import type { RpcAnswer } from "./rpc";
import type { CallKind, CallRole, JoinCredentials } from "./types";

/**
 * CALL TOKEN SERVICE. The only way anybody gets into a call's media room.
 *
 * Order of operations, and why:
 *
 *   1. `public.call_join_check` runs AS THE CALLER, under their own session.
 *      It decides everything: signed in, on this call, the call not over or
 *      cancelled, the state allows this role to join (a callee only after
 *      answering), not blocked, not barred, still in the conversation, a
 *      reviewer still holding the case's scope and the console proof, and
 *      the per-person token rate. It returns the server-minted room and the
 *      opaque identity. Nothing from the browser is used to build either.
 *   2. Only then is a token signed, here, on the server: one room, one
 *      identity, publish limited to microphone (voice) or camera and
 *      microphone (video), no data channel, no admin, ten minutes to connect.
 *      LiveKit refreshes the token over the live connection itself, so a
 *      long call does not need a longer one.
 *   3. The token goes back in the server action's reply and nowhere else: it
 *      is not stored, not logged, not put in a URL, a push or a message.
 */

/** Seconds a join token may be used to START a connection. */
export const JOIN_TOKEN_TTL_SECONDS = 600;
/**
 * A ceiling on connections in one room. Only two identities can ever hold a
 * token for it; the third slot is headroom for a phone that reconnects while
 * its old connection is still closing, so a reconnect is never "room full".
 */
export const ROOM_MAX_PARTICIPANTS = 3;
/** An empty room closes itself after this long, so an abandoned room costs nothing. */
export const ROOM_EMPTY_TIMEOUT_SECONDS = 120;

export type JoinCheck = {
  callId: string;
  state: string;
  kind: CallKind;
  role: CallRole;
  room: string;
  identity: string;
  displayName: string;
  canPublishVideo: boolean;
};

const ROLES = new Set(["CALLER", "CALLEE", "REVIEWER", "SUBJECT"]);

/** Read `call_join_check`'s jsonb. Null for anything malformed, which is refused. */
export function parseJoinCheck(raw: unknown): JoinCheck | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const room = typeof r.room === "string" ? r.room : "";
  const identity = typeof r.identity === "string" ? r.identity : "";
  const kind = r.kind === "AUDIO" || r.kind === "VIDEO" ? r.kind : null;
  const role = typeof r.role === "string" && ROLES.has(r.role) ? (r.role as CallRole) : null;
  if (!/^vc_[0-9a-f]{32}$/.test(room) || !/^vp_[0-9a-f]{32}$/.test(identity) || !kind || !role) return null;
  if (typeof r.call_id !== "string") return null;
  return {
    callId: r.call_id,
    state: typeof r.state === "string" ? r.state : "",
    kind,
    role,
    room,
    identity,
    displayName: typeof r.display_name === "string" && r.display_name.trim() ? r.display_name.slice(0, 80) : "Vallo member",
    /* Both must agree: the database says what the call is, and a voice call never publishes video. */
    canPublishVideo: r.can_publish_video === true && kind === "VIDEO",
  };
}

export type IssueResult = { ok: true; credentials: JoinCredentials } | { ok: false; error: string };

export async function issueJoinCredentials(
  deps: {
    joinCheck: (callId: string) => Promise<RpcAnswer>;
    provider: CallProvider | null;
    /** Called when preparing the room failed; the join still proceeds (rooms also open on first join). */
    onPrepareFailed?: (reason: string) => void;
  },
  callId: string,
): Promise<IssueResult> {
  if (!deps.provider) return { ok: false, error: wordsForToken("call:provider_unavailable") };
  const answer = await deps.joinCheck(callId);
  if (!answer.ok) return { ok: false, error: answer.words };
  const check = parseJoinCheck(answer.data);
  if (!check) return { ok: false, error: wordsForToken("call:not_joinable") };

  try {
    await deps.provider.prepareRoom(check.room, {
      maxParticipants: ROOM_MAX_PARTICIPANTS,
      emptyTimeoutSeconds: ROOM_EMPTY_TIMEOUT_SECONDS,
    });
  } catch (error) {
    deps.onPrepareFailed?.(error instanceof Error ? error.message : "prepare failed");
  }

  try {
    const issued = await deps.provider.issueParticipantCredentials({
      room: check.room,
      identity: check.identity,
      displayName: check.displayName,
      canPublishVideo: check.canPublishVideo,
      ttlSeconds: JOIN_TOKEN_TTL_SECONDS,
    });
    return {
      ok: true,
      credentials: {
        callId: check.callId,
        serverUrl: issued.serverUrl,
        token: issued.token,
        expiresAt: issued.expiresAt.toISOString(),
        kind: check.kind,
        role: check.role,
        canPublishVideo: check.canPublishVideo,
      },
    };
  } catch {
    return { ok: false, error: wordsForToken("call:provider_unavailable") };
  }
}
