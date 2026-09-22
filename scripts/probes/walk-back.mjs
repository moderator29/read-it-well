/*
 * PRESS THE BACK CONTROL, IN A BROWSER, AND SEE WHERE IT ACTUALLY GOES.
 *
 * `lib/nav/route-parents.ts` declares a parent for 143 routes and 25 tests pass
 * on the resolver. Both of those are statements about a table and a pure
 * function. Neither is a statement about a CONTROL: whether one is drawn on the
 * screen at all, whether pressing it navigates, and whether the place it lands
 * is the parent the table declares. That is three separate claims and none of
 * them had been made in a browser.
 *
 * So this opens the route, finds the back control the way a person does (by its
 * accessible name), presses it, and compares where the browser ended up against
 * the declared parent. A route with no control drawn is reported as that, not as
 * a pass: on a route whose declared parent is not ROOT, a missing control is
 * itself the finding.
 *
 * Usage: node scripts/probes/walk-back.mjs --base URL --spec spec.json
 *   spec.json: [{ route, parent }]
 */
import { chromium } from "playwright-core";
import { readFileSync, writeFileSync } from "node:fs";

const arg = (n, d = null) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : d;
};
const BASE = arg("base", "http://127.0.0.1:3971").replace(/\/$/, "");
const SPEC = JSON.parse(readFileSync(arg("spec"), "utf8"));
const OUT = arg("out", null);

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"],
});

const rows = [];
for (const s of SPEC) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: "dark" });
  const row = { route: s.route, declaredParent: s.parent };
  try {
    const res = await page.goto(BASE + s.route, { waitUntil: "networkidle", timeout: 45_000 });
    if ((res?.status() ?? 0) !== 200) throw new Error(`status ${res?.status()}`);
    const landedOpen = new URL(page.url()).pathname.replace(/\/$/, "") || "/";
    if (landedOpen !== (s.route.replace(/\/$/, "") || "/"))
      throw new Error(`opening it landed on ${landedOpen}`);
    if (await page.locator("[data-nf-not-found]").count()) throw new Error("not-found body at 200");
    await page.waitForTimeout(600);

    /*
     * HOW A PERSON FINDS IT, AND THE LOOSE VERSION OF THIS FOUND THE WRONG
     * THING ON `/docs`.
     *
     * `a:has-text("Back")` matches any ancestor anchor whose subtree contains
     * the word, so on the docs index it matched a chapter card and reported
     * that the back control went to `/docs/getting-started`. A control is
     * identified by its OWN accessible name, never by what is inside it.
     */
    const control = page
      .locator('button[aria-label*="ack" i], a[aria-label*="ack" i], [data-nf-back]')
      .or(page.getByRole("button", { name: /^\s*back\b/i }))
      .or(page.getByRole("link", { name: /^\s*back\b/i }))
      .first();
    row.controls = await page
      .locator('button[aria-label*="ack" i], a[aria-label*="ack" i], [data-nf-back]')
      .count();
    if ((await control.count()) === 0) {
      row.verdict = s.parent === "ROOT" ? "no control, and none is declared" : "NO CONTROL DRAWN";
      rows.push(row);
      await page.close();
      console.log(`${row.verdict.padEnd(34)} ${s.route}`);
      continue;
    }
    row.label = (await control.getAttribute("aria-label")) ?? (await control.innerText()).trim().slice(0, 30);
    await control.click({ timeout: 10_000 });
    await page.waitForTimeout(1400);
    row.landed = new URL(page.url()).pathname.replace(/\/$/, "") || "/";
    /*
     * A DECLARED PARENT IS A PATTERN, NOT A PATH. `"/u/[handle]/followers":
     * "/u/[handle]"` resolves `/u/ada/followers` to `/u/ada`, so comparing the
     * landing against the literal string `[handle]` reports three correct
     * controls as wrong. The captured segments are filled in from the route.
     */
    let want = (s.parent ?? "").replace(/\/$/, "") || "/";
    if (want.includes("[")) {
      const pat = (s.pattern ?? s.route).split("/");
      const act = s.route.split("/");
      const caught = {};
      pat.forEach((seg, i) => {
        if (seg.startsWith("[")) caught[seg] = act[i];
      });
      want = want
        .split("/")
        .map((seg) => caught[seg] ?? seg)
        .join("/");
    }
    row.verdict =
      s.parent === "ROOT"
        ? `control drawn on a ROOT route, went to ${row.landed}`
        : row.landed === want
          ? "went to the declared parent"
          : `WENT TO ${row.landed}, NOT ${want}`;
  } catch (e) {
    row.verdict = `could not walk: ${String(e.message).split("\n")[0].slice(0, 90)}`;
  }
  rows.push(row);
  await page.close();
  console.log(`${row.verdict.padEnd(34)} ${s.route}${row.label ? `   [${row.label}]` : ""}`);
}
await browser.close();
if (OUT) writeFileSync(OUT, JSON.stringify(rows, null, 2));
const good = rows.filter((r) => r.verdict === "went to the declared parent").length;
console.log(
  `\n${rows.length} routes. ${good} back controls walked in a browser and landed on the declared parent.`,
);
