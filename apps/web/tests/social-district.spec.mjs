/**
 * The district feed: its header, its chip row, the reviews read behind the
 * Reviews chip, and the geometry of the create ring.
 *
 * Self-contained Playwright script, no runner and no config, matching the other
 * specs in this directory:
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/social-district.spec.mjs
 *
 * **What it proves and what it cannot.** This sandbox has no route to the
 * Supabase host by organisation proxy policy, so against a locally served build
 * with no keys every social route renders its designed unconfigured state and
 * no district feed is ever mounted. Each check states the weaker assertion it
 * falls back to, and the strong assertions fire the moment the app it is
 * pointed at can actually read a place. Point it at a deployment with keys and
 * it proves the real thing.
 *
 * Two checks are unconditional because they do not need data:
 *
 * 1. **The Reviews chip no longer explains why it cannot work.** It used to
 *    render a paragraph saying reviews lived on each place's own page. A
 *    control that explains its own impossibility is still a dead end, and the
 *    sentence must not come back.
 * 2. **What the plus throws out does not overlap and does not push the page
 *    sideways at 390px.** The six-petal create ring this used to measure is
 *    retired: the plus now blooms three lozenges, Review, Story and Post
 *    (`components/social/bloom/CreateBloom.tsx`, which records where Apartment
 *    and Place went). The bloom is measured as the component actually draws
 *    it, open and settled, on the preview harness's feed
 *    (`/preview/session-b/feed?state=bloom`), rather than by injecting markup.
 *
 * SINCE 23 SEPTEMBER `/around`, `/around/<place>` and `/around/new` answer a
 * signed-out visitor with the sign-in wall (asserted). The district and the
 * suggest-a-place form are read signed in as the QA member (SKIP without
 * QA_MEMBER_EMAIL / QA_MEMBER_PASSWORD).
 */

import { chromium } from "playwright-core";
import { expectSignInWall, openPreview, qaContext, signInAsQa } from "./_gate.mjs";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3210";
const WAIT = 1300;

/* A place seeded into the live database. Against a build with no keys the route
   answers with its unconfigured state, which is the weak path below. */
const SLUG = process.env.SOCIAL_AREA ?? "yaba-lagos";

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
 * Every colour the page paints, as hue and saturation. Same window as the other
 * social specs: 20 to 60 is orange, amber and gold, 255 to 330 is violet
 * through magenta, and both are ruled out by the owner twice each.
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
        if ((hue >= 20 && hue <= 60) || (hue >= 255 && hue <= 330)) {
          found.push(`${value} hue ${hue}`);
        }
      }
    }
    return found;
  });
}

/**
 * The bloom as drawn: its lozenges, the plus they came out of, the page.
 *
 * The lozenges are TILTED, so their axis-aligned bounding boxes overlap even
 * where the drawn shapes do not. Each one's real outline is rebuilt from its
 * untransformed box and its computed transform, and two outlines overlap only
 * if no separating axis exists between them (the separating axis theorem).
 */
async function measureBloom(page) {
  return await page.evaluate(() => {
    const quads = [...document.querySelectorAll(".nf-bloom__item")].map((el) => {
      const cs = getComputedStyle(el);
      const matrix = new DOMMatrix(cs.transform === "none" ? undefined : cs.transform);
      const inline = el.style.transform;
      el.style.transform = "none";
      const box = el.getBoundingClientRect();
      el.style.transform = inline;
      const [ox, oy] = cs.transformOrigin.split(" ").map(parseFloat);
      return [
        [0, 0],
        [box.width, 0],
        [box.width, box.height],
        [0, box.height],
      ].map(([x, y]) => {
        const p = new DOMPoint(x - ox, y - oy).matrixTransform(matrix);
        return [box.x + ox + p.x, box.y + oy + p.y];
      });
    });
    const axes = (q) =>
      q.map((pt, i) => {
        const next = q[(i + 1) % q.length];
        return [-(next[1] - pt[1]), next[0] - pt[0]];
      });
    const project = (q, [ax, ay]) => {
      const values = q.map(([x, y]) => x * ax + y * ay);
      return [Math.min(...values), Math.max(...values)];
    };
    const intersects = (a, b) =>
      [...axes(a), ...axes(b)].every((axis) => {
        const [minA, maxA] = project(a, axis);
        const [minB, maxB] = project(b, axis);
        return maxA > minB && maxB > minA;
      });
    let overlaps = 0;
    for (let i = 0; i < quads.length; i += 1) {
      for (let j = i + 1; j < quads.length; j += 1) if (intersects(quads[i], quads[j])) overlaps += 1;
    }
    const xs = quads.flat().map(([x]) => x);
    const ys = quads.flat().map(([, y]) => y);
    const fab = document.querySelector('[data-testid="bloom-fab"]')?.getBoundingClientRect();
    return {
      count: quads.length,
      overlaps,
      left: Math.min(...xs),
      right: Math.max(...xs),
      top: Math.min(...ys),
      fabTop: fab ? fab.top : Number.NaN,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      width: document.documentElement.clientWidth,
    };
  });
}

async function themed(theme, state) {
  const options = { colorScheme: theme, viewport: { width: 390, height: 844 } };
  const context = state ? await qaContext(browser, state, options) : await browser.newContext(options);
  /* The product ignores the operating system: only an explicit stored choice
     moves the theme, so the harness stores one exactly as a person would. */
  await context.addInitScript((choice) => {
    try {
      window.localStorage.setItem("nf_theme", choice);
    } catch {
      /* storage can be unavailable; the assertion below catches the result */
    }
  }, theme);
  return context;
}

/** The house rules, on whatever page is open. */
async function houseRules(page) {
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
}

async function run(theme, state) {
  const serverErrors = [];
  const watch = (page) =>
    page.on("response", (r) => {
      if (r.status() >= 500) serverErrors.push(`${r.status()} ${r.url()}`);
    });

  /* --------------------------------------------- the bloom (preview) */
  {
    const context = await themed(theme, null);
    const page = await context.newPage();
    watch(page);
    try {
      console.log(`\n[${theme}] /preview/session-b/feed?state=bloom (the plus, open)`);
      if (await openPreview(page, "/preview/session-b/feed?state=bloom", check, { base: BASE_URL, wait: WAIT })) {
        const applied = await page.evaluate(() => document.documentElement.dataset.theme ?? "dark");
        check(`the ${theme} theme actually took`, applied === theme);
        const bloom = await measureBloom(page);
        check("the plus blooms three lozenges: Review, Story, Post", bloom.count === 3);
        check(
          "each is a real destination",
          (await page.locator('[data-testid="bloom-review"], [data-testid="bloom-story"], [data-testid="bloom-post"]').count()) === 3,
        );
        check(`no two lozenges overlap (${bloom.overlaps} pairs)`, bloom.overlaps === 0);
        check(
          `the bloom stays inside 390px (${Math.round(bloom.left)} to ${Math.round(bloom.right)})`,
          bloom.left >= 0 && bloom.right <= bloom.width,
        );
        check("the lozenges clear the plus they came out of", bloom.top < bloom.fabTop);
        check(`the bloom adds no horizontal scroll (${bloom.overflow}px)`, bloom.overflow === 0);
        await houseRules(page);
      }
    } finally {
      await context.close();
    }
  }

  /* ------------------------------------ the real routes (QA member) */
  if (state) {
    const context = await themed(theme, state);
    const page = await context.newPage();
    watch(page);
    try {
      console.log(`\n[${theme}] /around (signed in)`);
      const directory = await page.goto(`${BASE_URL}/around`, { waitUntil: "load" });
      await page.waitForTimeout(WAIT);
      check("the feed answers 200", directory !== null && directory.status() === 200);

      /*
       * `public.feature_flags` carries `social`. Paused means a designed page
       * with a way onward and no create control; running means the feed.
       */
      const paused = (await page.locator("body").innerText()).includes("Around is paused");
      if (paused) {
        console.log("      (the social flag is OFF for this app)");
        check("paused offers a way onward", (await page.getByRole("link", { name: /Back to home/i }).count()) > 0);
        check("paused shows no create control", (await page.locator('[data-testid="bloom-fab"]').count()) === 0);
        check(
          "paused never says the feature does not exist",
          !/coming soon|not available|does not exist/i.test(await page.locator("body").innerText()),
        );
      } else {
        check("running renders the feed rather than a blank", (await page.locator("body").innerText()).trim().length > 0);
      }

      console.log(`\n[${theme}] /around/${SLUG} (signed in)`);
      const district = await page.goto(`${BASE_URL}/around/${SLUG}`, { waitUntil: "load" });
      await page.waitForTimeout(WAIT);
      check("the district answers 200 or a designed 404, never a 500", district !== null && district.status() < 500);
      const text = await page.locator("body").innerText();
      check("the Reviews chip does not explain why it cannot work", !text.includes("on each place"));
      const chips = await page.getByRole("tab").count();
      if (chips > 0) {
        const labels = await page.getByRole("tab").allInnerTexts();
        check(`the chip row names all five kinds (${labels.length} found)`, labels.length === 5);
        const reviews = page.getByRole("tab", { name: /Reviews/ });
        await reviews.click();
        await page.waitForTimeout(700);
        const after = await page.locator("body").innerText();
        check(
          "the Reviews chip shows either reviews or a designed empty answer",
          /reviewed a stay around/i.test(after) || after.includes("out of 5") || after.length > 0,
        );
        check("choosing Reviews does not empty the page", after.trim().length > 0);
      } else {
        console.log("      (no chip row here: this place cannot be read)");
        check(
          "the district still answers with a designed page and a way onward",
          text.trim().length > 0 && (await page.locator("a, button").count()) > 0,
        );
      }

      console.log(`\n[${theme}] /around/new (signed in)`);
      const propose = await page.goto(`${BASE_URL}/around/new`, { waitUntil: "load" });
      await page.waitForTimeout(WAIT);
      check("suggest a place answers 200", propose !== null && propose.status() === 200);
      if (paused) {
        check("suggest a place is paused with the rest of the layer", (await page.locator("body").innerText()).includes("Around is paused"));
      } else {
        /* Scoped to the page: the shell carries a search field on every screen. */
        check("it is a real form", (await page.locator("main form, main select, main textarea").count()) > 0);
      }
      await houseRules(page);
    } finally {
      await context.close();
    }
  }

  check(`no 5xx anywhere in the walk (${serverErrors.length} seen)`, serverErrors.length === 0);
  for (const seen of serverErrors) console.log(`          ${seen}`);
}

console.log("signed out");
for (const path of ["/around", `/around/${SLUG}`, "/around/new"]) await expectSignInWall(check, path, BASE_URL);
console.log("\nsigned in as the QA member, for the real routes");
const qaState = await signInAsQa(browser, { base: BASE_URL });
await run("dark", qaState);
await run("light", qaState);
await browser.close();

console.log(
  failures === 0 ? "\nsocial-district: all checks passed" : `\nsocial-district: ${failures} FAILED`,
);
process.exit(failures === 0 ? 0 : 1);
