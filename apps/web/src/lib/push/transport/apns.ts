import "server-only";

import { connect, constants, type ClientHttp2Session } from "node:http2";
import { createPrivateKey, sign as signWithKey } from "node:crypto";

import {
  APNS_KEY_ID_VAR,
  APNS_PRIVATE_KEY_VAR,
  APNS_TEAM_ID_VAR,
  apnsBundleId,
  apnsStatus,
  apnsUseProductionGateway,
} from "../credentials";
import { replyFromStatus, type ProviderReply, type PushPayload, type PushTarget } from "../types";

/**
 * APPLE PUSH NOTIFICATION SERVICE.
 *
 * ===========================================================================
 * THIS ONE COSTS MONEY AND THE OWNER DOES NOT YET HAVE IT.
 *
 * APNs needs a `.p8` signing key, a key id and a team id, and all three come
 * from an Apple Developer Program membership at 99 USD a year.
 * `ios/App/App/App.entitlements` already records, in its own words, that this
 * account does not exist, which is why the associated domains entitlement is
 * inert. The same sentence governs push. Nothing in this file can change it
 * and nothing in this file pretends otherwise: with no key, every call
 * returns `no_credentials` without touching the network.
 *
 * ===========================================================================
 * WHY `node:http2` AND NOT `fetch`.
 *
 * APNS REQUIRES HTTP/2 AND REFUSES HTTP/1.1. Node's `fetch` is HTTP/1.1 only,
 * so an implementation written the obvious way fails at the connection and
 * the error never mentions the protocol. This is the single most common
 * reason a correct-looking APNs integration never sends anything, so the
 * connection is made explicitly with the built-in HTTP/2 client. No
 * dependency: Node has shipped this module for years.
 *
 * ===========================================================================
 * THE SANDBOX TRAP, WHICH IS THE SECOND MOST COMMON REASON.
 *
 * A build signed with a development profile receives a SANDBOX device token.
 * Sent to the production gateway it comes back 400 BadDeviceToken, which
 * reads exactly like a dead token and will have somebody retiring perfectly
 * good devices. The gateway is therefore chosen by an explicit variable and
 * it DEFAULTS TO SANDBOX, because a wrong guess in that direction fails in
 * development where somebody is watching, rather than in production where
 * nobody is. `BadDeviceToken` is deliberately NOT treated as `gone` below for
 * the same reason.
 */

const PRODUCTION_HOST = "https://api.push.apple.com";
const SANDBOX_HOST = "https://api.sandbox.push.apple.com";

function base64Url(value: Buffer): string {
  return value.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * The provider token.
 *
 * ES256 with `kid` in the header and the team id as `iss`. Apple rejects a
 * token older than an hour and, separately, rejects a client that asks for a
 * NEW token more than once every twenty minutes, so this is cached and the
 * cache is part of being well behaved rather than an optimisation.
 */
let cachedJwt: { value: string; madeAt: number } | null = null;

export function resetApnsTokenCache(): void {
  cachedJwt = null;
}

export function apnsProviderToken(now: number = Date.now()): { ok: true; token: string } | { ok: false; error: string } {
  /* Refreshed at 45 minutes: comfortably inside Apple's one hour expiry and
     comfortably outside its twenty minute minimum between issues. */
  if (cachedJwt && now - cachedJwt.madeAt < 45 * 60 * 1000) {
    return { ok: true, token: cachedJwt.value };
  }

  const keyId = (process.env[APNS_KEY_ID_VAR] ?? "").trim();
  const teamId = (process.env[APNS_TEAM_ID_VAR] ?? "").trim();
  /* The .p8 is a PEM. Pasted into an environment editor it usually arrives
     with literal backslash-n instead of newlines, the same trap as the FCM
     service account, and it is repaired for the same reason. */
  const rawKey = (process.env[APNS_PRIVATE_KEY_VAR] ?? "").trim().replace(/\\n/g, "\n");

  if (keyId.length === 0 || teamId.length === 0 || rawKey.length === 0) {
    return { ok: false, error: "no_credentials" };
  }

  const issuedAt = Math.floor(now / 1000);
  const header = base64Url(Buffer.from(JSON.stringify({ alg: "ES256", kid: keyId })));
  const claims = base64Url(Buffer.from(JSON.stringify({ iss: teamId, iat: issuedAt })));
  const signingInput = `${header}.${claims}`;

  try {
    const key = createPrivateKey(rawKey);
    /* Raw r||s, not DER. The same requirement as VAPID and the same silent
       401 when it is wrong. */
    const signature = signWithKey("sha256", Buffer.from(signingInput, "ascii"), {
      key,
      dsaEncoding: "ieee-p1363",
    });
    const token = `${signingInput}.${base64Url(signature)}`;
    cachedJwt = { value: token, madeAt: now };
    return { ok: true, token };
  } catch {
    return { ok: false, error: "p8_key_invalid" };
  }
}

/**
 * Apple's `reason` string, read for the one thing worth acting on.
 *
 * Only `Unregistered` and `BadDeviceToken` matter to the token's fate, and
 * only the first of them retires it. See the sandbox note at the head for why
 * `BadDeviceToken` does not: it is far more often a gateway mismatch than a
 * dead device, and retiring on it would quietly empty the token table.
 */
export function readApnsError(status: number, body: string): ProviderReply {
  let reason = `http_${status}`;
  try {
    const parsed = JSON.parse(body) as { reason?: string };
    if (typeof parsed.reason === "string" && /^[A-Za-z]{3,40}$/.test(parsed.reason)) {
      reason = parsed.reason;
    }
  } catch {
    /* Not JSON. The status is the record. */
  }

  if (status === 410 || reason === "Unregistered") {
    return { outcome: "gone", status, error: reason };
  }
  return replyFromStatus(status, reason);
}

/** One HTTP/2 session per gateway, reused. Apple expects a long lived connection. */
let session: { key: string; client: ClientHttp2Session } | null = null;

function sessionFor(host: string): ClientHttp2Session {
  if (session && session.key === host && !session.client.closed && !session.client.destroyed) {
    return session.client;
  }
  const client = connect(host);
  /* An unhandled 'error' on an http2 session is an uncaught exception that
     takes the process down, and a push gateway drops idle connections as a
     matter of course. Swallowed here and re-established on the next send. */
  client.on("error", () => {
    if (session?.client === client) session = null;
  });
  client.on("close", () => {
    if (session?.client === client) session = null;
  });
  session = { key: host, client };
  return client;
}

/** Close the gateway connection. For tests and for a clean shutdown. */
export function closeApnsSession(): void {
  try {
    session?.client.close();
  } catch {
    /* Already gone. */
  }
  session = null;
}

/** Send to one iOS device over HTTP/2, and read Apple's reply. */
export async function sendApns(target: PushTarget, payload: PushPayload): Promise<ProviderReply> {
  if (!apnsStatus().configured) {
    return { outcome: "failed", status: 0, error: "no_credentials" };
  }

  const token = apnsProviderToken();
  if (!token.ok) {
    return { outcome: "failed", status: 0, error: token.error };
  }

  const host = apnsUseProductionGateway() ? PRODUCTION_HOST : SANDBOX_HOST;

  const body = JSON.stringify({
    aps: {
      alert: { title: payload.title, body: payload.body },
      sound: payload.urgent ? "default" : undefined,
      /* Apple collapses on this, so a conversation is one row. */
      "thread-id": payload.tag,
      /* An alert that is allowed to wake the screen. `background` would be
         priority 5 with no alert, which is a different feature. */
      "mutable-content": 1,
    },
    href: payload.href,
  });

  return new Promise<ProviderReply>((resolve) => {
    let settled = false;
    const finish = (reply: ProviderReply): void => {
      if (settled) return;
      settled = true;
      resolve(reply);
    };

    try {
      const client = sessionFor(host);
      const request = client.request({
        [constants.HTTP2_HEADER_METHOD]: "POST",
        [constants.HTTP2_HEADER_PATH]: `/3/device/${target.token}`,
        authorization: `bearer ${token.token}`,
        "apns-topic": apnsBundleId(),
        "apns-push-type": "alert",
        /* 10 is "deliver immediately"; 5 lets the device batch for battery.
           Sending 10 for everything is how an application ends up throttled
           by iOS itself. */
        "apns-priority": payload.urgent ? "10" : "5",
        "apns-expiration": String(Math.floor(Date.now() / 1000) + 4 * 60 * 60),
        "content-type": "application/json",
      });

      let status = 0;
      let responseBody = "";

      request.setTimeout(10_000, () => {
        request.close();
        finish({ outcome: "failed", status: 0, error: "timeout" });
      });

      request.on("response", (headers) => {
        status = Number(headers[constants.HTTP2_HEADER_STATUS] ?? 0);
      });
      request.setEncoding("utf8");
      request.on("data", (chunk: string) => {
        /* Bounded. Apple's error bodies are tiny; anything large is not
           something to hold in memory from a remote service. */
        if (responseBody.length < 2048) responseBody += chunk;
      });
      request.on("end", () => {
        /* THE REPLY IS READ BEFORE ANYTHING IS CALLED A SUCCESS. A 200 from
           APNs carries an empty body and an `apns-id`; anything else carries
           a reason. Either way the status is what settles the row. */
        if (status >= 200 && status < 300) {
          finish({ outcome: "accepted", status });
        } else {
          finish(readApnsError(status, responseBody));
        }
      });
      request.on("error", () => {
        finish({ outcome: "failed", status: 0, error: "no_reply" });
      });

      request.end(body);
    } catch {
      finish({ outcome: "failed", status: 0, error: "connect_failed" });
    }
  });
}
