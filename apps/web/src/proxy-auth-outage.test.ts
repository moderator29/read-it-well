import { createServer, type Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * OPS-05: WHEN SUPABASE AUTH IS SLOW OR DOWN, NOBODY IS SIGNED OUT.
 *
 * The guard asks GoTrue who the reader is on every request. A 5xx, a network
 * failure or a hang used to read exactly like "not signed in", so a short
 * GoTrue incident sent every member to /sign-in at once, and a slow one held
 * every tap. The guard now passes a request that carries a session through
 * when the answer is not an answer (the pages' own reads then fail visibly),
 * and still refuses when GoTrue says the session is not valid or when there is
 * no session at all.
 *
 * Drives the real `proxy()` against a local stand-in for `/auth/v1/user`, as
 * `proxy-session.test.ts` does, with the same unsigned, invented session.
 */

const USER = {
  id: "11111111-1111-4111-8111-111111111111",
  aud: "authenticated",
  role: "authenticated",
  email: "reviewer@example.invalid",
  email_confirmed_at: new Date().toISOString(),
  phone: "",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: {},
  identities: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  is_anonymous: false,
};

const b64 = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");

function accessToken(expiresAt: number): string {
  return [
    b64({ alg: "HS256", typ: "JWT" }),
    b64({
      sub: USER.id,
      aud: "authenticated",
      role: "authenticated",
      email: USER.email,
      iss: "outage-control",
      iat: Math.floor(Date.now() / 1000) - 60,
      exp: expiresAt,
    }),
    Buffer.from("unsigned").toString("base64url"),
  ].join(".");
}

const PORT = 33494;
const STUB = `http://127.0.0.1:${PORT}`;

/** How the stand-in answers `/auth/v1/user`. */
let mode: "ok" | "down" | "hang" | "revoked" = "ok";

let server: Server;
let cookieHeader = "";
let proxy: (request: Request) => Promise<Response>;
let NextRequest: typeof import("next/server").NextRequest;

beforeAll(async () => {
  server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    res.setHeader("content-type", "application/json");
    if (url.pathname !== "/auth/v1/user") {
      res.statusCode = 404;
      res.end(JSON.stringify({ stub: "serves /auth/v1/user only" }));
      return;
    }
    if (mode === "hang") return; // never answers
    if (mode === "down") {
      res.statusCode = 503;
      res.end(JSON.stringify({ message: "upstream unavailable" }));
      return;
    }
    if (mode === "revoked") {
      res.statusCode = 403;
      res.end(JSON.stringify({ code: 403, error_code: "bad_jwt", msg: "invalid JWT" }));
      return;
    }
    res.end(JSON.stringify(USER));
  });
  await new Promise<void>((resolve) => server.listen(PORT, "127.0.0.1", resolve));

  process.env.NEXT_PUBLIC_SUPABASE_URL = STUB;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "stub-anon-key";

  const { createServerClient } = await import("@supabase/ssr");
  const jar: { name: string; value: string }[] = [];
  const client = createServerClient(STUB, "stub-anon-key", {
    cookies: {
      getAll: () => jar,
      setAll: (list) => {
        for (const cookie of list) jar.push({ name: cookie.name, value: cookie.value });
      },
    },
  });
  const { error } = await client.auth.setSession({
    access_token: accessToken(Math.floor(Date.now() / 1000) + 3600),
    refresh_token: "unsigned-refresh",
  });
  if (error) throw new Error(`the stand-in could not mint a session: ${error.message}`);
  cookieHeader = jar.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");

  ({ proxy } = (await import("./proxy")) as unknown as {
    proxy: (request: Request) => Promise<Response>;
  });
  ({ NextRequest } = await import("next/server"));
});

afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

async function ask(path: string, withSession: boolean) {
  const request = new NextRequest(`http://127.0.0.1${path}`, {
    headers: withSession ? { cookie: cookieHeader } : {},
  });
  const started = Date.now();
  const response = await proxy(request as unknown as Request);
  return {
    status: response.status,
    location: response.headers.get("location") ?? "",
    ms: Date.now() - started,
  };
}

describe("an auth outage does not sign anybody out (OPS-05)", () => {
  it("control: a session passes and no session is refused while auth answers", async () => {
    mode = "ok";
    expect((await ask("/home", true)).location).not.toContain("/sign-in");
    expect((await ask("/home", false)).location).toContain("/sign-in");
  });

  it("passes a session through when auth answers 503", async () => {
    mode = "down";
    const answer = await ask("/home", true);
    expect(answer.location, "a GoTrue 5xx signed the reader out").not.toContain("/sign-in");
    expect((await ask("/api/push/register", true)).status).not.toBe(401);
  });

  it("passes a session through, promptly, when auth does not answer", async () => {
    mode = "hang";
    const answer = await ask("/home", true);
    expect(answer.location, "a hung GoTrue signed the reader out").not.toContain("/sign-in");
    expect(answer.ms, "the guard waited on a hung GoTrue").toBeLessThan(6000);
  }, 10_000);

  it("still refuses a session auth says is not valid", async () => {
    mode = "revoked";
    expect((await ask("/home", true)).location).toContain("/sign-in");
  });

  it("still refuses a request with no session at all, whatever auth is doing", async () => {
    mode = "down";
    expect((await ask("/home", false)).location).toContain("/sign-in");
    mode = "hang";
    expect((await ask("/home", false)).location).toContain("/sign-in");
  }, 10_000);
});
