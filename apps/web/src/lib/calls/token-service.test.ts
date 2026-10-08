import { describe, expect, it, vi } from "vitest";
import { decodeUnverified } from "./provider/jwt";
import { createLiveKitProvider } from "./provider/livekit";
import type { CallProvider } from "./provider/types";
import type { RpcAnswer } from "./rpc";
import { JOIN_TOKEN_TTL_SECONDS, issueJoinCredentials, parseJoinCheck } from "./token-service";

const ROOM = `vc_${"1".repeat(32)}`;
const IDENTITY = `vp_${"2".repeat(32)}`;
const CHECK = {
  call_id: "33333333-3333-4333-8333-333333333333",
  state: "CONNECTING",
  kind: "VIDEO",
  role: "CALLEE",
  room: ROOM,
  identity: IDENTITY,
  display_name: "Bayo",
  can_publish_video: true,
};

function realProvider(fetchImpl?: typeof fetch): CallProvider {
  const f = fetchImpl ?? ((async () => new Response("{}", { status: 200 })) as unknown as typeof fetch);
  return createLiveKitProvider({ url: "wss://t.livekit.cloud", apiKey: "APIk", apiSecret: "s3cret-for-tests-only", fetchImpl: f });
}

const allowed = (data: unknown) => async (): Promise<RpcAnswer> => ({ ok: true, data });

describe("issueJoinCredentials", () => {
  it("signs a token only for the room and identity the database answered, never anything the client sent", async () => {
    const result = await issueJoinCredentials({ joinCheck: allowed(CHECK), provider: realProvider() }, CHECK.call_id);
    if (!result.ok) throw new Error(result.error);
    const claims = decodeUnverified(result.credentials.token)!;
    expect(claims.sub).toBe(IDENTITY);
    expect((claims.video as Record<string, unknown>).room).toBe(ROOM);
    expect((claims.exp as number) - Math.floor(Date.now() / 1000)).toBeLessThanOrEqual(JOIN_TOKEN_TTL_SECONDS);
    expect(result.credentials).toMatchObject({ callId: CHECK.call_id, kind: "VIDEO", role: "CALLEE", canPublishVideo: true });
    expect(JSON.stringify(result.credentials)).not.toContain("s3cret");
  });

  it("passes a refusal through as its sentence and signs nothing", async () => {
    const provider = realProvider();
    const issue = vi.spyOn(provider, "issueParticipantCredentials");
    const result = await issueJoinCredentials(
      { joinCheck: async () => ({ ok: false, token: "call:not_joinable", words: "This call cannot be joined now.", code: "P0001" }), provider },
      CHECK.call_id,
    );
    expect(result).toEqual({ ok: false, error: "This call cannot be joined now." });
    expect(issue).not.toHaveBeenCalled();
  });

  it("refuses a malformed answer rather than guessing a room", async () => {
    for (const bad of [null, { ...CHECK, room: "anything" }, { ...CHECK, identity: "957b3bd2-cce3-425d-bba9-5cd876ca3d62" }, { ...CHECK, role: "ADMIN" }]) {
      const result = await issueJoinCredentials({ joinCheck: allowed(bad), provider: realProvider() }, CHECK.call_id);
      expect(result.ok).toBe(false);
    }
  });

  it("never lets a voice call publish video, even if a row said so", () => {
    expect(parseJoinCheck({ ...CHECK, kind: "AUDIO", can_publish_video: true })!.canPublishVideo).toBe(false);
  });

  it("joins even when the room could not be prepared, and says so", async () => {
    const failing = (async () => new Response("{}", { status: 503 })) as unknown as typeof fetch;
    const onPrepareFailed = vi.fn();
    const result = await issueJoinCredentials({ joinCheck: allowed(CHECK), provider: realProvider(failing), onPrepareFailed }, CHECK.call_id);
    expect(result.ok).toBe(true);
    expect(onPrepareFailed).toHaveBeenCalledOnce();
  });

  it("answers plainly when no provider is configured", async () => {
    const joinCheck = vi.fn(allowed(CHECK));
    const result = await issueJoinCredentials({ joinCheck, provider: null }, CHECK.call_id);
    expect(result.ok).toBe(false);
    expect(joinCheck).not.toHaveBeenCalled();
  });
});
