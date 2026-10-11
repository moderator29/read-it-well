import "server-only";

import { timingSafeEqual } from "node:crypto";
import { sha256Base64, signHs256, verifyHs256 } from "./jwt";
import {
  CallProviderError,
  type CallProvider,
  type IssuedCredentials,
  type ParticipantGrant,
  type ProviderEvent,
  type ProviderEventName,
} from "./types";

/**
 * THE LIVEKIT ADAPTER. The one file in this codebase that knows LiveKit's
 * wire formats: its access-token claims, its Twirp room API and its webhook
 * signature. Everything else speaks `CallProvider`.
 *
 * Sources (official docs, 8 October 2026):
 *   tokens    https://docs.livekit.io/home/get-started/authentication/
 *   rooms     https://docs.livekit.io/home/server/managing-rooms/  (Twirp: /twirp/livekit.RoomService/*)
 *   webhooks  https://docs.livekit.io/home/server/webhooks/  (Authorization: a JWT carrying sha256 of the body)
 *
 * SECRETS. `apiSecret` is read from the server environment by `config.ts`,
 * held only in this object, and used only to sign. It is never logged, never
 * returned, and never part of an error message: every error below names an
 * HTTP status and a Twirp code, nothing else.
 */

export type LiveKitConfig = {
  /** `wss://<project>.livekit.cloud` or `ws://127.0.0.1:7880` for a local server. */
  url: string;
  apiKey: string;
  apiSecret: string;
  /** Injected by tests; the real global fetch otherwise. */
  fetchImpl?: typeof fetch;
  /** Injected by tests. */
  now?: () => Date;
};

/** How long a server-side room-service token lives. Minted per request. */
const ADMIN_TOKEN_TTL_SECONDS = 60;
/** How long one HTTP call to the room service may take. */
const ROOM_SERVICE_TIMEOUT_MS = 5_000;

const KNOWN_EVENTS: ReadonlySet<string> = new Set([
  "room_started",
  "room_finished",
  "participant_joined",
  "participant_left",
  "participant_connection_aborted",
  "track_published",
  "track_unpublished",
  "egress_started",
  "egress_ended",
]);

/** `wss://host` becomes `https://host`; `ws://host` becomes `http://host`. */
export function httpBaseFromUrl(url: string): string {
  const parsed = new URL(url);
  if (parsed.protocol === "wss:") parsed.protocol = "https:";
  else if (parsed.protocol === "ws:") parsed.protocol = "http:";
  return parsed.origin;
}

/** The claims of a participant token, built in one place so the test can pin every one. */
export function participantClaims(
  grant: ParticipantGrant,
  apiKey: string,
  now: Date,
): Record<string, unknown> {
  const iat = Math.floor(now.getTime() / 1000);
  return {
    iss: apiKey,
    sub: grant.identity,
    /* A token id, distinct per issue, so two tokens never look identical in a log. */
    jti: `${grant.identity}.${iat}`,
    nbf: iat - 10,
    exp: iat + grant.ttlSeconds,
    name: grant.displayName,
    video: {
      room: grant.room,
      roomJoin: true,
      canSubscribe: true,
      canPublish: true,
      /* A voice call cannot turn a camera on, whatever the client asks. */
      canPublishSources: grant.canPublishVideo ? ["camera", "microphone"] : ["microphone"],
      /* Least privilege: no data channel, no renaming, no hidden presence,
         no recording, no room administration. */
      canPublishData: false,
      canUpdateOwnMetadata: false,
      hidden: false,
      recorder: false,
    },
  };
}

function adminToken(config: LiveKitConfig, video: Record<string, unknown>, now: Date): string {
  const iat = Math.floor(now.getTime() / 1000);
  return signHs256(
    { iss: config.apiKey, sub: "vallo-server", nbf: iat - 10, exp: iat + ADMIN_TOKEN_TTL_SECONDS, video },
    config.apiSecret,
  );
}

function eventName(raw: unknown): ProviderEventName {
  return typeof raw === "string" && KNOWN_EVENTS.has(raw) ? (raw as ProviderEventName) : "other";
}

/** LiveKit sends `createdAt` as int64 seconds, which protojson writes as a string. */
function occurredAt(raw: unknown): Date | null {
  const n = typeof raw === "string" ? Number(raw) : typeof raw === "number" ? raw : Number.NaN;
  if (!Number.isFinite(n) || n <= 0) return null;
  /* Seconds, unless it is clearly milliseconds. */
  return new Date(n > 1e12 ? n : n * 1000);
}

function sameString(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function createLiveKitProvider(config: LiveKitConfig): CallProvider {
  if (!config.url || !config.apiKey || !config.apiSecret) {
    throw new CallProviderError("unconfigured", "LiveKit is not configured");
  }
  const base = httpBaseFromUrl(config.url);
  const doFetch = config.fetchImpl ?? fetch;
  const now = config.now ?? (() => new Date());

  async function roomService(method: string, video: Record<string, unknown>, body: Record<string, unknown>) {
    let res: Response;
    try {
      res = await doFetch(`${base}/twirp/livekit.RoomService/${method}`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${adminToken(config, video, now())}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(ROOM_SERVICE_TIMEOUT_MS),
        cache: "no-store",
      });
    } catch {
      throw new CallProviderError("unavailable", `room service ${method} unreachable`);
    }
    if (res.ok) return (await res.json().catch(() => ({}))) as Record<string, unknown>;
    let code = "";
    try {
      const err = (await res.json()) as { code?: unknown };
      code = typeof err.code === "string" ? err.code : "";
    } catch {
      /* Not JSON; the status says enough. */
    }
    const kind =
      res.status === 401 || res.status === 403 || code === "unauthenticated" || code === "permission_denied"
        ? "unauthorised"
        : res.status === 404 || code === "not_found"
          ? "not_found"
          : res.status >= 500
            ? "unavailable"
            : "rejected";
    throw new CallProviderError(kind, `room service ${method} answered ${res.status}${code ? ` ${code}` : ""}`, res.status);
  }

  return {
    name: "livekit",
    serverUrl: config.url,

    async prepareRoom(room, options) {
      await roomService(
        "CreateRoom",
        { roomCreate: true },
        { name: room, emptyTimeout: options.emptyTimeoutSeconds, maxParticipants: options.maxParticipants },
      );
    },

    async issueParticipantCredentials(grant): Promise<IssuedCredentials> {
      if (!/^vc_[0-9a-f]{32}$/.test(grant.room) || !/^vp_[0-9a-f]{32}$/.test(grant.identity)) {
        throw new CallProviderError("rejected", "room or identity is not server minted");
      }
      if (!(grant.ttlSeconds >= 30 && grant.ttlSeconds <= 3600)) {
        throw new CallProviderError("rejected", "token lifetime out of range");
      }
      const at = now();
      const claims = participantClaims(grant, config.apiKey, at);
      return {
        serverUrl: config.url,
        token: signHs256(claims, config.apiSecret),
        expiresAt: new Date((claims.exp as number) * 1000),
      };
    },

    async endRoom(room) {
      try {
        await roomService("DeleteRoom", { roomAdmin: true, room, roomCreate: true }, { room });
      } catch (error) {
        if (error instanceof CallProviderError && error.kind === "not_found") return;
        throw error;
      }
    },

    async listParticipants(room) {
      try {
        const data = await roomService("ListParticipants", { roomAdmin: true, room }, { room });
        const list = Array.isArray(data.participants) ? (data.participants as Record<string, unknown>[]) : [];
        return list
          .filter((p) => p && p.state !== "DISCONNECTED" && typeof p.identity === "string")
          .map((p) => p.identity as string);
      } catch (error) {
        if (error instanceof CallProviderError && error.kind === "not_found") return [];
        throw error;
      }
    },

    async verifyWebhook(rawBody, authorization): Promise<ProviderEvent | null> {
      if (!authorization || typeof rawBody !== "string" || rawBody.length === 0 || rawBody.length > 64_000) return null;
      const token = authorization.replace(/^Bearer\s+/i, "").trim();
      const verified = verifyHs256(token, config.apiSecret, { issuer: config.apiKey, now: now() });
      if (!verified) return null;
      const claimed = verified.payload.sha256;
      if (typeof claimed !== "string" || !sameString(claimed, sha256Base64(rawBody))) return null;
      let body: Record<string, unknown>;
      try {
        body = JSON.parse(rawBody) as Record<string, unknown>;
      } catch {
        return null;
      }
      const id = typeof body.id === "string" ? body.id : "";
      if (!id || id.length > 200) return null;
      const room = body.room && typeof body.room === "object" ? (body.room as Record<string, unknown>) : null;
      const participant =
        body.participant && typeof body.participant === "object" ? (body.participant as Record<string, unknown>) : null;
      return {
        provider: "livekit",
        eventId: id,
        event: eventName(body.event),
        room: room && typeof room.name === "string" ? room.name : null,
        identity: participant && typeof participant.identity === "string" ? participant.identity : null,
        occurredAt: occurredAt(body.createdAt ?? body.created_at),
      };
    },
  };
}
