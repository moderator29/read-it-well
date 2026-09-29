import { createServer, type Server } from "node:http";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

/**
 * B-2: THE EDGE GATE, THROUGH THE REAL `proxy()`.
 *
 * A Google-only account with no terms receipt is sent from every app route
 * to `/sign-up/finish` (with `next`), and is never held on the step itself,
 * the legal pages, the API, a public page or a server action (signing out).
 * Once its rows are on file it goes where it asked. A failed read lets it
 * through. Same harness as `proxy-session.test.ts`: a local stand-in for
 * GoTrue and PostgREST, an unsigned token for an invented reader, nothing
 * that is a credential.
 */

const USER = {
  id: "22222222-2222-4222-8222-222222222222",
  aud: "authenticated",
  role: "authenticated",
  email: "social@example.invalid",
  email_confirmed_at: new Date().toISOString(),
  phone: "",
  app_metadata: { provider: "google", providers: ["google"] },
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
      app_metadata: USER.app_metadata,
      iss: "finish-setup-control",
      iat: Math.floor(Date.now() / 1000) - 60,
      exp: expiresAt,
    }),
    Buffer.from("unsigned").toString("base64url"),
  ].join(".");
}

/** What the stand-in's `terms_acceptances` answers, per test. */
let rows: { document: string }[] | "error" = [];
const reads: string[] = [];

let server: Server;
let cookieHeader = "";
let proxy: (request: Request) => Promise<Response>;
let NextRequest: typeof import("next/server").NextRequest;

beforeAll(async () => {
  server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    res.setHeader("content-type", "application/json");
    if (url.pathname === "/auth/v1/user") {
      res.end(JSON.stringify(USER));
      return;
    }
    if (url.pathname === "/rest/v1/terms_acceptances") {
      reads.push(url.search);
      if (rows === "error") {
        res.statusCode = 500;
        res.end(JSON.stringify({ message: "stand-in outage" }));
        return;
      }
      res.end(JSON.stringify(rows));
      return;
    }
    res.statusCode = 404;
    res.end(JSON.stringify({ stub: "not served", path: url.pathname }));
  });
  const port = await new Promise<number>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address && typeof address === "object") resolve(address.port);
      else reject(new Error("the stand-in reported no port"));
    });
  });
  const STUB = `http://127.0.0.1:${port}`;
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

  ({ proxy } = (await import("./proxy")) as unknown as { proxy: (request: Request) => Promise<Response> });
  ({ NextRequest } = await import("next/server"));
}, 60_000);

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

beforeEach(() => {
  rows = [];
  reads.length = 0;
});

async function ask(path: string, init: { method?: string; headers?: Record<string, string> } = {}) {
  const request = new NextRequest(`http://127.0.0.1${path}`, {
    method: init.method ?? "GET",
    headers: { cookie: cookieHeader, ...(init.headers ?? {}) },
  });
  const response = await proxy(request as unknown as Request);
  return { status: response.status, location: response.headers.get("location") ?? "" };
}

describe("a Google account with no receipt finishes setting up first", { timeout: 30_000 }, () => {
  it("is sent from app routes to the step, with where it was going kept", async () => {
    for (const path of ["/home", "/search?q=lekki", "/profile", "/listing/anything"]) {
      const answer = await ask(path);
      expect(answer.status, path).toBe(307);
      const to = new URL(answer.location);
      expect(to.pathname, path).toBe("/sign-up/finish");
      expect(to.searchParams.get("next"), path).toBe(path);
    }
    /* It read its own rows, filtered to itself. */
    expect(reads.some((q) => q.includes(`user_id=eq.${USER.id}`))).toBe(true);
  });

  it("is never held on the step, a legal page, a door, the API or a server action", async () => {
    for (const path of ["/sign-up/finish", "/legal/terms", "/legal/privacy", "/terms", "/privacy", "/sign-in"]) {
      const answer = await ask(path);
      expect(answer.location, path).not.toContain("/sign-up/finish");
    }
    expect((await ask("/api/push/register")).location).not.toContain("/sign-up/finish");
    const action = await ask("/settings", { method: "POST", headers: { "next-action": "abc123" } });
    expect(action.location).not.toContain("/sign-up/finish");
  });

  it("goes where it asked once both rows are on file", async () => {
    rows = [{ document: "terms" }, { document: "age_18_or_over" }];
    const answer = await ask("/home");
    expect(answer.location).not.toContain("/sign-up/finish");
  });

  it("is still held with only the terms row (the 18+ statement is missing)", async () => {
    rows = [{ document: "terms" }];
    expect((await ask("/home")).location).toContain("/sign-up/finish");
  });

  it("is let through when the read fails, so an outage never locks anybody out", async () => {
    rows = "error";
    expect((await ask("/home")).location).not.toContain("/sign-up/finish");
  });
});
