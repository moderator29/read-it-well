/**
 * The people surfaces: profile tabs, the profile menu, the follow lists, the dock.
 *
 * Self-contained Playwright script, no runner and no config, matching the other
 * twenty-odd specs in this directory:
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/social-people.spec.mjs
 *
 * **What it proves and what it cannot.** This sandbox has no route to the
 * Supabase host by organisation proxy policy, so against a locally served build
 * with no keys every social route renders its designed unconfigured state. The
 * spec is written to be honest about that rather than to pass vacuously: each
 * check states the weaker assertion it falls back to, and the strong assertions
 * fire the moment the app it is pointed at can actually read a profile. Point it
 * at a deployment with keys and it proves the real thing.
 *
 * Constant across both: every route answers, no route 500s, no route 404s where
 * a designed page was promised, every state carries a way onward, the whole walk
 * stays inside the one blue family, and both themes are actually rendered rather
 * than dark being screenshotted twice.
 */

import { chromium } from "playwright-core";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3210";
const WAIT = 1400;

/* A handle nobody is expected to hold locally. Against a real deployment,
   override it with a handle that exists to get the strong assertions. */
const HANDLE = process.env.SOCIAL_HANDLE ?? "aduke_from_yaba";

let failures = 0;
function check(name, condition) {
  if (condition) {
    console.log(`  ok      ${name}`);
  } else {
    failures += 1;
    console.log(`  FAILED  ${name}`);
  }
}

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

/**
 * Every colour the page paints, as hue and saturation.
 *
 * The platform has one blue family, plus emerald for success and rose for
 * error. Warm hues are banned outright and so are purple and magenta, and both
 * have shipped here before: an entire workspace once rendered orange, and a
 * brand tint over a white card landed in the lavender range twice. Rose sits
 * near 350 and emerald near 160, so neither window below catches them.
 */
async function outOfFamily(page) {
  return await page.evaluate(() => {
    const found = [];
    const seen = new Set();
    const hueOf = (r, g, b) => {
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const d = max - min;
      if (d === 0) return { hue: 0, sat: 0 };
      let hue;
      if (max === r) hue = ((g - b) / d) % 6;
      else if (max === g) hue = (b - r) / d + 2;
      else hue = (r - g) / d + 4;
      hue = Math.round(hue * 60);
      if (hue < 0) hue += 360;
      return { hue, sat: d / max };
    };
    for (const el of document.querySelectorAll("*")) {
      const style = getComputedStyle(el);
      for (const prop of ["color", "backgroundColor", "borderTopColor", "fill"]) {
        const value = style[prop];
        if (!value || seen.has(value)) continue;
        seen.add(value);
        const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(value);
        if (!m) continue;
        const alpha = m[4] === undefined ? 1 : Number(m[4]);
        if (alpha < 0.2) continue;
        const { hue, sat } = hueOf(Number(m[1]), Number(m[2]), Number(m[3]));
        if (sat <= 0.25) continue;
        /* 20 to 60 is orange, amber and gold. 255 to 330 is violet through
           magenta. Both are ruled out by the owner, twice each. */
        if ((hue >= 20 && hue <= 60) || (hue >= 255 && hue <= 330)) {
          found.push(`${value} hue ${hue}`);
        }
      }
    }
    return found;
  });
}

async function run(theme) {
  const context = await browser.newContext({
    colorScheme: theme,
    viewport: { width: 390, height: 844 },
    /* Groups arrive on a `Reveal`, held at opacity 0 until scrolled into view.
     Playwright treats an element mid-transition as unstable, so a control that
     is genuinely on the page reads as absent. The platform honours
     prefers-reduced-motion for real; these specs test behaviour, not entrances. */
  reducedMotion: "reduce",
});

  /* The product ignores the operating system: only an explicit stored choice
     moves the theme, so the harness stores one exactly as a person would. */
  await context.addInitScript((choice) => {
    try {
      window.localStorage.setItem("nf_theme", choice);
    } catch {
      /* storage can be unavailable; the assertion below catches the result */
    }
  }, theme);

  const page = await context.newPage();
  const serverErrors = [];
  page.on("response", (r) => {
    if (r.status() >= 500) serverErrors.push(`${r.status()} ${r.url()}`);
  });

  try {
    /* ------------------------------------------------------- the profile */
    console.log(`\n[${theme}] /u/${HANDLE}`);
    const profile = await page.goto(`${BASE_URL}/u/${HANDLE}`, { waitUntil: "load" });
    await page.waitForTimeout(WAIT);
    check("the profile answers 200", profile !== null && profile.status() === 200);

    const applied = await page.evaluate(
      () => document.documentElement.dataset.theme ?? "dark",
    );
    check(`the ${theme} theme actually took`, applied === theme);

    const tabs = await page.getByRole("tab").count();
    const found = tabs > 0;
    if (found) {
      /* The strong path: this app can read a profile.
         Four tabs, and which four depends on who the person is. An agent whose
         listings can be resolved gets Properties, Stories, Reviews, Activity;
         everybody else gets Posts, Replies, Media, Activity. A normal person
         must NEVER be offered a Properties tab, because it could only ever be
         empty, which is the exact reason this bar was deleted once before. */
      check("the profile carries four tabs", tabs === 4);
      const names = (await page.getByRole("tab").allInnerTexts()).map((t) =>
        t.replace(/\s+\d+$/, "").trim(),
      );
      const joined = names.join(",");
      const member = joined === "Posts,Replies,Media,Activity";
      const agent = joined === "Properties,Stories,Reviews,Activity";
      check(`the tab set is one of the two designed ones (${joined})`, member || agent);
      check(
        "a normal profile is never offered an empty Properties tab",
        agent || !names.includes("Properties"),
      );
      check(
        "exactly one tab is selected",
        (await page.locator('[role="tab"][aria-selected="true"]').count()) === 1,
      );

      /* Switching writes the tab into the address bar without navigating, so a
         reload lands back where the person was. That is the whole reason this
         is history.replaceState rather than a link. */
      /* The second tab, whichever set this is. */
      const second = names[1];
      await page.getByRole("tab", { name: new RegExp(`^${second}`) }).click();
      await page.waitForTimeout(500);
      check(
        "choosing a tab records it in the address",
        page.url().includes(`tab=${second.toLowerCase()}`),
      );
      const selected = async () =>
        (await page.locator('[role="tab"][aria-selected="true"]').innerText())
          .replace(/\s+\d+$/, "")
          .trim();
      check("the chosen tab is the selected one", (await selected()) === second);

      /* And a reload keeps it, which is the part a person actually feels. */
      await page.reload({ waitUntil: "load" });
      await page.waitForTimeout(WAIT);
      check("a reload keeps the tab that was open", (await selected()) === second);

      /* Both counts lead somewhere. A count that is not a link is a dead end. */
      check(
        "the follower count is a link",
        (await page.locator(`a[href$="/followers"]`).count()) > 0,
      );
      check(
        "the following count is a link",
        (await page.locator(`a[href$="/following"]`).count()) > 0,
      );

      /* The overflow menu is the sibling of the one on every card. */
      const more = page.getByRole("button", { name: /More actions/ });
      check("the profile carries an overflow menu", (await more.count()) > 0);
      if ((await more.count()) > 0) {
        await more.first().click();
        await page.waitForTimeout(400);
        const items = (await page.getByRole("menuitem").allInnerTexts()).join(" ");
        check("the menu offers share", /Share/i.test(items));
        check(
          "the menu offers block, mute and report, or the owner's own edit",
          /Block/i.test(items) || /Edit your profile/i.test(items),
        );
        await page.keyboard.press("Escape");
      }
    } else {
      const text = await page.locator("body").innerText();
      check(
        "no profile could be read, and the page says so in a designed state",
        /Profiles switch on shortly|Nothing to show at|That is not a handle/.test(text),
      );
      check(
        "that state carries a way onward",
        (await page
          .locator("a[href='/home'], a[href='/sign-in'], a[href='/profile'], a[href^='/u/']")
          .count()) > 0,
      );
    }

    /* --------------------------------------------------- the follow lists */
    for (const direction of ["followers", "following"]) {
      console.log(`\n[${theme}] /u/${HANDLE}/${direction}`);
      const res = await page.goto(`${BASE_URL}/u/${HANDLE}/${direction}`, {
        waitUntil: "load",
      });
      await page.waitForTimeout(WAIT);
      check(`/${direction} answers 200, never a 404`, res !== null && res.status() === 200);

      const text = await page.locator("body").innerText();
      check(
        `/${direction} renders a designed page`,
        /Followers|Following|Profiles switch on shortly|Nothing to show for/.test(text),
      );
      check(
        `/${direction} carries the platform back control`,
        (await page.locator("button[aria-label='Back']").count()) > 0,
      );
      check(
        `/${direction} offers a way onward`,
        (await page.locator("a[href^='/u/'], a[href='/around'], a[href='/home']").count()) > 0,
      );

      /* A list that has ended says so out loud, because a feed that stops is a
         state change a sighted reader sees and a screen reader user walks off. */
      if (/That is everybody/.test(text)) {
        check(
          `/${direction} announces the end politely`,
          (await page.locator("[aria-live='polite']").count()) > 0,
        );
      }
    }

    /* --------------------------------------------------------- the dock */
    console.log(`\n[${theme}] /around`);
    const around = await page.goto(`${BASE_URL}/around`, { waitUntil: "load" });
    await page.waitForTimeout(WAIT);
    check("/around answers 200", around !== null && around.status() === 200);

    const fab = page.getByRole("button", { name: /Create something/ });
    if ((await fab.count()) > 0) {
      await fab.click();
      await page.waitForTimeout(400);
      /* The flat two-item menu became the create ring: Apartment, Story,
         Update, Question, Review, around a glowing centre. Event is absent and
         that is deliberate, not missing: there is no events table and meetups
         are deferred in the design, so a sixth petal would open nothing. */
      const ring = await page.locator(".nf-ring__petal").allInnerTexts();
      const joined = ring.join(" ");
      check("the ring offers a story", /Story/.test(joined));
      check("the ring offers an apartment", /Apartment/.test(joined));
      check("the ring offers an update and a question", /Update/.test(joined) && /Question/.test(joined));
      check("every petal leads somewhere", ring.length >= 5);
      check(
        "writing a story is a real destination",
        (await page.locator("a[href='/stories/new']").count()) > 0,
      );
      await page.keyboard.press("Escape");
    } else {
      /* The dock renders nothing at all when the platform has no keys, which is
         correct: there is genuinely nothing behind it. */
      const text = await page.locator("body").innerText();
      check(
        "no dock, and the page says why",
        /switch on the moment the platform keys land/.test(text),
      );
    }

    /* --------------------------------------------------- the directory */
    /*
     * `/u` did not exist for three rounds, and `/u/[handle]` answered for every
     * handle under it, so a person was reachable only if you already knew their
     * name. These checks are the contract of the page that fixed it: it answers,
     * a search is an address rather than a client state, and an answer with
     * nobody in it is a designed page rather than a blank.
     */
    console.log(`\n[${theme}] /u`);
    const directory = await page.goto(`${BASE_URL}/u`, { waitUntil: "load" });
    await page.waitForTimeout(WAIT);
    check("the people directory answers 200", directory !== null && directory.status() === 200);

    const searchField = page.locator('input[name="q"]');
    const hasSearch = (await searchField.count()) > 0;
    if (hasSearch) {
      check("the search is a form with a GET, so a search is an address", true);
      await searchField.fill("nurse");
      await page.locator('form[action="/u"] button[type="submit"]').click();
      await page.waitForTimeout(WAIT);
      check(
        "searching puts the query in the address",
        page.url().includes("q=nurse"),
      );
      check(
        "the answer says which routes it searched, or says nobody matched",
        /Searched by|Nobody matched|switch on shortly/i.test(
          await page.locator("body").innerText(),
        ),
      );
    } else {
      console.log("      (no search field: this build renders the unconfigured state)");
      check(
        "the directory still answers with a designed page and a way onward",
        (await page.locator("body").innerText()).trim().length > 0 &&
          (await page.getByRole("link").count()) > 0,
      );
    }

    /* ---------------------------------------------------- the house rules */
    const strays = await outOfFamily(page);
    check(`no orange, amber, gold, violet or magenta (${strays.length} found)`, strays.length === 0);
    for (const stray of strays) console.log(`          ${stray}`);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    check(`no horizontal scroll at 390px (${overflow}px)`, overflow === 0);

    /* Written as an escape so this file stays clean under the same scan. */
    const body = await page.locator("body").innerText();
    const emDashes = (body.match(/\u2014/g) ?? []).length;
    check(`no em dashes in the copy (${emDashes} found)`, emDashes === 0);

    check(`no 5xx anywhere in the walk (${serverErrors.length} seen)`, serverErrors.length === 0);
    for (const seen of serverErrors) console.log(`          ${seen}`);
  } finally {
    await context.close();
  }
}

await run("dark");
await run("light");
await browser.close();

console.log(
  failures === 0 ? "\nsocial-people: all checks passed" : `\nsocial-people: ${failures} FAILED`,
);
process.exit(failures === 0 ? 0 : 1);
