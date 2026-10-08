import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * HS256 JSON Web Tokens with Node's own crypto, and nothing else.
 *
 * LiveKit's access tokens and webhook signatures are plain HS256 JWTs signed
 * with the project's API secret (https://docs.livekit.io/home/get-started/authentication/).
 * Signing them here instead of through `livekit-server-sdk` keeps the lockfile
 * untouched (D46: only its owners add dependencies) and leaves nothing between
 * the secret and the signature that we have not read. The format is proved
 * against a real `livekit-server` by `scripts/calls/livekit-e2e.mjs`, which
 * connects two browsers with tokens minted by this file and verifies the
 * server's own webhooks with `verifyHs256` below.
 */

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

export function signHs256(payload: Record<string, unknown>, secret: string): string {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(JSON.stringify(payload));
  const signature = createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

export type VerifiedJwt = { header: Record<string, unknown>; payload: Record<string, unknown> };

/**
 * Verify an HS256 token: the algorithm, the signature in constant time, the
 * issuer, and `nbf`/`exp` with a small leeway for clock skew. Returns null for
 * anything that fails, never throws.
 */
export function verifyHs256(
  token: string,
  secret: string,
  options: { issuer?: string; now?: Date; leewaySeconds?: number } = {},
): VerifiedJwt | null {
  if (typeof token !== "string" || token.length > 8192) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [h, p, s] = parts as [string, string, string];
  let header: Record<string, unknown>;
  let payload: Record<string, unknown>;
  try {
    header = JSON.parse(Buffer.from(h, "base64url").toString("utf8")) as Record<string, unknown>;
    payload = JSON.parse(Buffer.from(p, "base64url").toString("utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
  if (!header || header.alg !== "HS256" || !payload || typeof payload !== "object") return null;
  const expected = createHmac("sha256", secret).update(`${h}.${p}`).digest();
  let given: Buffer;
  try {
    given = Buffer.from(s, "base64url");
  } catch {
    return null;
  }
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  const nowSeconds = Math.floor((options.now ?? new Date()).getTime() / 1000);
  const leeway = options.leewaySeconds ?? 60;
  if (typeof payload.exp === "number" && nowSeconds > payload.exp + leeway) return null;
  if (typeof payload.nbf === "number" && nowSeconds + leeway < payload.nbf) return null;
  if (options.issuer !== undefined && payload.iss !== options.issuer) return null;
  return { header, payload };
}

/** base64 (standard, padded) SHA-256 of a body: the `sha256` claim LiveKit signs into a webhook. */
export function sha256Base64(body: string): string {
  return createHash("sha256").update(body, "utf8").digest("base64");
}

/** Decode a token's payload WITHOUT verifying it. Tests only; never for a decision. */
export function decodeUnverified(token: string): Record<string, unknown> | null {
  const part = token.split(".")[1];
  if (!part) return null;
  try {
    return JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}
