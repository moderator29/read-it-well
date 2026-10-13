import { describe, expect, it, vi } from "vitest";
import { sha256Base64, signHs256 } from "./provider/jwt";
import { createLiveKitProvider } from "./provider/livekit";
import type { ProviderEvent } from "./provider/types";
import type { RpcAnswer } from "./rpc";
import { handleProviderWebhook, providerEventArgs } from "./webhook";

const KEY = "APIwebhooktest";
const SECRET = "webhook-secret-for-tests-only";
const ROOM = `vc_${"e".repeat(32)}`;
const provider = createLiveKitProvider({ url: "wss://w.livekit.cloud", apiKey: KEY, apiSecret: SECRET });

function delivery(event: string, id = "EV_1") {
  const body = JSON.stringify({ event, id, createdAt: String(Math.floor(Date.now() / 1000)), room: { name: ROOM }, participant: { identity: `vp_${"f".repeat(32)}` } });
  const now = Math.floor(Date.now() / 1000);
  return { body, auth: signHs256({ iss: KEY, nbf: now, exp: now + 300, sha256: sha256Base64(body) }, SECRET) };
}

/** A stand-in for `call_provider_event`'s idempotency: the first id records, a repeat is a duplicate. */
function recorder(extra: Record<string, unknown> = {}) {
  const seen = new Set<string>();
  return vi.fn(async (event: ProviderEvent): Promise<RpcAnswer> => {
    if (seen.has(event.eventId)) return { ok: true, data: { duplicate: true } };
    seen.add(event.eventId);
    return { ok: true, data: { duplicate: false, outcome: "applied", ...extra } };
  });
}

describe("handleProviderWebhook", () => {
  it("refuses an unsigned or forged delivery before reading it", async () => {
    const record = recorder();
    const { body } = delivery("participant_joined");
    expect((await handleProviderWebhook({ provider, record }, body, null)).status).toBe(401);
    const forged = signHs256({ iss: KEY, sha256: sha256Base64(body) }, "wrong");
    expect((await handleProviderWebhook({ provider, record }, body, forged)).outcome).toBe("invalid_signature");
    expect(record).not.toHaveBeenCalled();
  });

  it("records a participant fact once, and answers a retry as a duplicate", async () => {
    const record = recorder();
    const { body, auth } = delivery("participant_joined", "EV_once");
    expect(await handleProviderWebhook({ provider, record }, body, auth)).toEqual({ status: 200, outcome: "recorded", eventId: "EV_once" });
    expect(await handleProviderWebhook({ provider, record }, body, auth)).toEqual({ status: 200, outcome: "duplicate", eventId: "EV_once" });
    expect(record).toHaveBeenCalledTimes(2);
  });

  it("acknowledges and drops track and egress events", async () => {
    const record = recorder();
    const { body, auth } = delivery("track_published");
    expect((await handleProviderWebhook({ provider, record }, body, auth)).outcome).toBe("ignored");
    expect(record).not.toHaveBeenCalled();
  });

  it("asks the provider to retry when the database could not record it", async () => {
    const { body, auth } = delivery("participant_left");
    const verdict = await handleProviderWebhook(
      { provider, record: async () => ({ ok: false, token: null, words: "x", code: null }) },
      body,
      auth,
    );
    expect(verdict.status).toBe(503);
  });

  it("closes the room when the call it belonged to is over", async () => {
    const closeRoom = vi.fn(async () => undefined);
    const { body, auth } = delivery("participant_joined", "EV_late");
    await handleProviderWebhook({ provider, record: recorder({ room_should_close: true }), closeRoom }, body, auth);
    expect(closeRoom).toHaveBeenCalledWith(ROOM);
  });

  it("hands the database the event id, the room, the opaque identity and the time, nothing else", () => {
    const args = providerEventArgs({
      provider: "livekit",
      eventId: "EV_9",
      event: "participant_left",
      room: ROOM,
      identity: "vp_x",
      occurredAt: new Date("2026-10-08T12:00:00Z"),
    });
    expect(args).toEqual({
      p_provider: "livekit",
      p_event_id: "EV_9",
      p_event: "participant_left",
      p_room: ROOM,
      p_identity: "vp_x",
      p_at: "2026-10-08T12:00:00.000Z",
    });
  });
});
