/**
 * `@rentme` in a thread, and the answer it writes back.
 *
 * Self-contained node script, no runner and no config, matching the other specs
 * in this directory:
 *
 *   BASE_URL=http://localhost:3231 node apps/web/tests/social-summon.spec.mjs
 *
 * **Why this spec could not exist until now.** `private.bot_may_run` is the
 * ceiling every summon has to pass, and PostgREST exposes `public` only, so
 * until `public.bot_may_run` landed the gate had no endpoint and every summon
 * fell through to a refusal. The database row was proven; the answer had never
 * been on a screen. This spec is the screen half.
 *
 * It has two parts and they run under different conditions.
 *
 * **Part one needs nothing.** `bot-schema.ts` is a client-safe module of pure
 * functions, imported here directly through Node's type stripping so the spec
 * tests what the product ships rather than a copy of its logic written into the
 * test. Three rules live there and all three are load bearing: which bodies
 * summon the assistant, what a call costs in integer kobo (a call priced at zero
 * is a ceiling that does not exist), and that every reason
 * `private.bot_may_run` can return has a sentence to say.
 *
 * **Part two renders the answer.** This sandbox has no route to the Supabase
 * host by organisation proxy policy, so a build with real keys renders every
 * social route in its designed unconfigured state and no thread is ever mounted.
 * Rather than assert nothing, the spec carries its own stand-in for PostgREST:
 * a small read-only server that answers the exact queries `getThread` makes with
 * one fixed conversation in it, a question naming `@rentme`, the assistant's
 * reply with two cited flats, and a person replying underneath. Build the app
 * against it and the strong assertions fire:
 *
 *   node apps/web/tests/social-summon.spec.mjs --serve     # stand-in only
 *   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54329 \
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=standin \
 *   NEXT_DIST_DIR=.next-a2summon npm run build --workspace @naijafinds/web
 *   cd apps/web && NEXT_DIST_DIR=.next-a2summon npx next start -p 3231
 *
 * Against any other build the render section says plainly that it did not run
 * and checks only what a page without data can prove. A green check that cannot
 * fail is worse than no check, so it is never counted as a pass.
 *
 * **One property of this harness, written down so nobody chases it twice.** A
 * Next response that reads anything from this stand-in stays open for about
 * seven seconds after its last byte, once per read path. It is the harness and
 * not the product: `/settings`, which makes no Supabase call when signed out,
 * closes in 25ms against the same server, while `/search`, which has no
 * `loading.tsx` at all, holds for the same seven seconds. So a route with a
 * `loading.tsx` shows its skeleton for those seconds and then resolves, which
 * looks exactly like a page stuck on its own loading state and is not one. The
 * waits in this spec allow for it; `social-people.spec.mjs` does not, and should
 * be pointed at an ordinary build rather than at this one.
 */

import { fileURLToPath } from "node:url";

/* Node 22 needs the flag to import a TypeScript module; 23 and later do not.
   Re-exec once rather than asking whoever runs the specs to remember it. */
if (!process.execArgv.includes("--experimental-strip-types")) {
  const { spawnSync } = await import("node:child_process");
  const result = spawnSync(
    process.execPath,
    [
      "--experimental-strip-types",
      "--no-warnings",
      fileURLToPath(import.meta.url),
      ...process.argv.slice(2),
    ],
    { stdio: "inherit" },
  );
  process.exit(result.status ?? 1);
}

import { createServer } from "node:http";
import { chromium } from "playwright-core";

const { BOT_HANDLE, BOT_COPY, BOT_REFUSALS, costMinorFor, mentionsBot, sourceNote } = await import(
  "../src/lib/social/bot-schema.ts"
);

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3231";
const STANDIN_PORT = Number(process.env.SOCIAL_STANDIN_PORT ?? 54329);
/** Hold every answer back by this many milliseconds, so a `loading.tsx` is
    on screen long enough to be looked at. Zero unless asked for. */
const STANDIN_DELAY_MS = Number(process.env.SOCIAL_STANDIN_DELAY_MS ?? 0);
const WAIT = 1300;

let failures = 0;
function check(name, condition) {
  if (condition) {
    console.log(`  ok      ${name}`);
  } else {
    failures += 1;
    console.log(`  FAILED  ${name}`);
  }
}

/* ------------------------------------------------------------------ part one
 * The module the product ships. No browser, no server, no database.
 * ------------------------------------------------------------------------ */

console.log("\nthe rules, from bot-schema.ts");

check("the assistant's name is rentme", BOT_HANDLE === "rentme");

for (const [label, body, expected] of [
  ["a summon at the start of a post", "@rentme where can I stay for a week?", true],
  ["a summon mid sentence", "does anybody know, @rentme?", true],
  ["case does not matter", "@RentMe help", true],
  ["an email address does not summon anybody", "write to me at ade@rentmenow.com", false],
  ["a doubled at sign is not a summon", "@@rentme", false],
  ["the name inside a longer handle is not a summon", "@rentmehq is somebody else", false],
  ["an ordinary sentence summons nobody", "the light has been on since morning", false],
  ["an empty body is not an error", "", false],
]) {
  check(`${label} (${JSON.stringify(body)})`, mentionsBot(body) === expected);
}

/* The ceilings are sums over `bot_invocations.cost_minor`. A call recorded at
   zero is a ceiling that does not exist, which is the same defect as a feature
   flag nothing reads, and this platform has shipped that once already. */
check("a real call costs more than nothing", costMinorFor(1200, 300) > 0);
check("integer kobo, never a float", Number.isInteger(costMinorFor(1234, 567)));
check("rounded up, so a ceiling is never undercounted", costMinorFor(1, 0) === 1);
check("a refusal costs nothing", costMinorFor(0, 0) === 0);
check("output tokens cost more than input", costMinorFor(0, 1_000_000) > costMinorFor(1_000_000, 0));
check("negative tokens cannot credit the ceiling", costMinorFor(-5_000_000, -5_000_000) === 0);

/* `BOT_REFUSALS` is keyed on the exact strings `private.bot_may_run` returns.
   A reason added to that function has to show up here, and every sentence has
   to be a sentence rather than a code. */
const GATE_REASONS = ["off", "month", "day", "person"];
check(
  "every reason bot_may_run can return has a sentence",
  GATE_REASONS.every((r) => typeof BOT_REFUSALS[r] === "string" && BOT_REFUSALS[r].length > 20),
);
check(
  "no refusal quotes a figure at anybody",
  Object.values(BOT_REFUSALS).every((line) => !/[0-9]|₦|naira|kobo/i.test(line)),
);
/* Written as an escape so this file stays clean under the repository's own
   em dash scan, the same way `docs/HANDOFF.md` writes its. */
const EM_DASH = String.fromCharCode(0x2014);
check(
  "no refusal and no line of the assistant's copy carries an em dash",
  [...Object.values(BOT_REFUSALS), ...Object.values(BOT_COPY)].every(
    (line) => !line.includes(EM_DASH),
  ),
);

/* The citation line under an answer. `SOCIAL_DESIGN` section 10: a factual
   claim carries its source, and the source is counted rather than claimed. */
check("no listing cited says so", /No listings cited/.test(sourceNote(0, "Yaba")));
check("one listing is singular", sourceNote(1, "Yaba") === "Answered from 1 published listing around Yaba.");
check("more than one is plural", /Answered from 3 published listings around Yaba\./.test(sourceNote(3, "Yaba")));
check("no place named is still a sentence", /^Answered from 2 published listings\.$/.test(sourceNote(2, null)));

/* ------------------------------------------------------------------ part two
 * The stand-in for PostgREST, and the thread it holds.
 * ------------------------------------------------------------------------ */

const AREA = "a1000000-0000-4000-8000-000000000001";
const QUESTION = "11110000-0000-4000-8000-000000000001";
const ANSWER = "22220000-0000-4000-8000-000000000002";
const HUMAN = "33330000-0000-4000-8000-000000000003";
const ASKER = "aaaa0000-0000-4000-8000-000000000001";
const OTHER = "bbbb0000-0000-4000-8000-000000000002";
const FLAT_ONE = "cccc0000-0000-4000-8000-000000000001";
const FLAT_TWO = "cccc0000-0000-4000-8000-000000000002";

const ANSWER_BODY =
  "There are two places published around Yaba at the moment, both a short walk from the rail line. Message the agent first and see the flat in person before any money moves.";
const ANSWER_SOURCE = sourceNote(2, "Yaba");
const QUESTION_BODY = `@rentme where can I stay around here for a week, and is @aduke still letting the flat upstairs?`;

const ago = (minutes) => new Date(Date.now() - minutes * 60_000).toISOString();

function post(over) {
  return {
    id: null,
    area_id: AREA,
    root_id: QUESTION,
    parent_id: null,
    depth: 0,
    author_id: null,
    author_kind: "USER",
    kind: "GIST",
    body: "",
    listing_id: null,
    payload: null,
    reply_count: 0,
    like_count: 0,
    repost_count: 0,
    view_count: 0,
    status: "LIVE",
    hold_reason: null,
    created_at: ago(30),
    edited_at: null,
    ...over,
  };
}

const DATA = {
  feature_flags: [{ key: "social", enabled: true }],
  areas: [{ id: AREA, name: "Yaba", slug: "yaba-lagos", city: "Lagos", slow_mode: false, status: "LIVE" }],
  area_members: [],
  post_media: [],
  mutes: [],
  post_reactions: [],
  post_reposts: [],
  social_profiles: [
    {
      user_id: ASKER,
      handle: "aduke_from_yaba",
      display_label: "Aduke",
      avatar_path: null,
      is_agent: false,
    },
    { user_id: OTHER, handle: "tunde_o", display_label: "Tunde", avatar_path: null, is_agent: false },
  ],
  listings: [
    {
      id: FLAT_ONE,
      title: "Two bedroom off Herbert Macaulay",
      area: "Yaba",
      city: "Lagos",
      price_per_night_minor: 4_500_000,
      price_period: "year",
      status: "PUBLISHED",
      listing_photos: [],
    },
    {
      id: FLAT_TWO,
      title: "Self contained near Sabo market",
      area: "Yaba",
      city: "Lagos",
      price_per_night_minor: 2_800_000,
      price_period: "year",
      status: "PUBLISHED",
      listing_photos: [],
    },
  ],
  posts: [
    post({
      id: QUESTION,
      /* A top level post carries a NULL root, not its own id: `private.place_post`
         sets `root_id := null` when `parent_id` is null, and `getThread` reads
         `root.root_id ?? root.id` for exactly that reason. Written as its own id
         first, which put the question in the thread twice, once as the root and
         once as a reply to itself. The product was right and the fixture was
         wrong, so the fixture moved and a check went in below. */
      root_id: null,
      author_id: ASKER,
      kind: "ASK",
      body: QUESTION_BODY,
      reply_count: 2,
      created_at: ago(30),
    }),
    post({
      id: ANSWER,
      parent_id: QUESTION,
      depth: 1,
      author_id: null,
      author_kind: "BOT",
      kind: "REPLY",
      body: ANSWER_BODY,
      payload: { source: ANSWER_SOURCE, listingIds: [FLAT_ONE, FLAT_TWO] },
      like_count: 1,
      repost_count: 1,
      reply_count: 1,
      created_at: ago(28),
    }),
    post({
      id: HUMAN,
      parent_id: ANSWER,
      depth: 2,
      author_id: OTHER,
      kind: "REPLY",
      body: "The one near Sabo is the better road when it rains.",
      created_at: ago(11),
    }),
  ],
};

/**
 * Just enough PostgREST to serve a thread.
 *
 * `eq`, `in`, `order` and `limit`, which is every filter `getThread` and its
 * enrichment use. Everything unknown answers with an empty list, because a read
 * this app makes and this stand-in has not thought about must render as a page
 * missing that thing rather than as a five hundred.
 */
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
      /* A knob rather than a constant, and it is what makes a `loading.tsx`
         observable at all: the skeletons only appear while a read is in flight,
         so proving one means holding the answer back on purpose. Zero by
         default, so the spec itself never waits. */
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

/**
 * Every colour the page paints, as hue and saturation. The same window the
 * other social specs use: 20 to 60 is orange, amber and gold, 255 to 330 is
 * violet through magenta, and the owner has ruled out both twice each. Rose sits
 * near 350 and emerald near 160, so neither is caught.
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
      /* `backgroundImage` is in this list and is not in the other specs', because
         the assistant's card is drawn entirely in gradients and a card painted
         only through `background-image` is invisible to a scan of
         `backgroundColor`. That is exactly where a brand tint has landed in the
         lavender range before. */
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

/**
 * The colour stops the assistant's card is actually FILLED with.
 *
 * The card is `background-image` only, so `backgroundColor` reports transparent
 * and reads as fine in both themes while the paint is fixed to one of them. Any
 * stop opaque enough to be the panel itself has to belong to the theme on
 * screen, or the assistant's answer is a dark slab on a paper page and the body
 * text on it is unreadable.
 *
 * **The fill and the ring have to be told apart**, because this card draws its
 * ring as a border-box gradient in strong brand blue, which is dark by
 * luminance and entirely correct on paper. `background-clip` is a per layer
 * list on the computed style, so the layers are split on top level commas and
 * zipped with it, and only the ones clipped to the padding box are the panel.
 * Reading every stop instead reported the ring as a dark slab and failed a card
 * that was right.
 */
async function panelStops(page, selector) {
  return await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return [];
    const style = getComputedStyle(el);

    /* Commas inside `rgba(...)` and inside a gradient's own argument list are
       not layer separators, so this counts brackets rather than splitting. */
    const layers = [];
    let depth = 0;
    let start = 0;
    const image = style.backgroundImage;
    for (let i = 0; i < image.length; i += 1) {
      const c = image[i];
      if (c === "(") depth += 1;
      else if (c === ")") depth -= 1;
      else if (c === "," && depth === 0) {
        layers.push(image.slice(start, i));
        start = i + 1;
      }
    }
    layers.push(image.slice(start));

    const clips = style.backgroundClip.split(",").map((c) => c.trim());
    const out = [];
    layers.forEach((layer, index) => {
      const clip = clips[index] ?? clips[clips.length - 1] ?? "border-box";
      if (clip === "border-box") return;
      for (const m of layer.matchAll(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/g)) {
        const alpha = m[4] === undefined ? 1 : Number(m[4]);
        const luminance =
          (0.2126 * Number(m[1]) + 0.7152 * Number(m[2]) + 0.0722 * Number(m[3])) / 255;
        out.push({ text: m[0], clip, alpha, luminance });
      }
    });
    return out;
  }, selector);
}

async function run(theme) {
  const context = await browser.newContext({
    colorScheme: theme,
    viewport: { width: 390, height: 844 },
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
    console.log(`\n[${theme}] /post/${QUESTION}`);
    const res = await page.goto(`${BASE_URL}/post/${QUESTION}`, { waitUntil: "load" });
    await page.waitForTimeout(WAIT);
    check("the thread answers 200", res !== null && res.status() === 200);
    check(
      `the ${theme} theme actually took`,
      (await page.evaluate(() => document.documentElement.dataset.theme ?? "dark")) === theme,
    );

    const botCard = page.locator('article[aria-label="Answered by the RentMe assistant"]');
    const mounted = (await botCard.count()) > 0;

    if (mounted) {
      /* ------------------------------------------------ the answer is on screen */
      check("the assistant's answer is one card in the thread", (await botCard.count()) === 1);
      check(
        "it names itself as a machine",
        (await botCard.getByText("RentMe AI", { exact: true }).count()) > 0,
      );
      check("the answer's words are on the screen", (await botCard.innerText()).includes(ANSWER_BODY));
      check("the citation line is under the answer", (await botCard.innerText()).includes(ANSWER_SOURCE));

      /* Every factual claim carries its source, and the source is a row somebody
         can open rather than a name the model wrote. */
      const cited = botCard.locator(".nf-post__cited a");
      check("both cited flats render as rows", (await cited.count()) === 2);
      check(
        "each cited flat links to the listing it cites",
        (await cited.nth(0).getAttribute("href")) === `/listing/${FLAT_ONE}` &&
          (await cited.nth(1).getAttribute("href")) === `/listing/${FLAT_TWO}`,
      );
      check(
        "the cited prices are money, formatted once, in naira",
        /₦45,000/.test(await cited.nth(0).innerText()) && /a year/.test(await cited.nth(0).innerText()),
      );

      /* The whole reason the assistant is a row in `posts` and not a special
         case: to every path on this screen it is somebody's post. */
      check(
        "the answer can be liked",
        (await botCard.getByRole("button", { name: /like/i }).count()) > 0,
      );
      check(
        "the answer can be replied to",
        (await botCard.getByRole("button", { name: /(reply|repl)/i }).count()) > 0,
      );
      check(
        "the answer carries the same overflow menu as anybody's post",
        (await botCard.getByRole("button", { name: /More actions/ }).count()) > 0,
      );
      check(
        "the counters somebody's like and repost moved are rendered",
        /\b1\b/.test(await botCard.innerText()),
      );
      check(
        "the assistant is nobody, so its card links to no profile",
        (await botCard.locator('a[href^="/u/"]').count()) === 0,
      );

      /* A person answered the machine, and the thread says whose words they are
         answering rather than leaving the reply floating. */
      check(
        "a person's reply under it names the assistant as who it answers",
        (await page.getByText("RentMe AI", { exact: true }).count()) >= 2,
      );

      /* ------------------------------------------------------ the summon itself */
      const question = page.locator("article").first();
      /* The root is the top of the thread and not also a reply to itself. It
         reads as a duplicate the moment `root_id` on a top level post is
         anything but null, which is a shape a hand written row can have. */
      check("the question is on the page once", (await page.locator(".nf-post--ask").count()) === 1);
      check("and the thread counts two replies under it", /2 replies/i.test(await page.locator("body").innerText()));
      check(
        "the summon is drawn as a mark in the question",
        (await question.locator(".nf-post__summon").count()) === 1,
      );
      check(
        "and it is not a link, because no account can ever hold that name",
        (await page.locator('a[href="/u/rentme"]').count()) === 0,
      );
      check(
        "an ordinary handle beside it still links to the person",
        (await question.locator('a[href="/u/aduke_from_yaba"]').count()) > 0,
      );

      /* ------------------------------------------------------------ the material */
      /* **This card rendered identically to a person's post in both themes.**
         `.nf-post--ai` and `.nf-card` are both one class in the same cascade
         layer, and social-feed.css is imported near the top of globals.css while
         `.nf-card` is declared 270 lines below it, so `.nf-card` won every
         collision and the whole variant was dead. Nothing said so: both files
         read correctly on their own. Only the computed style on a real thread
         shows it, which is why it is asserted here rather than trusted. */
      const material = await page.evaluate(() => {
        const ai = document.querySelector('article[aria-label="Answered by the RentMe assistant"]');
        const person = document.querySelector('article[aria-label^="Posted by"]');
        const cs = getComputedStyle(ai);
        return {
          same: person !== null && cs.backgroundImage === getComputedStyle(person).backgroundImage,
          radius: cs.borderTopLeftRadius,
          feedRadius: getComputedStyle(document.documentElement)
            .getPropertyValue("--nf-feed-radius")
            .trim(),
        };
      });
      check("the assistant's card does not render as an ordinary post", !material.same);
      check(
        `the feed's own corner survives the cascade (${material.radius} = ${material.feedRadius})`,
        material.radius === material.feedRadius,
      );

      /* ------------------------------------------------------------- the sheet
         This is the only spec in the suite that mounts a real thread, so it is
         the only place a card's action sheet can be opened on a real post. Two
         defects lived behind that `…` and neither was reachable any other way. */
      await botCard.getByRole("button", { name: /More actions/ }).click();
      await page.waitForTimeout(400);
      const botRows = (await page.getByRole("menuitem").allInnerTexts()).join(" | ");

      /* **Repost had no control anywhere in the product.** `toggleRepost`,
         `post_reposts` with its RLS, the counter trigger, `notify_repost`, an
         optimistic patch on both surfaces and an Activity tab that renders
         "reposted this" all existed, and nothing could start any of it. */
      check(`the sheet offers Repost (${botRows.slice(0, 90)})`, /Repost/.test(botRows));
      check(
        "and it says where a repost actually goes, without promising a feed",
        /Activity/.test(botRows) && !/feed/i.test(botRows),
      );

      /* Mute and block act on a person and the assistant is not one: its
         `author_id` is null by design, and both handlers answer a missing author
         with "There is nobody to do that to on this post." */
      check("the assistant cannot be muted, because it is nobody", !/Mute/.test(botRows));
      check("nor blocked", !/Block/.test(botRows));
      check("but its answer can still be reported", /Report/.test(botRows));
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);

      const personCard = page.locator('article[aria-label^="Posted by"]').first();
      await personCard.getByRole("button", { name: /More actions/ }).click();
      await page.waitForTimeout(400);
      const personRows = (await page.getByRole("menuitem").allInnerTexts()).join(" | ");
      check("a person's post still offers mute and block", /Mute/.test(personRows) && /Block/.test(personRows));
      check("and Repost is offered there too", /Repost/.test(personRows));

      /* Signed out, so the row proves it is wired to something rather than
         nothing: every write on this surface sends a visitor to sign in first. */
      await page.getByRole("menuitem", { name: /^Repost/ }).click();
      await page.waitForTimeout(900);
      check("choosing Repost signed out asks for a sign in", page.url().includes("/sign-in"));
      await page.goBack({ waitUntil: "load" });
      await page.waitForTimeout(WAIT);

      const stops = await panelStops(page, 'article[aria-label="Answered by the RentMe assistant"]');
      check("the assistant's card is painted, not blank", stops.length > 0);
      const solid = stops.filter((s) => s.alpha >= 0.35);
      check(
        theme === "light"
          ? "in daylight the assistant's card is not a dark slab"
          : "in the dark the assistant's card stays dark",
        solid.length === 0 ||
          (theme === "light"
            ? solid.every((s) => s.luminance > 0.5)
            : solid.every((s) => s.luminance < 0.5)),
      );
    } else {
      console.log(
        "  ....    the thread did not mount, so the render checks did not run.\n" +
          "          Build against the stand-in to prove the answer on screen:\n" +
          `          NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:${STANDIN_PORT} NEXT_PUBLIC_SUPABASE_ANON_KEY=standin \\\n` +
          "            NEXT_DIST_DIR=.next-a2summon npm run build --workspace @naijafinds/web",
      );
      const text = await page.locator("body").innerText();
      /* The one thing still worth asserting with no data: whatever this page
         is, it is a designed one with a way onward, not a stack trace. */
      check("the page is a designed state, not an error", !/Application error|stack/i.test(text));
      check("and it offers a way onward", (await page.locator("a").count()) > 0);
    }

    const strays = await outOfFamily(page);
    check(`no colour outside the blue family (${strays.slice(0, 3).join(", ") || "none"})`, strays.length === 0);

    const scrolls = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    check("the thread does not push sideways at 390px", !scrolls);
    check(`nothing on this page five hundreds (${serverErrors.slice(0, 2).join(", ") || "none"})`, serverErrors.length === 0);

    return mounted;
  } finally {
    await context.close();
  }
}

const dark = await run("dark");
const light = await run("light");
check("the answer was rendered in both themes or in neither", dark === light);

await browser.close();
standin.close();

console.log(
  failures === 0
    ? `\nsocial-summon: all checks passed${dark ? "" : " (render section did not run)"}`
    : `\nsocial-summon: ${failures} check(s) failed`,
);
process.exit(failures === 0 ? 0 : 1);
