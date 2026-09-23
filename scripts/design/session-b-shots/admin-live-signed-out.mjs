/*
 * LIVE PROOF, SIGNED OUT: THE CONSOLE'S DOORS AGAINST THE REAL PROJECT.
 *
 * Runs against a production build (`next build` + `next start`) whose
 * `.env.local` points at the live Supabase project. For each console door it
 * asks once with no session and once with a forged session cookie (a well
 * formed token the real project has never issued), without following
 * redirects, and records what the server answered. Both are refused by the
 * proxy before any desk renders. The project's edge logs for the run show no
 * `/auth/v1/user` call, so the forged token was refused without asking the
 * project: this proves the doors of the running build configured for the
 * live project, not the project's own token check.
 *
 *   node scripts/design/session-b-shots/admin-live-signed-out.mjs http://127.0.0.1:3175 > evidence.json
 */
const base = process.argv[2] ?? "http://127.0.0.1:3175";
const ref = process.env.SUPABASE_REF ?? "uccixoonmbhrnyczyigt";

const b64u = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const now = Math.floor(Date.now() / 1000);
const forgedJwt = `${b64u({ alg: "HS256", typ: "JWT" })}.${b64u({ sub: "00000000-0000-4000-8000-000000000000", role: "authenticated", aud: "authenticated", exp: now + 3600, iat: now })}.${Buffer.from("not-a-signature").toString("base64url")}`;
const session = { access_token: forgedJwt, token_type: "bearer", expires_in: 3600, expires_at: now + 3600, refresh_token: "forged-refresh-token", user: { id: "00000000-0000-4000-8000-000000000000", aud: "authenticated", role: "authenticated" } };
const forgedCookie = `sb-${ref}-auth-token=base64-${Buffer.from(JSON.stringify(session)).toString("base64")}`;

const doors = ["/admin", "/admin/money", "/admin/operations?tab=jobs", "/admin/enter?next=%2Fadmin%2Fmoney"];
const results = [];
let failed = 0;
for (const door of doors) {
  for (const [label, cookie] of [["no session", null], ["forged session", forgedCookie]]) {
    const res = await fetch(base + door, { redirect: "manual", headers: cookie ? { cookie } : {} });
    const location = res.headers.get("location") ?? "";
    const target = location ? new URL(location, base) : null;
    const expectedNext = door;
    const ok =
      (res.status === 307 || res.status === 303) &&
      target?.pathname === "/sign-in" &&
      target.searchParams.get("next") === expectedNext &&
      target.searchParams.get("notice") === "sign-in-required";
    if (!ok) failed += 1;
    results.push({ door, as: label, status: res.status, location, pass: ok, at: new Date().toISOString() });
  }
}
console.log(JSON.stringify({ base, results }, null, 2));
process.exit(failed ? 1 : 0);
