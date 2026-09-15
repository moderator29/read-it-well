/**
 * The platform's own entries, on a screen.
 *
 * `docs/SOCIAL_DESIGN.md` section 3 is the answer to the cold start: a place is
 * never an empty room, because the platform is a participant and posts what it
 * already knows. Seven entries were specified. Two shipped with
 * `private.open_place_entries`, and this round added the two that had both a
 * source table and a source moment:
 *
 *   a verified agent is here   `private.announce_agent_in_place`, called from
 *                              the listing publish trigger, once per agent per
 *                              place for ever
 *   a stay finished here       `private.announce_completed_stays`, a daily
 *                              pg_cron sweep, at most one entry per place per
 *                              seven days
 *
 * The database half is proven against the live database in rolled back
 * transactions, and that proof is in `docs/SOCIAL_AUDIT.md`. This is the other
 * half: the entries are ordinary rows in `public.posts` with no special casing
 * anywhere, so the only way to know they RENDER is to render them.
 *
 * Self-contained node script, no runner and no config:
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/social-system.spec.mjs
 *
 * The sandbox has no route to the Supabase host by organisation proxy policy,
 * so the spec carries its own read-only stand-in for PostgREST holding one
 * place and the five entries in it. Build the app against it and the strong
 * assertions fire:
 *
 *   node apps/web/tests/social-system.spec.mjs --serve
 *   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54331 \
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=standin \
 *   NEXT_DIST_DIR=.next-a2system npm run build --workspace @naijafinds/web
 *   cd apps/web && NEXT_DIST_DIR=.next-a2system npx next start -p 3232
 *
 * Against any other build the render section says plainly that it did not run
 * and is never counted as a pass. A green check that cannot fail is worse than
 * no check, which this suite has already shipped once.
 *
 * The seven second hold described in `social-summon.spec.mjs` section on the
 * harness applies here too: a Next response that reads from the stand-in stays
 * open for about seven seconds after its last byte. The waits allow for it.
 */

import { createServer } from "node:http";
import { chromium } from "playwright-core";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3210";
const STANDIN_PORT = Number(process.env.SOCIAL_STANDIN_PORT ?? 54331);
const STANDIN_DELAY_MS = Number(process.env.SOCIAL_STANDIN_DELAY_MS ?? 0);
const WAIT = 1600;

let failures = 0;
function check(name, condition) {
  if (condition) {
    console.log(`  ok      ${name}`);
  } else {
    failures += 1;
    console.log(`  FAILED  ${name}`);
  }
}

/* ---------------------------------------------------------------- the place */

const AREA = "a1000000-0000-4000-8000-000000000001";
const SLUG = "yaba-lagos";
const AGENT_USER = "aaaa0000-0000-4000-8000-000000000001";
const NEIGHBOUR = "bbbb0000-0000-4000-8000-000000000002";
const FLAT = "cccc0000-0000-4000-8000-000000000001";
const AGENT_ID = "dddd0000-0000-4000-8000-000000000001";

/* The exact sentences the two new writers produce. Copied from the migration
   rather than paraphrased, so a wording change in the database that nobody
   carried into the product fails here rather than reading oddly in production. */
const AGENT_BODY =
  "Adaeze Homes (@adaeze_homes) is listing around Yaba. Vallo checked who they are " +
  "before the first one went up. Message them here, arrange the inspection, and pay " +
  "after you have stood inside the place.";
const STAY_BODY =
  "2 guests finished stays around Yaba in the last week. No names, no addresses, " +
  "no prices: only that they came, stayed and went home.";
const LISTING_BODY = "A new apartment is now open in Yaba.";
const OPENING_BODY =
  "Yaba is open, in Lagos. The useful thing to say here is the thing you would tell " +
  "a friend moving in: what the road is like when it rains, which streets have light, " +
  "and what a one bedroom really costs.";
const SAFETY_BODY =
  "Never send money for a place you have not stood inside. Message the agent, arrange " +
  "the inspection, see it, and pay after that. Vallo takes no fee at any point.";

const ago = (minutes) => new Date(Date.now() - minutes * 60_000).toISOString();

function post(over) {
  return {
    id: null,
    area_id: AREA,
    root_id: null,
    parent_id: null,
    depth: 0,
    author_id: null,
    author_kind: "SYSTEM",
    kind: "SYSTEM",
    body: "",
    listing_id: null,
    payload: null,
    reply_count: 0,
    like_count: 0,
    repost_count: 0,
    view_count: 0,
    status: "LIVE",
    hold_reason: null,
    created_at: ago(600),
    edited_at: null,
    ...over,
  };
}

const DATA = {
  feature_flags: [{ key: "social", enabled: true }],
  areas: [
    {
      id: AREA,
      slug: SLUG,
      kind: "AREA",
      name: "Yaba",
      state_code: "LA",
      city: "Lagos",
      area: "Yaba",
      blurb: null,
      status: "ACTIVE",
      slow_mode: false,
      lga_code: null,
      within_lga_code: null,
      member_count: 4,
      post_count: 6,
      opened_at: ago(1440),
    },
  ],
  area_members: [],
  area_moderator_applications: [],
  stories: [],
  reviews: [],
  post_media: [],
  mutes: [],
  post_reactions: [],
  post_reposts: [],
  social_profiles: [
    {
      user_id: AGENT_USER,
      handle: "adaeze_homes",
      display_label: "Adaeze Homes",
      avatar_path: null,
      is_agent: true,
    },
    {
      user_id: NEIGHBOUR,
      handle: "tunde_o",
      display_label: "Tunde",
      avatar_path: null,
      is_agent: false,
    },
  ],
  listings: [
    {
      id: FLAT,
      title: "Two bedroom off Herbert Macaulay",
      area: "Yaba",
      city: "Lagos",
      price_per_night_minor: 4_500_000,
      price_period: "year",
      status: "PUBLISHED",
      listing_photos: [],
    },
  ],
  posts: [
    post({ id: "10000000-0000-4000-8000-000000000001", body: SAFETY_BODY, created_at: ago(1441) }),
    post({ id: "10000000-0000-4000-8000-000000000002", body: OPENING_BODY, created_at: ago(1440) }),
    post({
      id: "10000000-0000-4000-8000-000000000003",
      body: AGENT_BODY,
      payload: { reason: "agent_verified", agent_id: AGENT_ID },
      created_at: ago(121),
    }),
    post({
      id: "10000000-0000-4000-8000-000000000004",
      body: LISTING_BODY,
      listing_id: FLAT,
      payload: { reason: "listing_published", agent_id: AGENT_ID },
      created_at: ago(120),
    }),
    post({
      id: "10000000-0000-4000-8000-000000000005",
      body: STAY_BODY,
      payload: { reason: "stay_completed", stays: 2 },
      created_at: ago(40),
    }),
    /* One person, so the platform's own cards have something to be compared
       against. A SYSTEM card that renders identically to a person's post is the
       defect this file exists to catch, and it has happened once already. */
    post({
      id: "10000000-0000-4000-8000-000000000006",
      author_id: NEIGHBOUR,
      author_kind: "USER",
      kind: "GIST",
      body: "Road by the market is finally patched.",
      created_at: ago(20),
    }),
  ],
};

function matches(row, key, expr) {
  if (expr.startsWith("eq.")) return String(row[key]) === expr.slice(3);
  if (expr.startsWith("neq.")) return String(row[key]) !== expr.slice(4);
  if (expr.startsWith("is.")) {
    const want = expr.slice(3);
    if (want === "null") return row[key] === null || row[key] === undefined;
    return String(row[key]) === want;
  }
  if (expr.startsWith("in.")) {
    const list = expr
      .slice(3)
      .replace(/^\(|\)$/g, "")
      .split(",")
      .map((v) => v.trim().replace(/^"|"$/g, ""));
    return list.includes(String(row[key]));
  }
  return true;
}

function serveStandin(port) {
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);
    const send = (status, payload) => {
      const text = JSON.stringify(payload);
      const write = () => {
        res.writeHead(status, {
          "content-type": "application/json; charset=utf-8",
          "content-length": Buffer.byteLength(text),
        });
        res.end(text);
      };
      if (STANDIN_DELAY_MS > 0) setTimeout(write, STANDIN_DELAY_MS);
      else write();
    };

    if (url.pathname.startsWith("/auth/v1/")) return send(401, { message: "no session" });
    if (url.pathname.startsWith("/rest/v1/rpc/")) return send(200, null);
    if (!url.pathname.startsWith("/rest/v1/")) return send(404, { message: "not here" });

    const table = url.pathname.slice("/rest/v1/".length);
    let rows = [...(DATA[table] ?? [])];

    for (const [key, value] of url.searchParams) {
      if (["select", "order", "limit", "offset", "columns"].includes(key)) continue;
      rows = rows.filter((row) => matches(row, key, value));
    }

    const order = url.searchParams.get("order");
    if (order) {
      const [column, direction] = order.split(".");
      rows.sort((a, b) => {
        const l = String(a[column] ?? "");
        const r = String(b[column] ?? "");
        return direction === "desc" ? r.localeCompare(l) : l.localeCompare(r);
      });
    }
    const limit = Number(url.searchParams.get("limit") ?? 0);
    if (limit > 0) rows = rows.slice(0, limit);

    send(200, rows);
  });
  return new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve(server)));
}

const standin = await serveStandin(STANDIN_PORT);

if (process.argv.includes("--serve")) {
  console.log(`\nstand-in listening on http://127.0.0.1:${STANDIN_PORT}. Ctrl-C to stop.`);
  await new Promise(() => {});
}

/* ---------------------------------------------------------------- the screen */

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

/** The same out-of-family scan the other social specs use. */
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
      for (const prop of ["color", "backgroundColor", "borderTopColor", "fill", "backgroundImage"]) {
        const value = style[prop];
        if (!value || value === "none" || seen.has(value)) continue;
        seen.add(value);
        for (const m of value.matchAll(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/g)) {
          const alpha = m[4] === undefined ? 1 : Number(m[4]);
          if (alpha < 0.2) continue;
          const { hue, sat } = hueOf(Number(m[1]), Number(m[2]), Number(m[3]));
          if (sat <= 0.25) continue;
          if ((hue >= 20 && hue <= 60) || (hue >= 255 && hue <= 330)) {
            found.push(`${prop} ${m[0]} hue ${hue}`);
          }
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
  });
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
    console.log(`\n[${theme}] /around/${SLUG}`);
    const res = await page.goto(`${BASE_URL}/around/${SLUG}`, { waitUntil: "load" });
    await page.waitForTimeout(WAIT);
    check("the place answers 200", res !== null && res.status() === 200);
    check(
      `the ${theme} theme actually took`,
      (await page.evaluate(() => document.documentElement.dataset.theme ?? "dark")) === theme,
    );

    const platform = page.locator('article[aria-label="Posted by Vallo"]');
    const mounted = (await platform.count()) > 0;

    if (mounted) {
      check("all five of the platform's entries are on the page", (await platform.count()) === 5);

      const all = (await platform.allInnerTexts()).join("\n");
      check("the place still opens with its own two entries", all.includes(OPENING_BODY));
      check("and with the one about money, which never expires", all.includes(SAFETY_BODY));

      /* ------------------------------------------------- a verified agent is here */
      const agentCard = platform.filter({ hasText: "is listing around Yaba" });
      check("the agent entry is one card", (await agentCard.count()) === 1);
      check("its words are on the screen", (await agentCard.innerText()).includes(AGENT_BODY));
      check(
        "the agent's handle is a link to their page, because PostBody links every handle",
        (await agentCard.locator('a[href="/u/adaeze_homes"]').count()) === 1,
      );
      check(
        "it does not claim a fee, because the platform charges none",
        !/\bfee\b/i.test(await agentCard.innerText()),
      );

      /* --------------------------------------------------- a stay finished here */
      const stayCard = platform.filter({ hasText: "finished stays around Yaba" });
      check("the stay entry is one card", (await stayCard.count()) === 1);
      check("its words are on the screen", (await stayCard.innerText()).includes(STAY_BODY));
      /* The whole privacy argument for this entry, asserted rather than trusted:
         it aggregates, it names nobody, and it prices nothing. */
      check(
        "it names nobody: no handle, no link to a person",
        (await stayCard.locator('a[href^="/u/"]').count()) === 0,
      );
      check(
        "and it quotes no money at all",
        !/₦/.test(await stayCard.innerText()),
      );

      /* ------------------------------------------------------ a listing went live */
      const listingCard = platform.filter({ hasText: LISTING_BODY });
      check("the listing entry is one card", (await listingCard.count()) === 1);
      check(
        "it carries the flat itself, not just a sentence about it",
        (await listingCard.locator(`a[href="/listing/${FLAT}"]`).count()) > 0,
      );
      check(
        "the price is money, formatted once, in naira, for the right period",
        /₦45,000/.test(await listingCard.innerText()) &&
          /a year/.test(await listingCard.innerText()),
      );

      /* ------------------------------------------------------------- the material
         `.nf-card.nf-post--system` and `.nf-card` are one class each in the same
         cascade layer, and social-feed.css is imported near the top of
         globals.css while `.nf-card` is declared some 270 lines below it. Source
         order decided every collision until the selectors were made specific,
         and the whole SYSTEM variant rendered as an ordinary post. Nothing said
         so: both files read correctly on their own. */
      const material = await page.evaluate(() => {
        const system = document.querySelector('article[aria-label="Posted by Vallo"]');
        const person = document.querySelector('article[aria-label^="Posted by @"], article[aria-label="Posted by Tunde"]');
        if (!system) return null;
        const cs = getComputedStyle(system);
        return {
          same: person !== null && cs.backgroundImage === getComputedStyle(person).backgroundImage,
          foundPerson: person !== null,
          radius: cs.borderTopLeftRadius,
          feedRadius: getComputedStyle(document.documentElement)
            .getPropertyValue("--nf-feed-radius")
            .trim(),
        };
      });
      check("a person's post is on the page to compare against", material?.foundPerson === true);
      check("the platform's card does not render as an ordinary post", material?.same === false);
      check(
        `the feed's own corner survives the cascade (${material?.radius} = ${material?.feedRadius})`,
        material?.radius === material?.feedRadius,
      );

      /* -------------------------------------------------------------- the sheet
         A SYSTEM entry has a null author by design, so mute and block have
         nobody to act on and both handlers answer "There is nobody to do that to
         on this post." Report stays, because the platform's own words are
         exactly the kind of thing somebody should be able to report. */
      await stayCard.getByRole("button", { name: /More actions/ }).click();
      await page.waitForTimeout(400);
      const rows = (await page.getByRole("menuitem").allInnerTexts()).join(" | ");
      check(`the platform's entry cannot be muted (${rows.slice(0, 80)})`, !/Mute/.test(rows));
      check("nor blocked", !/Block/.test(rows));
      check("but it can be reported", /Report/.test(rows));
      check("and it can be reposted like anything else here", /Repost/.test(rows));
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
    } else {
      console.log(
        "  ....    the place did not mount, so the render checks did not run.\n" +
          "          Build against the stand-in to prove the entries on screen:\n" +
          `          NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:${STANDIN_PORT} NEXT_PUBLIC_SUPABASE_ANON_KEY=standin \\\n` +
          "            NEXT_DIST_DIR=.next-a2system npm run build --workspace @naijafinds/web",
      );
      const text = await page.locator("body").innerText();
      check("the page is a designed state, not an error", !/Application error|stack/i.test(text));
      check("and it offers a way onward", (await page.locator("a").count()) > 0);
    }

    const strays = await outOfFamily(page);
    check(`no colour outside the blue family (${strays.slice(0, 3).join(", ") || "none"})`, strays.length === 0);

    const scrolls = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    check("the place does not push sideways at 390px", !scrolls);
    check(
      `nothing on this page five hundreds (${serverErrors.slice(0, 2).join(", ") || "none"})`,
      serverErrors.length === 0,
    );

    return mounted;
  } finally {
    await context.close();
  }
}

const dark = await run("dark");
const light = await run("light");
check("the entries were rendered in both themes or in neither", dark === light);

await browser.close();
standin.close();

console.log(
  failures === 0
    ? `\nsocial-system: all checks passed${dark ? "" : " (render section did not run)"}`
    : `\nsocial-system: ${failures} check(s) failed`,
);
process.exit(failures === 0 ? 0 : 1);
