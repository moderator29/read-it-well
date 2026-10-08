import "server-only";

import type { CallProvider, ProviderEvent } from "./provider/types";
import type { RpcAnswer } from "./rpc";

/**
 * CALL WEBHOOK SERVICE. One provider delivery in, one verdict out.
 *
 *   1. Verify. The provider adapter checks the signature over the RAW body
 *      (LiveKit: an HS256 JWT in Authorization, carrying the body's sha256),
 *      the issuer, and the token's time. Anything that fails is 401 and is
 *      never parsed further.
 *   2. Filter. Only room and participant facts move a call. Track and egress
 *      events are acknowledged and dropped (no recording exists to report on).
 *   3. Record once. `public.call_provider_event` inserts the provider's event
 *      id first: a retry or a replay answers `duplicate` and changes nothing.
 *      The payload is trusted for which room and which opaque identity, and
 *      for nothing else; the state machine decides what that means.
 *   4. Clean up. When the call is over, the room is closed at the provider.
 *
 * The answer to the provider is 200 for every genuine delivery we have
 * handled (or deliberately ignored), 503 when the database could not record
 * it (so the provider retries, which idempotency makes safe), 401 otherwise.
 */

const ACTED_ON: ReadonlySet<ProviderEvent["event"]> = new Set([
  "room_started",
  "room_finished",
  "participant_joined",
  "participant_left",
  "participant_connection_aborted",
]);

export type WebhookVerdict = {
  status: 200 | 401 | 503;
  outcome: "invalid_signature" | "ignored" | "duplicate" | "recorded" | "unrecorded";
  eventId?: string;
};

export async function handleProviderWebhook(
  deps: {
    provider: CallProvider;
    record: (event: ProviderEvent) => Promise<RpcAnswer>;
    closeRoom?: (room: string) => Promise<void>;
  },
  rawBody: string,
  authorization: string | null,
): Promise<WebhookVerdict> {
  const event = await deps.provider.verifyWebhook(rawBody, authorization);
  if (!event) return { status: 401, outcome: "invalid_signature" };
  if (!ACTED_ON.has(event.event) || !event.room) return { status: 200, outcome: "ignored", eventId: event.eventId };

  const answer = await deps.record(event);
  if (!answer.ok) return { status: 503, outcome: "unrecorded", eventId: event.eventId };
  const data = (answer.data ?? {}) as { duplicate?: unknown; room_should_close?: unknown };
  if (data.duplicate === true) return { status: 200, outcome: "duplicate", eventId: event.eventId };
  if (data.room_should_close === true && event.event !== "room_finished" && deps.closeRoom) {
    try {
      await deps.closeRoom(event.room);
    } catch {
      /* The sweep closes it. */
    }
  }
  return { status: 200, outcome: "recorded", eventId: event.eventId };
}

/** The RPC arguments for one verified event. Kept here so the test can pin them. */
export function providerEventArgs(event: ProviderEvent): Record<string, unknown> {
  return {
    p_provider: event.provider,
    p_event_id: event.eventId,
    p_event: event.event,
    p_room: event.room,
    p_identity: event.identity,
    p_at: event.occurredAt ? event.occurredAt.toISOString() : null,
  };
}
