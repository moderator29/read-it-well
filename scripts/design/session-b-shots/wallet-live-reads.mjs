/*
 * LIVE PROOF, SIGNED IN AS THE QA MEMBER: THE WALLET'S READS AGAINST THE REAL
 * PROJECT. READ ONLY: it never funds, sends, withdraws or moves money, and it
 * never presses a submit control on a money form.
 *
 * Credentials come from the environment only, never from the repository:
 *   QA_MEMBER_EMAIL, QA_MEMBER_PASSWORD  the member who signs in
 *   QA_ADMIN_EMAIL                       the recipient looked up (no password used)
 *
 *   node scripts/design/session-b-shots/wallet-live-reads.mjs http://127.0.0.1:3174 <out-dir>
 *
 * Against a production build whose .env.local points at the live project.
 * What it proves, each step recorded with its time and a shot:
 *   1. /wallet renders the member's live balance (the QA member has no wallet
 *      row, so the server figure is N0.00) and no failure copy;
 *   2. /wallet/transactions renders the live history (empty for this member)
 *      and no failure copy;
 *   3. /wallet/receive renders the member's own receive details;
 *   4. /wallet/send renders wallet-to-wallet mode only (no bank choice), and
 *      typing the QA admin's address reaches the live recipient lookup, which
 *      answers with the admin's name. Send is never pressed.
 * Every typed address is blurred in the shot so no inbox lands in a proof.
 */
import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync } from "node:fs";

const [, , base = "http://127.0.0.1:3174", out = "live-wallet"] = process.argv;
const { QA_MEMBER_EMAIL, QA_MEMBER_PASSWORD, QA_ADMIN_EMAIL } = process.env;
if (!QA_MEMBER_EMAIL || !QA_MEMBER_PASSWORD || !QA_ADMIN_EMAIL) {
  console.error("WAITING ON QA CREDENTIALS: set QA_MEMBER_EMAIL, QA_MEMBER_PASSWORD and QA_ADMIN_EMAIL.");
  process.exit(2);
}
mkdirSync(out, { recursive: true });
const FAILS = ["This did not load", "Something went wrong", "Application error", "could not load"];
const steps = [];
let failed = 0;
const record = (step, pass, detail, shot) => {
  steps.push({ step, pass, detail, shot, at: new Date().toISOString() });
  if (!pass) failed += 1;
  console.log(`${pass ? "PASS" : "FAIL"} ${step}: ${detail}`);
};

// Against a remote host, PW_USE_PROXY=1 sends the browser through the box's
// HTTPS proxy. (On this box Chromium cannot verify public sites,
// ERR_CERT_AUTHORITY_INVALID, so production is probed over HTTP by
// wallet-live-lookup-production.mjs instead.)
const proxyUrl = process.env.PW_USE_PROXY ? new URL(process.env.HTTPS_PROXY ?? process.env.https_proxy ?? "") : null;
const proxy = proxyUrl
  ? { server: `${proxyUrl.protocol}//${proxyUrl.host}`, username: decodeURIComponent(proxyUrl.username) || undefined, password: decodeURIComponent(proxyUrl.password) || undefined }
  : undefined;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium", proxy });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: "reduce" });
const page = await ctx.newPage();
const requests = [];
page.on("request", (r) => {
  if (r.method() === "POST") requests.push(new URL(r.url()).pathname);
});

async function shot(name) {
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('input[type="email"], #nf-send-recipient, #email')) el.style.filter = "blur(6px)";
  });
  const path = `${out}/${name}.jpg`;
  await page.screenshot({ path, fullPage: true, type: "jpeg", quality: 78 });
  return path;
}
async function body() {
  return (await page.locator("main").innerText().catch(() => "")).replace(/\s+/g, " ");
}

// Sign in through the real form.
await page.goto(`${base}/sign-in/email?next=${encodeURIComponent("/wallet")}`, { waitUntil: "networkidle" });
await page.fill("#email", QA_MEMBER_EMAIL);
await page.fill("#password", QA_MEMBER_PASSWORD);
await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/sign-in"), { timeout: 30_000 }), page.click('button[type="submit"]')]);
await page.waitForLoadState("networkidle");
record("sign in", !new URL(page.url()).pathname.startsWith("/sign-in"), `landed ${new URL(page.url()).pathname}`, null);

// 1. The balance.
await page.goto(`${base}/wallet`, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
{
  const b = await body();
  const hero = (await page.locator(".nf-wallet-hero").first().innerText().catch(() => "")).replace(/\s+/g, " ");
  const bad = FAILS.filter((t) => b.includes(t));
  record("wallet balance read", new URL(page.url()).pathname === "/wallet" && /₦\s?0(\.00)?\b|₦0/.test(hero) && !bad.length, `hero reads "${hero.slice(0, 80)}"; failure copy ${bad.join(", ") || "none"}`, await shot("01-wallet"));
}

// 2. The history.
await page.goto(`${base}/wallet/transactions`, { waitUntil: "networkidle" });
{
  const b = await body();
  const bad = FAILS.filter((t) => b.includes(t));
  record("transactions read", new URL(page.url()).pathname === "/wallet/transactions" && !bad.length, `landed ${new URL(page.url()).pathname}; ${b.slice(0, 120)}; failure copy ${bad.join(", ") || "none"}`, await shot("02-transactions"));
}

// 3. Receive details.
await page.goto(`${base}/wallet/receive`, { waitUntil: "networkidle" });
{
  const b = await body();
  const bad = FAILS.filter((t) => b.includes(t));
  const panels = await page.locator('[aria-labelledby="nf-receive-identity"]').count();
  record("receive details read", new URL(page.url()).pathname === "/wallet/receive" && panels === 1 && !bad.length, `identity panel ${panels}; failure copy ${bad.join(", ") || "none"}`, await shot("03-receive"));
}

// 4. Send: wallet to wallet only, and the live recipient lookup. Never submitted.
await page.goto(`${base}/wallet/send`, { waitUntil: "networkidle" });
{
  const b = await body();
  const bankChoice = await page.locator("#nf-send-bank, [data-testid*=bank]").count();
  record("send is wallet to wallet only", bankChoice === 0 && (await page.locator("#nf-send-recipient").count()) === 1, `recipient field drawn; bank controls ${bankChoice}; failure copy ${FAILS.filter((t) => b.includes(t)).join(", ") || "none"}`, await shot("04-send"));
  await page.fill("#nf-send-recipient", QA_ADMIN_EMAIL);
  await page.locator("#nf-send-recipient").blur();
  const found = page.locator('[data-testid="wallet-send-recipient-found"]');
  const ok = await found.waitFor({ timeout: 20_000 }).then(() => true).catch(() => false);
  const name = ok ? (await found.innerText()).replace(/\s+/g, " ").trim() : "(no answer)";
  record("recipient lookup of the QA admin", ok, `lookup answered: "${name}"`, await shot("05-send-recipient-found"));
}
record("no money moved", !requests.some((p) => /transfer|withdraw|fund|top-?up/i.test(p)), `POSTs seen: ${[...new Set(requests)].join(", ") || "none"}`, null);

await browser.close();
writeFileSync(`${out}/steps.json`, JSON.stringify({ base, steps }, null, 2));
process.exit(failed ? 1 : 0);
