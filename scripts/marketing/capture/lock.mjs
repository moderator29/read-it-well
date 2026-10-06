/*
 * The passcode lock, as a member meets it before money moves.
 *
 *   QA_MEMBER_EMAIL=... QA_MEMBER_PASSWORD=... node scripts/marketing/capture/lock.mjs
 *
 * The app unlocks by itself for five minutes after a sign-in (docs/PASSCODE.md),
 * so this signs in, waits out the five minutes, then opens a money screen in a
 * tab without the "unlocked" mark: the lock comes up as it does for a member
 * coming back. Nothing is typed into the keypad. The lock keeps one (dark)
 * theme whatever the member chose, so it writes lock and d-lock only, to
 * docs/marketing/source.
 */
import sharp from "sharp";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileSync, readFileSync } from "node:fs";
import { BASE, VIEWPORTS, launch, signInWithin, isLocked } from "./session.mjs";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "../../../docs/marketing/source");
const WAIT_MS = 5.5 * 60 * 1000;

const browser = await launch();
const contexts = {};
for (const kind of ["mobile", "desktop"]) {
  const ctx = await browser.newContext({ ...VIEWPORTS[kind], reducedMotion: "reduce", locale: "en-NG", timezoneId: "Africa/Lagos" });
  await ctx.addCookies([{ name: "vallo_first_run", value: "seen", url: BASE }]);
  await signInWithin(ctx, { fresh: true });
  await ctx.clearCookies({ name: "vallo_unlock" });
  contexts[kind] = ctx;
}
console.log(`signed in; waiting ${WAIT_MS / 60000} minutes for the fresh unlock to lapse`);
await new Promise((resolve) => setTimeout(resolve, WAIT_MS));

const report = JSON.parse(readFileSync(join(OUT, "capture-report.json"), "utf8"));
for (const [kind, ctx] of Object.entries(contexts)) {
  for (const theme of ["dark"]) {
    const id = `${kind === "desktop" ? "d-" : ""}lock${theme === "light" ? "-lt" : ""}`;
    await ctx.addCookies([{ name: "nf_theme", value: theme, url: BASE }]);
    const page = await ctx.newPage();
    await page.addInitScript((t) => { try { localStorage.setItem("nf_theme", t); } catch {} }, theme);
    try {
      await page.goto(`${BASE}/payments`, { waitUntil: "load", timeout: 90_000 });
      for (let i = 0; i < 30 && !(await isLocked(page)); i += 1) await page.waitForTimeout(1000);
      if (!(await isLocked(page))) throw new Error("the lock did not come up");
      await page.waitForTimeout(1800);
      const webp = await sharp(await page.screenshot({ type: "png" })).webp({ quality: 95, effort: 6 }).toBuffer();
      if (webp.length < 50_000) throw new Error("blank page");
      writeFileSync(join(OUT, `${id}.webp`), webp);
      report[id] = { url: "/payments (locked)", at: new Date().toISOString(), kind, theme, signedIn: true };
      console.log(`ok    ${id}`);
    } catch (error) {
      report[id] = { failed: String(error.message ?? error).split("\n")[0], at: new Date().toISOString() };
      console.log(`FAIL  ${id}: ${String(error.message ?? error).split("\n")[0]}`);
    }
    await page.close().catch(() => {});
  }
}
writeFileSync(join(OUT, "capture-report.json"), JSON.stringify(Object.fromEntries(Object.entries(report).sort()), null, 2) + "\n");
await browser.close();
