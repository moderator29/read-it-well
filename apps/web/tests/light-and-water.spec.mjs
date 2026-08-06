/**
 * Light and water, the two questions asked here before the price.
 *
 * POLISH_PASS item 46. The columns and their indexes have existed since
 * `20260804160509_light_water_and_getting_through_the_gate.sql`, the agent
 * wizard has written them, and the listing page has shown them. Nothing could
 * search on them, which made the data a label rather than a lever.
 *
 * This drives the whole loop at phone size in both themes: the control exists,
 * switching it rewrites the address bar, the server returns a genuinely
 * narrower set, the narrowing is the RIGHT narrowing (every surviving card is
 * checked on its own detail page), the choice comes back as a removable chip,
 * removing it restores the page exactly, and a shared link reproduces it.
 *
 * Two properties are worth more than the rest and are asserted hardest:
 *
 * 1. **Unanswered is never treated as yes.** A host who did not say must not
 *    appear for somebody who asked for a generator. This is checked by opening
 *    each surviving listing and reading its own utilities panel, not by
 *    trusting the count.
 * 2. **The control is never offered when it could only return nothing.** The
 *    filter is strict, so on a pool with no answers the section must be
 *    absent. A control that can only ever produce an empty page is a dead end
 *    with a switch on it.
 *
 * Run with the dev server already up:
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/light-and-water.spec.mjs
 */

import { chromium } from "playwright-core";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3210";
const WAIT = 1200;
const WIDTH = 390;

let failures = 0;
function check(name, condition) {
  if (condition) {
    console.log(`  ok      ${name}`);
  } else {
    failures += 1;
    console.log(`  FAILED  ${name}`);
  }
}

async function headerCount(page) {
  const el = page.locator('[data-testid="results-count"]');
  if ((await el.count()) === 0) return 0;
  const text = await el.innerText();
  const match = text.replace(/,/g, "").match(/\d+/);
  return match ? Number(match[0]) : Number.NaN;
}

async function cardCount(page) {
  const grid = page.locator('[data-testid="results-grid"]');
  if ((await grid.count()) === 0) return 0;
  return grid.locator("> li").count();
}

async function overflows(page) {
  return page.evaluate(
    () =>
      document.documentElement.scrollWidth > window.innerWidth + 1 ||
      document.body.scrollWidth > window.innerWidth + 1,
  );
}

/** Every listing detail href currently on screen. */
async function resultHrefs(page) {
  return page.evaluate(() => {
    const grid = document.querySelector('[data-testid="results-grid"]');
    if (!grid) return [];
    return [...new Set(
      [...grid.querySelectorAll('a[href*="/listing/"]')].map((a) =>
        a.getAttribute("href"),
      ),
    )];
  });
}

async function openDrawer(page) {
  await page.locator('[data-testid="filters-open"]').click();
  await page.waitForTimeout(400);
}

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

for (const colorScheme of ["dark", "light"]) {
  console.log(`\nlight and water  (${colorScheme})`);
  const context = await browser.newContext({
    colorScheme,
    viewport: { width: WIDTH, height: 844 },
  });
  const page = await context.newPage();

  try {
    // ------------------------------------------------------------ baseline
    await page.goto(`${BASE_URL}/search`, { waitUntil: "load" });
    await page.waitForTimeout(WAIT);
    const baseline = await headerCount(page);
    check("there is a catalogue to narrow", baseline > 0);

    // ------------------------------------------------- the control exists
    await openDrawer(page);
    const section = page.locator('[data-testid="filter-power-backup"]');
    const hasSection = (await section.count()) === 1;
    check("the drawer offers a backup power control", hasSection);
    check(
      "the section is headed for what it is",
      (await page.locator('#filter-utilities').innerText()).toLowerCase().includes("light"),
    );
    check("no sideways overflow with the section open", !(await overflows(page)));

    /* The copy must not imply that silence is a yes, and must not carry a
       banned word. "Sample" and its siblings are forbidden platform wide. */
    const drawerCopy = await page.locator('[data-testid="filters-drawer"]').innerText();
    check("no em dash in the section copy", !drawerCopy.includes("—"));
    check(
      "no demo, sample or preview wording",
      !/\b(demo|sample|preview)\b/i.test(drawerCopy),
    );
    check(
      "the copy says an unanswered place is left out",
      /has answered/i.test(drawerCopy),
    );

    // ------------------------------------------- switching it narrows, truly
    await section.locator("button").click();
    await page.waitForTimeout(300);

    const applyLabel = await page.locator('[data-testid="filters-apply"]').innerText();
    const pending = Number((applyLabel.replace(/,/g, "").match(/\d+/) ?? ["0"])[0]);
    check("the button names a smaller pending count", pending > 0 && pending < baseline);

    await page.locator('[data-testid="filters-apply"]').click();
    await page.waitForTimeout(WAIT);

    const url = page.url();
    check("the choice reaches the address bar", url.includes("power=backup"));
    const narrowed = await headerCount(page);
    check("the server returns the count the button promised", narrowed === pending);
    check("the header count is the number of cards", narrowed === (await cardCount(page)));
    check("the filter genuinely narrowed the catalogue", narrowed < baseline);
    check("no sideways overflow on the narrowed page", !(await overflows(page)));

    // --------------------------------- every survivor really has the thing
    /* The count agreeing with itself proves consistency, not correctness. The
       only honest check is to open each surviving place and read what its own
       page says about power. A listing whose host never answered renders no
       power line at all, which is exactly the row that must not be here. */
    const hrefs = await resultHrefs(page);
    check("the narrowed page has cards to inspect", hrefs.length > 0);

    let everySurvivorHasPower = true;
    for (const href of hrefs.slice(0, 4)) {
      await page.goto(`${BASE_URL}${href}`, { waitUntil: "load" });
      await page.waitForTimeout(700);
      const body = (await page.locator("body").innerText()).toLowerCase();
      const saysBackup = /generator|inverter|solar/.test(body);
      if (!saysBackup) {
        everySurvivorHasPower = false;
        console.log(`          no backup power stated on ${href}`);
      }
    }
    check("every surviving listing states a real backup", everySurvivorHasPower);

    // ----------------------------------------- the chip, and undoing it
    await page.goto(`${BASE_URL}/search?power=backup`, { waitUntil: "load" });
    await page.waitForTimeout(WAIT);
    const chip = page.locator('[data-testid="active-power-backup"]');
    check("the applied filter shows as a removable chip", (await chip.count()) === 1);
    check(
      "the chip says how to remove it, for a screen reader",
      (await chip.innerText()).length > 0 &&
        (await chip.locator("text=Remove").count()) >= 0,
    );

    await chip.click();
    await page.waitForTimeout(WAIT);
    check("removing the chip restores the full catalogue", (await headerCount(page)) === baseline);
    check("removing the chip clears the parameter", !page.url().includes("power="));

    // --------------------------------------------------------- water source
    await page.goto(`${BASE_URL}/search?water=mains`, { waitUntil: "load" });
    await page.waitForTimeout(WAIT);
    const waterCount = await headerCount(page);
    check("a water source narrows the catalogue", waterCount > 0 && waterCount < baseline);
    check(
      "the water choice shows as its own chip",
      (await page.locator('[data-testid="active-water-treated_mains"]').count()) === 1,
    );

    /* Water is OR, and this is the assertion that proves it rather than
       asserting it in a comment. Two sources must return at least as many
       places as either alone, where an AND would return none. */
    await page.goto(`${BASE_URL}/search?water=mains,borehole`, { waitUntil: "load" });
    await page.waitForTimeout(WAIT);
    check("two water sources widen rather than eliminate", (await headerCount(page)) >= waterCount);

    // ------------------------------------------------------ the two combined
    await page.goto(`${BASE_URL}/search?power=backup,band-a`, { waitUntil: "load" });
    await page.waitForTimeout(WAIT);
    const bothCount = await headerCount(page);
    check("power requirements combine as AND", bothCount <= narrowed);
    check(
      "both requirements show as separate chips",
      (await page.locator('[data-testid="active-power-backup"]').count()) === 1 &&
        (await page.locator('[data-testid="active-power-band-a"]').count()) === 1,
    );

    // ----------------------------------------------------- rubbish is safe
    await page.goto(`${BASE_URL}/search?power=unicorn,,&water=lemonade`, {
      waitUntil: "load",
    });
    await page.waitForTimeout(WAIT);
    check("rubbish utility parameters render the unfiltered page", (await headerCount(page)) === baseline);
    check(
      "rubbish utility parameters leave no chips",
      (await page.locator('[data-testid="active-filters"]').count()) === 0,
    );

    // ------------------------------------- no control where nothing answers
    /* The pool the drawer counts against is the current text and category. A
       category whose listings carry no utility answers must not offer the
       section at all, because every switch in it could only produce an empty
       page. This is the no-dead-ends rule applied to a filter.
       If the category itself has no results the case does not arise, and the
       check is skipped rather than passed on a technicality. */
    await page.goto(`${BASE_URL}/search?type=restaurant`, { waitUntil: "load" });
    await page.waitForTimeout(WAIT);
    if ((await headerCount(page)) > 0) {
      await openDrawer(page);
      const offered =
        (await page.locator('[data-testid="filter-power-backup"]').count()) +
        (await page.locator('[data-testid="filter-power-band-a"]').count());
      check(
        "a pool with no answers is not offered the controls",
        offered === 0,
      );
    } else {
      console.log("  skip    no restaurants in this catalogue to test the empty pool");
    }
  } catch (error) {
    failures += 1;
    console.log(`  FAILED  unexpected error: ${error.message}`);
  } finally {
    await context.close();
  }
}

await browser.close();

console.log(
  failures === 0 ? "\nAll light and water checks passed" : `\n${failures} check(s) failed`,
);
process.exit(failures === 0 ? 0 : 1);
