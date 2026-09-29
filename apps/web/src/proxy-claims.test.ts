import { createServer, type Server } from "node:http";
import { webcrypto } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * SPEED-1: THE GUARD VERIFIES AN ES256 SESSION LOCALLY, AND DOES NOT CALL AUTH.
 *
 * `proxy.ts` runs at the Vercel PoP nearest the visitor, not beside the
 * database, so a `getUser()` there was a round trip to GoTrue in eu-west-1 on
 * every navigation and every prefetch. It now calls `getClaims()`, which
 * verifies the token's signature against the project's JWKS (fetched once and
 * cached) and never asks `/auth/v1/user` while the token is asymmetric.
 *
 * The stand-in serves the JWKS and counts every `/auth/v1/user` request. The
 * key pair is generated here and exists only for this file.
 *
 * `proxy-session.test.ts` and `proxy-auth-outage.test.ts` keep proving the
 * other half: an HS256 (symmetric) token makes `getClaims()` fall back to
 * `getUser()`, so the gate admits and refuses exactly as it did.
 */

const USER_ID = "22222222-2222-4222-8222-222222222222";
const KID = "speed-test-key";

let server: Server;
let STUB = "";
let userCalls = 0;
let jwk: Record<string, unknown>;
let privateKey: CryptoKey;
let proxy: (request: Request) => Promise<Response>;
let NextRequest: typeof import("next/server").NextRequest;

const b64 = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");

async function signedToken(sub: string, expiresAt: number, key: CryptoKey = privateKey): Promise<string> {
  const head = b64({ alg: "ES256", typ: "JWT", kid: KID });
  const body = b64({ sub, aud: "authenticated", role: "authenticated", iat: expiresAt - 3600, exp: expiresAt });
  const signature = await webcrypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, Buffer.from(`${head}.${body}`));
  return `${head}.${body}.${Buffer.from(signature).toString("base64url")}`;
}

/** A session cookie in the exact shape `@supabase/ssr` writes and reads. */
function sessionCookie(accessToken: string, expiresAt: number): string {
  const session = {
    access_token: accessToken,
    refresh_token: "unsigned-refresh",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: expiresAt,
    user: { id: USER_ID, aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() },
  };
  const ref = new URL(STUB).hostname.split(".")[0];
  return `sb-${ref}-auth-token=base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`;
}

beforeAll(async () => {
  const pair = (await webcrypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"])) as CryptoKeyPair;
  privateKey = pair.privateKey;
  jwk = { ...(await webcrypto.subtle.exportKey("jwk", pair.publicKey)), kid: KID, alg: "ES256", use: "sig", key_ops: ["verify"] };

  server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    res.setHeader("content-type", "application/json");
    if (url.pathname === "/auth/v1/.well-known/jwks.json") {
      res.end(JSON.stringify({ keys: [jwk] }));
      return;
    }
    if (url.pathname === "/auth/v1/user") {
      userCalls += 1;
      res.end(JSON.stringify({ id: USER_ID, aud: "authenticated", role: "authenticated" }));
      return;
    }
    res.statusCode = 404;
    res.end(JSON.stringify({ stub: "jwks and user only", path: url.pathname }));
  });
  const port = await new Promise<number>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address && typeof address === "object") resolve(address.port);
      else reject(new Error("the stand-in reported no port"));
    });
  });
  STUB = `http://127.0.0.1:${port}`;
  process.env.NEXT_PUBLIC_SUPABASE_URL = STUB;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "stub-anon-key";

  ({ proxy } = (await import("./proxy")) as unknown as { proxy: (request: Request) => Promise<Response> });
  ({ NextRequest } = await import("next/server"));
}, 60_000);

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

async function ask(path: string, cookie?: string, headers: Record<string, string> = {}) {
  const request = new NextRequest(`http://127.0.0.1${path}`, { headers: { ...headers, ...(cookie ? { cookie } : {}) } });
  const response = await proxy(request as unknown as Request);
  return { status: response.status, location: response.headers.get("location") ?? "" };
}

describe("the guard reads an ES256 session without a round trip to auth", { timeout: 30_000 }, () => {
  it("admits a signed session on gated routes and never calls /auth/v1/user", async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const cookie = sessionCookie(await signedToken(USER_ID, exp), exp);
    userCalls = 0;
    for (const path of ["/home", "/messages", "/saved", "/settings"]) {
      /* A client navigation and a prefetch are the requests this was paid on. */
      const doc = await ask(path, cookie);
      const rsc = await ask(path, cookie, { rsc: "1", "next-router-prefetch": "1" });
      expect(doc.location, path).not.toContain("/sign-in");
      expect(rsc.location, path).not.toContain("/sign-in");
    }
    expect(userCalls).toBe(0);
  });

  it("refuses a token signed by any other key, still without asking auth", async () => {
    const other = (await webcrypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"])) as CryptoKeyPair;
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const forged = sessionCookie(await signedToken(USER_ID, exp, other.privateKey), exp);
    userCalls = 0;
    const answer = await ask("/home", forged);
    expect(answer.status).toBe(307);
    expect(answer.location).toContain("/sign-in");
    expect(userCalls).toBe(0);
  });

  it("still refuses with no session at all", async () => {
    const answer = await ask("/home");
    expect(answer.status).toBe(307);
    expect(answer.location).toContain("/sign-in");
  });
});
