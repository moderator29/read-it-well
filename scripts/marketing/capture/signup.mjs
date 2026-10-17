/**
 * THE SIGN-UP FLOW, as a new member meets it.
 *
 *   SIGNUP_EMAIL=... SIGNUP_PASSWORD=... node scripts/marketing/capture/signup.mjs
 *   SIGNUP_EMAIL=... SIGNUP_PASSWORD=... node scripts/marketing/capture/signup.mjs --dry
 *
 * Walks /sign-up to /sign-up/email, fills the form the way a person does
 * (typed, not set: the form keeps its values in React state), and captures
 * every stage on the phone and on the desktop for the first of the three
 * short films.
 *
 * --dry stops before "Create account", so the flow can be rehearsed and the
 * shots checked without making an account.
 *
 * THE NAME ON THE FORM is the product's own placeholder pair, Ada Okafor, so
 * no real person's name is ever on screen (DESIGN.md section 2). The password
 * is typed into a password field and never captured in plain text; neither
 * credential is written to disk.
 *
 * Out: docs/marketing/source/su-*.webp (phone) and d-su-*.webp (desktop).
 */
import sharp from "sharp";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs";
import { BASE, VIEWPORTS, launch } from "./session.mjs";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "../../../docs/marketing/source");
const DRY = process.argv.includes("--dry");
const EMAIL = process.env.SIGNUP_EMAIL;
const PASSWORD = process.env.SIGNUP_PASSWORD;
if (!EMAIL || !PASSWORD) {
  console.error("set SIGNUP_EMAIL and SIGNUP_PASSWORD");
  process.exit(1);
}
const NAME = { first: "Ada", surname: "Okafor" };

mkdirSync(OUT, { recursive: true });
const browser = await launch();

/** A field is typed, key by key: a programmatic fill leaves React's state empty. */
async function typeInto(page, selector, value) {
  await page.waitForSelector(selector, { timeout: 60_000 });
  const field = page.locator(selector);
  await field.click();
  await field.pressSequentially(value, { delay: 28 });
}

async function shot(page, id, kind) {
  const file = join(OUT, `${kind === "desktop" ? "d-" : ""}${id}.webp`);
  const png = await page.screenshot({ type: "png" });
  await sharp(png).webp({ quality: 92 }).toFile(file);
  console.log(`  ${file.split("/").pop()}`);
}

for (const kind of ["mobile", "desktop"]) {
  console.log(kind);
  const ctx = await browser.newContext({ ...VIEWPORTS[kind], reducedMotion: "reduce", locale: "en-NG", timezoneId: "Africa/Lagos" });
  await ctx.addCookies([{ name: "vallo_first_run", value: "seen", url: BASE }]);
  const page = await ctx.newPage();

  /* 1. the choice */
  await page.goto(`${BASE}/sign-up`, { waitUntil: "load", timeout: 90_000 });
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(2500);
  await shot(page, "su-choice", kind);

  /* 2. the empty form */
  await page.goto(`${BASE}/sign-up/email`, { waitUntil: "load", timeout: 90_000 });
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(2500);
  await shot(page, "su-form", kind);

  /* 3. the name, then the whole form filled */
  await typeInto(page, "#firstName", NAME.first);
  await typeInto(page, "#surname", NAME.surname);
  await page.waitForTimeout(400);
  await shot(page, "su-name", kind);

  await typeInto(page, "#email", EMAIL);
  await typeInto(page, "#password", PASSWORD);
  await page.waitForTimeout(400);
  await shot(page, "su-filled", kind);

  /* 4. the two confirmations. The real input is hidden behind the product's
     own control, so the box is ticked the way a member ticks it: on the words
     beside it. A programmatic check leaves the drawn box empty. */
  for (const name of ["ageConfirmed", "acceptTerms"]) {
    /* the drawn box, at the left of the row: the terms row carries links, so
       clicking its words opens a policy instead of ticking it */
    const box = page.locator(`input[name="${name}"]`).first();
    const row = page.locator(`label:has(input[name="${name}"])`).first();
    const target = (await row.count()) ? row : box;
    await target.click({ position: { x: 12, y: 12 }, force: true }).catch(() => {});
    await page.waitForTimeout(350);
    if (!(await box.isChecked().catch(() => false))) {
      await box.check({ force: true }).catch(() => {});
      await page.waitForTimeout(250);
    }
  }
  const ticked = await page.evaluate(() =>
    [...document.querySelectorAll('input[name="ageConfirmed"], input[name="acceptTerms"]')].filter((i) => i.checked).length);
  if (ticked < 2) console.log(`  warning: ${ticked} of 2 boxes ticked`);
  await page.waitForTimeout(500);
  await shot(page, "su-agreed", kind);

  /* 5. the account, and what the member is told next */
  if (!DRY) {
    await page.click("button[type=submit]:has-text('Create account')");
    await page.waitForLoadState("networkidle", { timeout: 40_000 }).catch(() => {});
    await page.waitForTimeout(5000);
    await shot(page, "su-sent", kind);
    console.log(`  landed on ${await page.evaluate(() => location.pathname)}`);
  }
  await ctx.close();
}

await browser.close();
console.log(DRY ? "rehearsal only: no account made" : "done");
