/*
 * LIVE PROOF ON PRODUCTION: THE SEND FORM'S RECIPIENT LOOKUP, READ ONLY.
 *
 * Signs in as the QA member by password grant against the live project, sets
 * the session cookie, opens production's /wallet/send and calls the same
 * `lookupRecipient` server action the form calls when an address is typed,
 * with the QA admin's address. It never calls a transfer, fund or withdraw
 * action and never presses Send. HTTP, not a browser: this box's Chromium
 * cannot verify public sites (ERR_CERT_AUTHORITY_INVALID); Node verifies TLS
 * against the box's CA bundle.
 *
 *   set -a; . <qa.env>; set +a
 *   NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt \
 *     node scripts/design/session-b-shots/wallet-live-lookup-production.mjs
 *
 * Credentials from the environment only: QA_MEMBER_EMAIL, QA_MEMBER_PASSWORD,
 * QA_ADMIN_EMAIL. Run from the repository root (reads apps/web/.env.local for
 * the project URL and anon key). The admin's address is never printed.
 */
import { readFileSync } from "node:fs";
const env = Object.fromEntries(readFileSync("apps/web/.env.local", "utf8").split("\n").filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const SB = env.NEXT_PUBLIC_SUPABASE_URL, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SITE = "https://www.vallospaces.com";
const { QA_MEMBER_EMAIL, QA_MEMBER_PASSWORD, QA_ADMIN_EMAIL } = process.env;
const tok = await (await fetch(`${SB}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, "content-type": "application/json" }, body: JSON.stringify({ email: QA_MEMBER_EMAIL, password: QA_MEMBER_PASSWORD }) })).json();
if (!tok.access_token) { console.log("SIGN-IN FAILED", tok.error_description ?? tok.msg); process.exit(1); }
const ref = new URL(SB).hostname.split(".")[0];
const val = "base64-" + Buffer.from(JSON.stringify(tok)).toString("base64url");
const parts = []; for (let i = 0; i < val.length; i += 3180) parts.push(val.slice(i, i + 3180));
const cookie = parts.length === 1 ? `sb-${ref}-auth-token=${val}` : parts.map((p, i) => `sb-${ref}-auth-token.${i}=${p}`).join("; ");
const page = await fetch(`${SITE}/wallet/send`, { headers: { cookie }, redirect: "manual" });
console.log("GET /wallet/send", page.status, page.headers.get("location") ?? "", "x-vercel-id", page.headers.get("x-vercel-id"));
const html = await page.text();
console.log("signed in page:", !/sign-in/.test(page.headers.get("location") ?? ""), "bank mode present:", /nf-send-bank|To bank|To a bank/i.test(html), "wallet copy:", /Wallet to wallet/.test(html));
const buildId = (html.match(/"buildId":"([^"]+)"/) ?? html.match(/buildId\\":\\"([^\\"]+)/) ?? [])[1];
console.log("buildId", buildId ?? "(not in page)");
const chunks = [...new Set([...html.matchAll(/\/_next\/static\/chunks\/[^"'\\ ]+\.js/g)].map((m) => m[0]))];
let id = null;
for (const c of chunks) {
  const js = await (await fetch(SITE + c)).text();
  const m = js.match(/createServerReference\)\("([0-9a-f]{40,})"[^)]*?"lookupRecipient"/) ?? js.match(/\("([0-9a-f]{40,})",[^)]{0,200}"lookupRecipient"\)/);
  if (m) { id = m[1]; console.log("action in", c); break; }
}
if (!id) { console.log("lookup action id not found in", chunks.length, "chunks"); process.exit(1); }
const res = await fetch(`${SITE}/wallet/send`, { method: "POST", headers: { cookie, "Next-Action": id, "content-type": "text/plain;charset=UTF-8", accept: "text/x-component" }, body: JSON.stringify([QA_ADMIN_EMAIL]) });
const txt = await res.text();
const line = txt.split("\n").find((l) => /"state"/.test(l)) ?? txt.slice(0, 300);
console.log("POST lookup", res.status, line.replace(QA_ADMIN_EMAIL, "<admin address>"));
