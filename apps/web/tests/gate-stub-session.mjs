/**
 * A SESSION, WITHOUT A SUPABASE PROJECT, SO THE GATE'S CONTROL CAN BE RUN.
 *
 * ===========================================================================
 * WHY THIS EXISTS
 * ===========================================================================
 *
 * `gate.spec.mjs` proves that a request with no session is refused. That half
 * on its own is worthless, and dangerously so: A GATE THAT REFUSES EVERYBODY
 * PASSES A TEST THAT ONLY CHECKS REFUSALS. The control is the other half, and
 * it needs a request that DOES carry a session.
 *
 * This container's egress proxy answers `CONNECT <project>.supabase.co:443`
 * with 403, so no server started here can reach the real project and no real
 * sign-in can happen. The choice was between running no control at all and
 * running one against a stand-in. This is the stand-in.
 *
 * ===========================================================================
 * WHAT IT IS AND, MORE IMPORTANTLY, WHAT IT IS NOT
 * ===========================================================================
 *
 * It serves ONE endpoint, `GET /auth/v1/user`, which is the one call
 * `proxy.ts` makes, and answers it with an invented user. A server built
 * against this address therefore sees a signed-in reader in the middleware.
 *
 * NOTHING HERE IS A CREDENTIAL. The JWT is unsigned, the address is
 * `example.invalid`, the id is all ones, and the whole thing only satisfies a
 * client that was built pointing at `127.0.0.1`. It cannot be replayed against
 * anything.
 *
 * WHAT THE CONTROL CAN THEREFORE PROVE: that the gate does not refuse a
 * request carrying a session, on every route it refuses without one.
 *
 * WHAT IT CANNOT PROVE, AND THIS MUST BE STATED BESIDE ANY RESULT: that the
 * pages themselves render with real data. Every read past the middleware also
 * goes to this stub, which serves nothing, so a data-backed page will render
 * its empty or not-found state for reasons that have nothing to do with the
 * gate. The control's claim is about the gate and stops there.
 *
 * ===========================================================================
 * RUNNING IT
 * ===========================================================================
 *
 *   node apps/web/tests/gate-stub-session.mjs --port 3492 --serve
 *
 * prints the cookie to pass as GATE_SESSION_COOKIE and then stays up. The
 * server must have been BUILT with NEXT_PUBLIC_SUPABASE_URL pointing at the
 * same address, because Next inlines a NEXT_PUBLIC_ value at build time rather
 * than reading it at runtime.
 */
import { createServer } from "node:http";
import { createServerClient } from "@supabase/ssr";

const args = process.argv.slice(2);
const PORT = Number(args[args.indexOf("--port") + 1] ?? 3492);
const HOST = "127.0.0.1";

/** An invented reader. Not a person, not an account, not a credential. */
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

const b64 = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");

/** A structurally valid, deliberately unsigned JWT. auth-js reads the claims
    locally and this stub never verifies anything. */
function accessToken(expiresAt) {
  return [
    b64({ alg: "HS256", typ: "JWT" }),
    b64({
      sub: USER.id,
      aud: "authenticated",
      role: "authenticated",
      email: USER.email,
      iss: "gate-stub",
      iat: Math.floor(Date.now() / 1000) - 60,
      exp: expiresAt,
    }),
    Buffer.from("unsigned").toString("base64url"),
  ].join(".");
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://${HOST}`);
  res.setHeader("content-type", "application/json");
  if (url.pathname === "/auth/v1/user") {
    res.end(JSON.stringify(USER));
    return;
  }
  /* Everything else is refused loudly rather than faked, so a page that
     rendered empty is traceable to this and not mistaken for the product. */
  res.statusCode = 404;
  res.end(JSON.stringify({ stub: "this stand-in serves /auth/v1/user only", path: url.pathname }));
});

await new Promise((resolve) => server.listen(PORT, HOST, resolve));

/*
 * The cookie is minted by the SAME library the server reads it with, rather
 * than by hand. A hand-rolled cookie that the server silently failed to parse
 * would produce a signed-out walk reported as a signed-in one, which is the
 * exact lie this whole exercise exists to avoid.
 */
const jar = [];
const client = createServerClient(`http://${HOST}:${PORT}`, "stub-anon-key", {
  cookies: {
    getAll: () => jar,
    setAll: (list) => {
      for (const cookie of list) jar.push({ name: cookie.name, value: cookie.value });
    },
  },
});
const expiresAt = Math.floor(Date.now() / 1000) + 3600;
const { error } = await client.auth.setSession({
  access_token: accessToken(expiresAt),
  refresh_token: "unsigned-refresh",
  expires_in: 3600,
  expires_at: expiresAt,
  token_type: "bearer",
  user: USER,
});
if (error) {
  console.error(`REFUSING: the stand-in could not mint a session: ${error.message}`);
  process.exit(1);
}
if (jar.length === 0) {
  console.error("REFUSING: no cookie was written, so there is nothing to walk with.");
  process.exit(1);
}

/* One line, ready to export. Several cookies would be joined with "; ". */
console.log(jar.map((cookie) => `${cookie.name}=${cookie.value}`).join("; "));

if (!args.includes("--serve")) {
  server.close();
  process.exit(0);
}
