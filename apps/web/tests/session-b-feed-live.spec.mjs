/*
 * THE FEED AND THE BLOOM, SIGNED IN, AGAINST THE REAL PROJECT.
 *
 * Runs against a production build (`next build` + `next start`, server started
 * with NODE_USE_ENV_PROXY=1 and NODE_EXTRA_CA_CERTS so Node reaches Supabase)
 * as the QA member, whose credentials come from the environment only
 * (QA_MEMBER_EMAIL / QA_MEMBER_PASSWORD) and are never written anywhere.
 *
 * READ AND OPEN ONLY. It opens each composer the bloom leads to and closes it;
 * it never posts, likes, reposts or replies.
 *
 *   node apps/web/tests/session-b-feed-live.spec.mjs [base] [shots dir]
 *
 * Expected values are passed in from a read-only SQL check made just before
 * the run (EXPECT_JSON), so the script compares the screen with the rows
 * rather than with numbers written into it.
 */
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const BASE_URL = process.argv[2] ?? "http://127.0.0.1:3185";
const SHOTS = process.argv[3] ?? "docs/design/proofs/session-b/feed/live";
const EXPECT = JSON.parse(process.env.EXPECT_JSON ?? "{}");
mkdirSync(SHOTS, { recursive: true });

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` (${detail})` : ""}`);
};
const stamp = () => new Date().toISOString();

const email = process.env.QA_MEMBER_EMAIL;
const password = process.env.QA_MEMBER_PASSWORD;
if (!email || !password) {
  console.log("WAITING ON QA CREDENTIALS: QA_MEMBER_EMAIL / QA_MEMBER_PASSWORD not set");
  process.exit(2);
}

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await ctx.addCookies([{ name: "vallo_first_run", value: "seen", url: BASE_URL }]);
const page = await ctx.newPage();
const path = () => page.url().replace(BASE_URL, "");
const shot = (name) => page.screenshot({ path: `${SHOTS}/${name}.jpg`, type: "jpeg", quality: 80 });

async function fillAndWaitHydrated(selector, value) {
  for (let i = 0; i < 40; i++) {
    await page.fill(selector, value);
    if ((await page.inputValue(selector)) === value) return;
    await page.waitForTimeout(250);
  }
}

console.log(`signed in run, ${stamp()}, ${BASE_URL}`);

/* 1. A real sign-in that lands on the feed. */
await page.goto(`${BASE_URL}/sign-in?next=${encodeURIComponent("/around")}`, { waitUntil: "domcontentloaded" });
await fillAndWaitHydrated("#auth-email", email);
await page.click("button:has-text('Continue')");
await page.waitForURL(/\/sign-in\/email/, { timeout: 20000 });
await fillAndWaitHydrated("#password", password);
await page.click("button[type=submit]:has-text('Sign in')");
await page.waitForURL((u) => u.pathname === "/around", { timeout: 40000 }).catch(() => {});
check("sign-in lands on /around", path().startsWith("/around"), path());
/* The streamed skeleton also wears `.nf-post`; a real card has its open link. */
await page.waitForSelector("a.nf-post__open", { timeout: 40000 }).catch(() => {});
await page.waitForTimeout(1500);

/* 2. Real posts, and the removed one nowhere. */
const ids = async () =>
  page.$$eval("a.nf-post__open", (as) => as.map((a) => a.getAttribute("href")?.replace("/post/", "")));
const first = await ids();
check("the feed draws real posts", first.length > 0, `${first.length} cards on page one`);
if (EXPECT.newest) check("newest live post first, as the rows order it", first[0] === EXPECT.newest, first[0]);
if (EXPECT.removed) check("the removed post is not drawn", !first.includes(EXPECT.removed));
await shot("live-around-390");

/* 3. Counts are the row's own columns. */
for (const [id, want] of Object.entries(EXPECT.counts ?? {})) {
  const got = await page
    .$$eval(`article:has(a[href="/post/${id}"]) .nf-post__actions .nf-numeric`, (els) => els.map((e) => e.textContent?.trim()))
    .catch(() => []);
  check(`counts on ${id.slice(0, 8)} are the row's (like, repost, reply)`, JSON.stringify(got) === JSON.stringify(want), `${got} vs ${want}`);
}

/* 4. The verified mark is person_badge's. */
for (const [id, tier] of Object.entries(EXPECT.tiers ?? {})) {
  const card = `article:has(a[href="/post/${id}"])`;
  await page.locator(card).first().scrollIntoViewIfNeeded().catch(() => {});
  const got = await page.$$eval(`${card} [data-testid="tier-badge"]`, (els) => els.map((e) => e.getAttribute("data-tier"))).catch(() => []);
  check(`the mark on ${id.slice(0, 8)} is person_badge's (${tier})`, got.length === 1 && got[0] === tier, `drawn: ${got.join(",") || "none"}`);
  if (got.length) await page.locator(card).first().screenshot({ path: `${SHOTS}/live-tier-card.jpg`, type: "jpeg", quality: 80 });
}
const system = await page.$$eval('article[aria-label="Posted by Vallo"] [data-testid="tier-badge"]', (e) => e.length);
check("platform posts carry no person mark", system === 0, `${system}`);

/* 5. The next page, through the same read and the same stamp. */
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(3000);
const more = page.locator(".nf-feed-more__button");
if ((await ids()).length === first.length && (await more.count())) await more.first().click().catch(() => {});
await page.waitForTimeout(3000);
const second = await ids();
check("the next page loads real posts", second.length > first.length, `${first.length} -> ${second.length}`);
if (EXPECT.removed) check("the removed post is not drawn on any page", !second.includes(EXPECT.removed));
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(500);

/* 6. The bloom opens, and each plate opens its real composer. Open and close only. */
await page.click('[data-testid="bloom-fab"]');
await page.waitForTimeout(900);
const plates = await page.$$eval('[role="menuitem"]', (els) => els.map((e) => e.textContent?.trim()));
check("the bloom opens Review, Story, Post", JSON.stringify(plates) === JSON.stringify(["Review", "Story", "Post"]), plates.join(","));
await shot("live-bloom-open-390");

await page.click('[data-testid="bloom-post"]');
await page.waitForTimeout(800);
const composer = await page.locator('[role="dialog"][aria-label="Post"] textarea').count();
check("Post opens the real composer", composer > 0);
await shot("live-bloom-post-composer-390");
await page.keyboard.press("Escape");
await page.waitForTimeout(500);
check("the composer closes without posting", (await page.locator('[role="dialog"][aria-label="Post"]').count()) === 0);

await page.click('[data-testid="bloom-fab"]');
await page.waitForTimeout(900);
await page.click('[data-testid="bloom-review"]');
await page.waitForTimeout(800);
const review = page.locator('[role="dialog"][aria-label="Review a stay"]');
check("Review opens the review picker (the member's real stays)", (await review.count()) > 0,
  (await review.locator("h3").first().textContent().catch(() => null)) ?? "picker");
await shot("live-bloom-review-390");
await page.keyboard.press("Escape");
await page.waitForTimeout(500);

await page.click('[data-testid="bloom-fab"]');
await page.waitForTimeout(900);
await page.click('[data-testid="bloom-story"]');
await page.waitForURL((u) => u.pathname === "/stories/new", { timeout: 20000 }).catch(() => {});
check("Story opens the real story composer", path().startsWith("/stories/new"), path());
await page.waitForTimeout(1200);
await shot("live-story-composer-390");

/* 7. The back control points at the landing (founder ruling C3.2). */
await page.goto(`${BASE_URL}/around`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("[data-nav-back]", { timeout: 20000 }).catch(() => {});
check("the back control is drawn on /around", (await page.locator("[data-nav-back]").count()) === 1);
await page.click("[data-nav-back]");
await page.waitForURL((u) => u.pathname === "/", { timeout: 15000 }).catch(() => {});
check("back from /around goes to the landing", new URL(page.url()).pathname === "/", path());

const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed} of ${results.length} passed, ${stamp()}`);
await browser.close();
process.exit(passed === results.length ? 0 : 1);
