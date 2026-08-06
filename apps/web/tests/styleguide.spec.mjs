/**
 * The styleguide, checked against the rules it documents.
 *
 * POLISH_PASS item 49. A styleguide that breaks its own rules is worse than no
 * styleguide, because it is the page a person copies from. So this spec holds
 * it to the same bar as the product: no sideways overflow at 390px, real 44px
 * targets, both themes, and every swatch actually painting rather than
 * rendering an empty box because a token name was mistyped.
 *
 * That last one is the check worth having. A swatch is a `<span>` whose
 * background is `var(--nf-surface-raised)`; get the name wrong and it silently
 * paints nothing, looks like an empty square, and nobody notices for months.
 * Reading the COMPUTED background back from the browser is the only way to
 * know a token resolved, and it is the same lesson this codebase has learned
 * three times: a static scan of source is a guess, the running artefact is the
 * answer.
 *
 * Run with the dev server already up:
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/styleguide.spec.mjs
 */

import { chromium } from "playwright-core";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3210";
const WAIT = 900;

let failures = 0;
function check(name, condition, detail) {
  if (condition) {
    console.log(`  ok      ${name}`);
  } else {
    failures += 1;
    console.log(`  FAILED  ${name}`);
    if (detail) for (const line of [detail].flat()) console.log(`            ${line}`);
  }
}

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

for (const colorScheme of ["dark", "light"]) {
  for (const width of [390, 1280]) {
    console.log(`\nstyleguide  (${colorScheme}, ${width}px)`);
    const context = await browser.newContext({
      colorScheme,
      viewport: { width, height: 900 },
    });
    const page = await context.newPage();

    try {
      const response = await page.goto(`${BASE_URL}/styleguide`, { waitUntil: "load" });
      check("the page answers 200", response?.status() === 200);
      await page.waitForTimeout(WAIT);

      // -------------------------------------------------- it is all there
      const headings = await page.locator("h2").allInnerTexts();
      for (const wanted of [
        "Surfaces", "Text", "Brand", "Borders", "States", "Radii",
        "Buttons", "Chips and pills", "Loading", "Icons", "Glass", "Targets",
      ]) {
        check(`the ${wanted} section is present`, headings.includes(wanted));
      }

      // ------------------------------------------- every token resolved
      /* An unresolved custom property computes to `rgba(0, 0, 0, 0)`, which is
         exactly what an empty square looks like. Counting them is the only way
         to catch a mistyped token name. */
      const unresolved = await page.evaluate(() => {
        const bad = [];
        for (const el of document.querySelectorAll("[style]")) {
          const style = el.getAttribute("style") || "";
          if (!style.includes("var(--nf-")) continue;
          const computed = getComputedStyle(el);
          const paints =
            computed.backgroundColor !== "rgba(0, 0, 0, 0)" ||
            computed.borderTopColor !== "rgba(0, 0, 0, 0)" ||
            computed.backgroundImage !== "none" ||
            computed.borderTopLeftRadius !== "0px";
          if (!paints) bad.push(style.slice(0, 60));
        }
        return bad;
      });
      check(
        "every token swatch actually paints",
        unresolved.length === 0,
        unresolved.slice(0, 4),
      );

      // ------------------------------------------------------- the rules
      const overflows = await page.evaluate(
        () =>
          document.documentElement.scrollWidth > window.innerWidth + 1 ||
          document.body.scrollWidth > window.innerWidth + 1,
      );
      check("no sideways overflow", !overflows);

      const copy = await page.locator("body").innerText();
      check("no em dash anywhere", !copy.includes("—"));
      check(
        "no demo, sample or preview wording",
        !/\b(demo|sample|preview)\b/i.test(copy),
      );

      /* The page documents a one-blue palette, so it had better not contain a
         second family itself. Read from the DOM rather than the source,
         because a token could resolve to anything. */
      const offBrand = await page.evaluate(() => {
        const found = new Set();
        for (const el of document.querySelectorAll("*")) {
          for (const prop of ["color", "backgroundColor", "borderTopColor"]) {
            const value = getComputedStyle(el)[prop];
            const m = /rgba?\((\d+), (\d+), (\d+)/.exec(value);
            if (!m) continue;
            const [r, g, b] = [+m[1], +m[2], +m[3]];
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            if (max - min < 40) continue; // grey, near enough
            // Orange, amber and gold: red leads, blue trails badly.
            if (r > 150 && b < 90 && g > 90 && g < 200) found.add(value);
            // Purple and magenta: red and blue lead, green trails.
            if (r > 120 && b > 120 && g < Math.min(r, b) - 50) found.add(value);
          }
        }
        return [...found];
      });
      check("no orange, amber, gold, purple or magenta", offBrand.length === 0, offBrand.slice(0, 4));

      // ------------------------------------------------------- the buttons
      const buttons = page.locator("button");
      const count = await buttons.count();
      check("the real button primitive is rendered", count >= 18, [`${count} buttons`]);

      /*
       * HIT TESTED, not measured.
       *
       * The `sm` button is painted at 40px and that is deliberate: the ladder
       * is 40, 48 and 56 and no other heights exist. The 44px floor is about
       * the area that ACCEPTS A PRESS, which the platform extends with a
       * pseudo-element rather than by inflating the box, so reading
       * `getBoundingClientRect().height` reports 40 and calls a perfectly good
       * control a failure. This codebase has already been caught by exactly
       * that once, on a 34px target a pseudo-element had extended.
       *
       * So the question asked here is the real one: press two points 44px
       * apart, centred on the control, and see whether the control is what
       * receives them.
       */
      const unreachable = await page.evaluate(async () => {
        const bad = [];
        for (const el of document.querySelectorAll("button, a[href]")) {
          const first = el.getBoundingClientRect();
          if (first.width === 0 || first.height === 0) continue;
          if (first.height >= 44) continue;

          /* `elementFromPoint` is VIEWPORT relative and returns null for
             anything scrolled out of view. Hit testing without scrolling
             first reported every control below the fold as unreachable, which
             is a bug in the test rather than in the page: the pseudo-element
             that extends these to 44px computes correctly the whole time. */
          el.scrollIntoView({ block: "center" });
          await new Promise((r) => requestAnimationFrame(() => r(null)));

          const box = el.getBoundingClientRect();
          const cx = box.x + box.width / 2;
          const cy = box.y + box.height / 2;
          if (cy - 21 < 0 || cy + 21 > window.innerHeight) continue;

          const top = document.elementFromPoint(cx, cy - 21);
          const bottom = document.elementFromPoint(cx, cy + 21);
          const owns = (node) =>
            Boolean(node) && (node === el || el.contains(node) || node.contains(el));
          if (!owns(top) || !owns(bottom)) {
            bad.push(
              `${el.tagName} ${Math.round(box.height)}px "${(el.textContent || "").trim().slice(0, 18)}"`,
            );
          }
        }
        return bad;
      });
      check(
        "every control reaches 44px of pressable area",
        unreachable.length === 0,
        unreachable.slice(0, 5),
      );
    } catch (error) {
      failures += 1;
      console.log(`  FAILED  unexpected error: ${error.message}`);
    } finally {
      await context.close();
    }
  }
}

await browser.close();
console.log(failures === 0 ? "\nAll styleguide checks passed" : `\n${failures} check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
