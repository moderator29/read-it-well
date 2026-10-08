import { describe, expect, it, vi } from "vitest";
import { decodeUnverified, sha256Base64, signHs256, verifyHs256 } from "./jwt";
import { createLiveKitProvider, httpBaseFromUrl } from "./livekit";
import { CallProviderError } from "./types";

/* A test key pair, made up for this file. Nothing here is a real credential. */
const KEY = "APItestkey000";
const SECRET = "test-secret-not-real-0123456789abcdef";
const ROOM = `vc_${"a".repeat(32)}`;
const IDENTITY = `vp_${"b".repeat(32)}`;
const NOW = new Date("2026-10-08T12:00:00Z");

function provider(fetchImpl?: typeof fetch) {
  return createLiveKitProvider({ url: "wss://vallo-test.livekit.cloud", apiKey: KEY, apiSecret: SECRET, fetchImpl, now: () => NOW });
}

describe("participant tokens", () => {
  it("are room- and identity-scoped, short, least-privilege, and signed with the secret", async () => {
    const issued = await provider().issueParticipantCredentials({
      room: ROOM,
      identity: IDENTITY,
      displayName: "Ada",
      canPublishVideo: true,
      ttlSeconds: 600,
    });
    expect(issued.serverUrl).toBe("wss://vallo-test.livekit.cloud");
    const claims = decodeUnverified(issued.token)!;
    const iat = Math.floor(NOW.getTime() / 1000);
    expect(claims.iss).toBe(KEY);
    expect(claims.sub).toBe(IDENTITY);
    expect(claims.name).toBe("Ada");
    expect(claims.exp).toBe(iat + 600);
    expect((claims.exp as number) - iat).toBeLessThanOrEqual(600);
    expect(claims.nbf).toBeLessThanOrEqual(iat);
    expect(issued.expiresAt.toISOString()).toBe(new Date((iat + 600) * 1000).toISOString());
    expect(claims.video).toEqual({
      room: ROOM,
      roomJoin: true,
      canSubscribe: true,
      canPublish: true,
      canPublishSources: ["camera", "microphone"],
      canPublishData: false,
      canUpdateOwnMetadata: false,
      hidden: false,
      recorder: false,
    });
    const video = claims.video as Record<string, unknown>;
    for (const admin of ["roomAdmin", "roomCreate", "roomList", "roomRecord", "ingressAdmin"]) {
      expect(video[admin]).toBeUndefined();
    }
    expect(verifyHs256(issued.token, SECRET, { issuer: KEY, now: NOW })).not.toBeNull();
    expect(verifyHs256(issued.token, "another-secret", { issuer: KEY, now: NOW })).toBeNull();
  });

  it("cannot publish a camera on a voice call", async () => {
    const issued = await provider().issueParticipantCredentials({
      room: ROOM,
      identity: IDENTITY,
      displayName: "Ada",
      canPublishVideo: false,
      ttlSeconds: 600,
    });
    expect((decodeUnverified(issued.token)!.video as Record<string, unknown>).canPublishSources).toEqual(["microphone"]);
  });

  it("refuses a room or identity the server did not mint, and an out-of-range lifetime", async () => {
    const p = provider();
    const base = { room: ROOM, identity: IDENTITY, displayName: "Ada", canPublishVideo: true, ttlSeconds: 600 };
    await expect(p.issueParticipantCredentials({ ...base, room: "my-room" })).rejects.toBeInstanceOf(CallProviderError);
    await expect(p.issueParticipantCredentials({ ...base, identity: "957b3bd2-cce3-425d-bba9-5cd876ca3d62" })).rejects.toBeInstanceOf(CallProviderError);
    await expect(p.issueParticipantCredentials({ ...base, ttlSeconds: 86_400 })).rejects.toBeInstanceOf(CallProviderError);
  });

  it("is not built without all three settings", () => {
    expect(() => createLiveKitProvider({ url: "", apiKey: KEY, apiSecret: SECRET })).toThrow(CallProviderError);
    expect(() => createLiveKitProvider({ url: "wss://x.livekit.cloud", apiKey: KEY, apiSecret: "" })).toThrow(CallProviderError);
  });
});

describe("webhook verification", () => {
  const body = JSON.stringify({
    event: "participant_joined",
    id: "EV_abc123",
    createdAt: "1791460800",
    room: { name: ROOM, sid: "RM_1" },
    participant: { identity: IDENTITY, sid: "PA_1" },
  });
  function signed(b: string, secret = SECRET, extra: Record<string, unknown> = {}) {
    const iat = Math.floor(NOW.getTime() / 1000);
    return signHs256({ iss: KEY, nbf: iat, exp: iat + 300, sha256: sha256Base64(b), ...extra }, secret);
  }

  it("accepts a genuine delivery and keeps only the facts Vallo uses", async () => {
    const event = await provider().verifyWebhook(body, signed(body));
    expect(event).toEqual({
      provider: "livekit",
      eventId: "EV_abc123",
      event: "participant_joined",
      room: ROOM,
      identity: IDENTITY,
      occurredAt: new Date(1791460800 * 1000),
    });
    expect(await provider().verifyWebhook(body, `Bearer ${signed(body)}`)).not.toBeNull();
  });

  it("refuses a changed body, a wrong secret, a wrong issuer, an expired signature and no signature", async () => {
    const p = provider();
    const tampered = body.replace("participant_joined", "room_finished");
    expect(await p.verifyWebhook(tampered, signed(body))).toBeNull();
    expect(await p.verifyWebhook(body, signed(body, "not-the-secret"))).toBeNull();
    expect(await p.verifyWebhook(body, signed(body, SECRET, { iss: "someone-else" }))).toBeNull();
    const old = Math.floor(NOW.getTime() / 1000) - 3600;
    expect(await p.verifyWebhook(body, signed(body, SECRET, { nbf: old - 300, exp: old }))).toBeNull();
    expect(await p.verifyWebhook(body, null)).toBeNull();
    expect(await p.verifyWebhook(body, "garbage")).toBeNull();
    const none = `${Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url")}.${Buffer.from(JSON.stringify({ iss: KEY, sha256: sha256Base64(body) })).toString("base64url")}.`;
    expect(await p.verifyWebhook(body, none)).toBeNull();
  });

  it("refuses a delivery with no event id, so idempotency always has a key", async () => {
    const noId = JSON.stringify({ event: "room_finished", room: { name: ROOM } });
    expect(await provider().verifyWebhook(noId, signed(noId))).toBeNull();
  });

  it("names an event it does not know as other", async () => {
    const odd = JSON.stringify({ event: "something_new", id: "EV_2", room: { name: ROOM } });
    expect((await provider().verifyWebhook(odd, signed(odd)))!.event).toBe("other");
  });
});

describe("the room service", () => {
  function fakeFetch(status: number, json: unknown) {
    return vi.fn(async (_url: string | URL | Request, _init?: RequestInit) =>
      new Response(JSON.stringify(json), { status, headers: { "content-type": "application/json" } }),
    );
  }

  it("creates a capped room with a short-lived admin token, never the participant's", async () => {
    const f = fakeFetch(200, { name: ROOM });
    await provider(f as unknown as typeof fetch).prepareRoom(ROOM, { maxParticipants: 3, emptyTimeoutSeconds: 120 });
    const [url, init] = f.mock.calls[0]!;
    expect(String(url)).toBe("https://vallo-test.livekit.cloud/twirp/livekit.RoomService/CreateRoom");
    expect(JSON.parse(String(init!.body))).toEqual({ name: ROOM, emptyTimeout: 120, maxParticipants: 3 });
    const token = String((init!.headers as Record<string, string>).authorization).replace("Bearer ", "");
    const claims = decodeUnverified(token)!;
    expect(claims.video).toEqual({ roomCreate: true });
    expect((claims.exp as number) - (claims.nbf as number)).toBeLessThanOrEqual(70);
  });

  it("treats deleting a room that is already gone as done", async () => {
    await expect(provider(fakeFetch(404, { code: "not_found" }) as unknown as typeof fetch).endRoom(ROOM)).resolves.toBeUndefined();
  });

  it("reports an unauthorised key without any secret in the message", async () => {
    const error = await provider(fakeFetch(401, { code: "unauthenticated", msg: "bad" }) as unknown as typeof fetch)
      .endRoom(ROOM)
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(CallProviderError);
    expect((error as CallProviderError).kind).toBe("unauthorised");
    expect(String((error as Error).message)).not.toContain(SECRET);
  });

  it("lists only connected identities", async () => {
    const f = fakeFetch(200, {
      participants: [
        { identity: IDENTITY, state: "ACTIVE" },
        { identity: `vp_${"c".repeat(32)}`, state: "DISCONNECTED" },
        { identity: `vp_${"d".repeat(32)}`, state: "JOINED" },
      ],
    });
    expect(await provider(f as unknown as typeof fetch).listParticipants(ROOM)).toEqual([IDENTITY, `vp_${"d".repeat(32)}`]);
  });

  it("maps a self-hosted websocket URL to its HTTP origin", () => {
    expect(httpBaseFromUrl("wss://calls.example.com")).toBe("https://calls.example.com");
    expect(httpBaseFromUrl("ws://127.0.0.1:7880")).toBe("http://127.0.0.1:7880");
  });
});
