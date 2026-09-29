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
/* The JWKS endpoint answers 503 while this is set: auth is down. */
let jwksDown = false;
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
      if (jwksDown) {
        res.statusCode = 503;
        res.end(JSON.stringify({ msg: "unavailable" }));
        return;
      }
      res.end(JSON.stringify({ keys: [jwk] }));
      return;
    }
    if (url.pathname === "/auth/v1/user") {
      /* GoTrue refuses every token this file sends it: a valid ES256 session
         must never get here, and anything forged must be refused if it does. */
      userCalls += 1;
      res.statusCode = 403;
      res.end(JSON.stringify({ code: 403, error_code: "bad_jwt", msg: "invalid JWT" }));
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

  /* Hand-built tokens: a header and a payload of our choosing, any signature. */
  function rawToken(header: unknown, payload: unknown, signature = "c2ln"): string {
    return `${typeof header === "string" ? header : b64(header)}.${b64(payload)}.${signature}`;
  }

  it("refuses alg:none, whether or not it names a real key id", async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const payload = { sub: USER_ID, aud: "authenticated", role: "authenticated", exp };
    for (const header of [{ alg: "none", typ: "JWT" }, { alg: "none", typ: "JWT", kid: KID }]) {
      const answer = await ask("/home", sessionCookie(rawToken(header, payload, ""), exp));
      expect(answer.status, JSON.stringify(header)).toBe(307);
      expect(answer.location).toContain("/sign-in");
    }
  });

  it("refuses an algorithm it cannot verify on a real key id (PS256, ES512)", async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const payload = { sub: USER_ID, aud: "authenticated", role: "authenticated", exp };
    for (const alg of ["PS256", "ES512", "EdDSA"]) {
      const answer = await ask("/home", sessionCookie(rawToken({ alg, typ: "JWT", kid: KID }, payload), exp));
      expect(answer.status, alg).toBe(307);
      expect(answer.location).toContain("/sign-in");
    }
  });

  it("refuses an HS256 token signed with the public anon key (falls back to auth, which says no)", async () => {
    const { createHmac } = await import("node:crypto");
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const head = b64({ alg: "HS256", typ: "JWT", kid: KID });
    const body = b64({ sub: USER_ID, aud: "authenticated", role: "authenticated", exp });
    const sig = createHmac("sha256", "stub-anon-key").update(`${head}.${body}`).digest("base64url");
    userCalls = 0;
    const answer = await ask("/home", sessionCookie(`${head}.${body}.${sig}`, exp));
    expect(answer.status).toBe(307);
    expect(answer.location).toContain("/sign-in");
    expect(userCalls).toBe(1);
  });

  it("refuses a correctly signed token that has expired", async () => {
    const past = Math.floor(Date.now() / 1000) - 60;
    /* The cookie claims the session is still fresh, so no refresh is tried:
       the token's own exp is what must refuse it. */
    const cookie = sessionCookie(await signedToken(USER_ID, past), past + 7200);
    const answer = await ask("/home", cookie);
    expect(answer.status).toBe(307);
    expect(answer.location).toContain("/sign-in");
  });

  it("refuses a token whose header or payload is not JSON, rather than letting it through as an outage", async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const notJson = Buffer.from("not json").toString("base64url");
    for (const token of [`${notJson}.${b64({ sub: USER_ID, exp })}.c2ln`, `${b64({ alg: "ES256", kid: KID })}.${notJson}.c2ln`]) {
      const answer = await ask("/home", sessionCookie(token, exp));
      expect(answer.status, token).toBe(307);
      expect(answer.location).toContain("/sign-in");
    }
  });

  it("never trusts an unverified token when the key set cannot be fetched", async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const forged = await (async () => {
      const other = (await webcrypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"])) as CryptoKeyPair;
      return signedToken(USER_ID, exp, other.privateKey);
    })();
    /* A key id the cache has never seen forces a fetch, which fails. */
    const [head, body, sig] = forged.split(".");
    const unknownKid = `${b64({ ...JSON.parse(Buffer.from(head!, "base64url").toString()), kid: "never-published" })}.${body}.${sig}`;
    jwksDown = true;
    try {
      /* OPS-05 lets a session through to the page while auth is down (the page's
         own getUser() and RLS decide), which is the pass-through, not a
         verified reader: the answer is the page, never an identity. */
      const answer = await ask("/home", sessionCookie(unknownKid, exp));
      expect(answer.location).not.toContain("/sign-in");
      /* A key that IS cached still refuses a forgery with auth down. */
      const cachedKid = await ask("/home", sessionCookie(forged, exp));
      expect(cachedKid.status).toBe(307);
      expect(cachedKid.location).toContain("/sign-in");
    } finally {
      jwksDown = false;
    }
  });

  it("still refuses with no session at all", async () => {
    const answer = await ask("/home");
    expect(answer.status).toBe(307);
    expect(answer.location).toContain("/sign-in");
  });
});
