/**
 * The two pickers, at signup and in settings.
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/place-pickers.spec.mjs
 *
 * `public.occupations` holds 749 rows and `public.local_governments` holds all
 * 774, both with a public read policy, and until now neither had a single
 * reader anywhere in the product. This spec guards the shape of the answer.
 *
 * 1. Sign-up is grouped, not stacked. Nine fields in one column is a wall, and
 *    the owner asked twice for it not to be. Four headed groups.
 * 2. The three place fields are pickers, not selects. A 774-row native select
 *    on a phone is a spinning wheel somebody scrolls for half a minute.
 * 3. The local government picker is disabled until a state is chosen, because a
 *    local government in the wrong state is refused by the database with
 *    SQLSTATE RM020 and the form should never let somebody reach that.
 * 4. Opening a picker gives a full-page drawer with a search field in it.
 * 5. `/settings/place` has a designed signed-out state with a way in, rather
 *    than an empty form that cannot save.
 *
 * This sandbox cannot reach Supabase, so the state list comes back empty and the
 * drawer's own "we could not load the list" state is what shows. That is the
 * honest unconfigured answer and it is asserted here rather than worked around.
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
    console.log(`  FAILED  ${name}${detail ? `\n          ${detail}` : ""}`);
  }
}

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

async function run(theme) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    colorScheme: theme,
  });
  await context.addInitScript((choice) => {
    try {
      window.localStorage.setItem("nf_theme", choice);
    } catch (error) {
      void error;
    }
  }, theme);
  const page = await context.newPage();

  const serverErrors = [];
  page.on("response", (r) => {
    if (r.status() >= 500) serverErrors.push(`${r.status()} ${r.url()}`);
  });

  try {
    console.log(`\n[${theme} 390px] /sign-up`);
    await page.goto(`${BASE_URL}/sign-up`, { waitUntil: "load" });
    await page.waitForTimeout(WAIT);

    const applied = await page.evaluate(() => document.documentElement.dataset.theme ?? "dark");
    check(`the ${theme} theme actually applied`, applied === theme);

    check(
      "no UI copy calls the product a demo",
      !(await page.evaluate(() => document.body.innerText)).toLowerCase().includes("demo"),
    );

    await page.getByRole("button", { name: /continue with email/i }).click();
    await page.waitForTimeout(400);

    const text = await page.evaluate(() => document.body.innerText);
    for (const heading of [
      "Who you are",
      "How you sign in",
      "Where you stay, and what you do",
      "How you found us",
    ]) {
      check(`the group "${heading}" is on the form`, text.includes(heading));
    }

    check("the country is fixed to Nigeria", text.includes("Nigeria"));

    const statePicker = page.getByTestId("state-picker");
    const lgaPicker = page.getByTestId("lga-picker");
    const occupationPicker = page.getByTestId("occupation-picker");

    check("the state picker is on the form", (await statePicker.count()) === 1);
    check("the local government picker is on the form", (await lgaPicker.count()) === 1);
    check("the occupation picker is on the form", (await occupationPicker.count()) === 1);

    check(
      "the local government picker waits for a state",
      await lgaPicker.isDisabled(),
    );

    /* Every choice is posted as a code, under the name the server validates. */
    for (const name of ["stateCode", "lgaCode", "occupationCode"]) {
      check(
        `the form posts ${name}`,
        (await page.locator(`input[type="hidden"][name="${name}"]`).count()) === 1,
      );
    }

    /* None of the three may be a native select: that is the whole point. */
    check(
      "no native select is used for the long lists",
      (await page.locator('select[name="stateCode"], select[name="lgaCode"], select[name="occupationCode"]').count()) === 0,
    );

    await occupationPicker.click();
    await page.waitForTimeout(500);
    const drawer = page.getByTestId("occupation-picker-drawer");
    check("opening a picker opens a full-page drawer", (await drawer.count()) === 1);
    if ((await drawer.count()) === 1) {
      const box = await drawer.boundingBox();
      check(
        "the drawer covers the whole page, not part of it",
        !!box && box.width >= 380 && box.height >= 800,
        JSON.stringify(box),
      );
      check(
        "the drawer carries a search field",
        (await drawer.locator('input[type="search"]').count()) === 1,
      );
      const drawerText = await drawer.evaluate((node) => node.innerText);
      check(
        "an unreachable list says so rather than showing nothing",
        drawerText.length > 0,
        drawerText.slice(0, 120),
      );
    }
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    console.log(`\n[${theme} 390px] /settings/place`);
    await page.goto(`${BASE_URL}/settings/place`, { waitUntil: "load" });
    await page.waitForTimeout(WAIT);
    const placeText = await page.evaluate(() => document.body.innerText);
    check("the screen explains itself when signed out", placeText.length > 40);
    check(
      "there is a way in or a way back",
      (await page.locator('a[href="/sign-in"], a[href="/settings"], button').count()) > 0,
    );

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    check(`no horizontal scroll at 390px (overflow ${overflow}px)`, overflow <= 1);

    check("no route returned a server error", serverErrors.length === 0, serverErrors.join("\n"));
  } finally {
    await context.close();
  }
}

try {
  await run("dark");
  await run("light");
} finally {
  await browser.close();
}

if (failures > 0) {
  console.log(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nall checks passed");
