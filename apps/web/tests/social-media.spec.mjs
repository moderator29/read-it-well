/**
 * A picture on a post, from the outside.
 *
 * `public.post_media` shipped with the content core and, until now, nothing in
 * the application ever wrote a row into it. Three surfaces read it, the Media
 * tab told the person whose page it was "Anything you post with a picture lands
 * here", and there was no file control anywhere. This is the render half of
 * closing that: the write path and its two database rules are proven against
 * live Postgres in rolled back transactions, and that proof is in
 * `docs/SOCIAL_AUDIT.md`.
 *
 * Self-contained node script, no runner and no config:
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/social-media.spec.mjs
 *
 * The sandbox has no route to the Supabase host by organisation proxy policy,
 * so the spec carries its own read-only stand-in for PostgREST AND for the
 * storage signing endpoint, and it serves real PNG bytes for every signed URL
 * it hands out. That last part is the point: a picture that is read, signed and
 * decoded by the browser is the only way to know the whole chain works, and an
 * assertion on the presence of an `img` tag would have passed against a broken
 * one. Build the app against it and the strong assertions fire:
 *
 *   node apps/web/tests/social-media.spec.mjs --serve
 *   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54332 \
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=standin \
 *   NEXT_DIST_DIR=.next-a2 npm run build --workspace @naijafinds/web
 *   cd apps/web && NEXT_DIST_DIR=.next-a2 npx next start -p 3233
 *
 * Against any other build the render section says plainly that it did not run
 * and is never counted as a pass.
 *
 * The walker is signed in through the same stand-in session cookie
 * `social-places.spec.mjs` uses, because the composer's file control only
 * exists for somebody who could actually post, and a spec that only ever looks
 * at a signed-out page cannot see it at all.
 */

import { createServer } from "node:http";
import { deflateSync } from "node:zlib";
import { chromium } from "playwright-core";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3210";
const STANDIN_PORT = Number(process.env.SOCIAL_STANDIN_PORT ?? 54332);
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

/* ------------------------------------------------------------------ the rows */

const AREA = "a1000000-0000-4000-8000-000000000001";
const SLUG = "yaba-lagos";
const WALKER = "bbbb0000-0000-4000-8000-000000000009";
const TUNDE = "bbbb0000-0000-4000-8000-000000000002";

const ONE = "10000000-0000-4000-8000-00000000000a";
const THREE = "10000000-0000-4000-8000-00000000000b";
const NONE = "10000000-0000-4000-8000-00000000000c";
/* The walker's own post, taken down, with its picture rows still stored. The
   database deletes those as the status lands; this is the case they were
   written before that, and the admin removal path, which nulls nothing. */
const GONE = "10000000-0000-4000-8000-00000000000d";

const ago = (minutes) => new Date(Date.now() - minutes * 60_000).toISOString();

function post(over) {
  return {
    id: null,
    area_id: AREA,
    root_id: null,
    parent_id: null,
    depth: 0,
    author_id: TUNDE,
    author_kind: "USER",
    kind: "GIST",
    body: "",
    listing_id: null,
    payload: null,
    reply_count: 0,
    like_count: 0,
    repost_count: 0,
    view_count: 3,
    status: "LIVE",
    hold_reason: null,
    created_at: ago(30),
    edited_at: null,
    ...over,
  };
}

/** The path shape the trigger enforces: `<author>/<post>/<file>`. */
const pathFor = (postId, index, author = TUNDE) => `${author}/${postId}/${index}.jpg`;

function media(postId, position, author = TUNDE) {
  return {
    post_id: postId,
    storage_path: pathFor(postId, position, author),
    position,
    width: 1200,
    height: 900,
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
      member_count: 6,
      post_count: 3,
      opened_at: ago(1440),
    },
  ],
  area_members: [{ area_id: AREA, user_id: WALKER, role: "MEMBER" }],
  area_moderator_applications: [],
  stories: [],
  reviews: [],
  mutes: [],
  post_reactions: [],
  post_reposts: [],
  follows: [],
  social_profiles: [
    {
      user_id: TUNDE,
      handle: "tunde_o",
      display_label: "Tunde",
      avatar_path: null,
      is_agent: false,
      bio: null,
      claimed_at: ago(40_000),
    },
    {
      user_id: WALKER,
      handle: "walker",
      display_label: "The walker",
      avatar_path: null,
      is_agent: false,
      bio: null,
      claimed_at: ago(40_000),
    },
  ],
  listings: [],
  posts: [
    post({ id: NONE, body: "Road by the market is finally patched.", created_at: ago(50) }),
    post({ id: ONE, body: "The queue at the filling station on Herbert Macaulay, this morning.", created_at: ago(40) }),
    post({
      id: THREE,
      body: "Three from the walk down to the lagoon before the rain came.",
      created_at: ago(20),
    }),
    /* `posts_select` hands a person their own removed rows back, so this is a
       row the walker really does receive, and the surface it was worst on was
       their own feed. Two replies, so the tombstone's second sentence is true. */
    post({
      id: GONE,
      author_id: WALKER,
      body: null,
      status: "REMOVED",
      reply_count: 2,
      created_at: ago(10),
    }),
  ],
  post_media: [
    media(ONE, 0),
    media(THREE, 0),
    media(THREE, 1),
    media(THREE, 2),
    media(GONE, 0, WALKER),
  ],
};

/* -------------------------------------------------------------- real pixels */

function crcTable() {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
}
const CRC = crcTable();

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

/**
 * A real picture, encoded here rather than committed as a fixture.
 *
 * Deep blue with a lighter band, so the four arrangements are legible in a
 * screenshot and so the out-of-family colour scan has something in the family
 * to look at rather than a grey square.
 */
function png(width, height, shade) {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  let o = 0;
  for (let y = 0; y < height; y += 1) {
    raw[o] = 0;
    o += 1;
    for (let x = 0; x < width; x += 1) {
      const band = y / height;
      raw[o] = Math.round(6 + shade * 10 + band * 18);
      raw[o + 1] = Math.round(18 + shade * 14 + band * 46);
      raw[o + 2] = Math.round(90 + shade * 22 + band * 120);
      o += 3;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

const PICTURES = [png(240, 180, 0), png(240, 180, 1), png(240, 180, 2), png(240, 180, 3)];

/* ------------------------------------------------------------- the stand-in */

function matches(row, key, expr) {
  if (expr.startsWith("eq.")) return String(row[key]) === expr.slice(3);
  if (expr.startsWith("neq.")) return String(row[key]) !== expr.slice(4);
  if (expr.startsWith("not.is.")) {
    const want = expr.slice(7);
    if (want === "null") return row[key] !== null && row[key] !== undefined;
    return String(row[key]) !== want;
  }
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

/** How many times the browser actually asked for a signed object. */
let objectHits = 0;

function serveStandin(port) {
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);
    const send = (status, payload) => {
      const text = JSON.stringify(payload);
      res.writeHead(status, {
        "content-type": "application/json; charset=utf-8",
        "content-length": Buffer.byteLength(text),
      });
      res.end(text);
    };

    /* ------------------------------------------------------------- storage */

    /* Signing a page of pictures. `createSignedUrls` posts the paths and gets
       a path-relative URL back per item, which the client turns into an
       absolute one against this same host. */
    if (url.pathname === "/storage/v1/object/sign/social-media") {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        let paths = [];
        try {
          paths = JSON.parse(body || "{}").paths ?? [];
        } catch {
          paths = [];
        }
        /* Only an object a `post_media` row names is signable, which is what
           the storage policy decides on the real thing. */
        const known = new Set(DATA.post_media.map((row) => row.storage_path));
        return send(
          200,
          paths.map((path) => ({
            error: known.has(path) ? null : "not found",
            path,
            signedURL: known.has(path)
              ? `/object/sign/social-media/${path}?token=standin`
              : null,
          })),
        );
      });
      return;
    }

    /* The bytes themselves. */
    if (url.pathname.startsWith("/storage/v1/object/sign/social-media/")) {
      const name = url.pathname.slice("/storage/v1/object/sign/social-media/".length);
      const index = Number(name.split("/").pop()?.split(".")[0] ?? 0);
      const picture = PICTURES[index % PICTURES.length];
      objectHits += 1;
      res.writeHead(200, {
        "content-type": "image/png",
        "content-length": picture.length,
        "cache-control": "no-store",
      });
      res.end(picture);
      return;
    }

    /* ---------------------------------------------------------------- auth */

    if (url.pathname === "/auth/v1/user") {
      const auth = req.headers.authorization ?? "";
      if (!auth.startsWith("Bearer ") || auth.endsWith("standin")) {
        return send(401, { message: "no session" });
      }
      return send(200, {
        id: WALKER,
        aud: "authenticated",
        role: "authenticated",
        email: "walker@example.test",
        app_metadata: {},
        user_metadata: {},
        created_at: "2026-01-01T00:00:00Z",
      });
    }
    if (url.pathname.startsWith("/auth/v1/")) return send(401, { message: "no session" });

    /* ---------------------------------------------------------------- rest */

    if (url.pathname.startsWith("/rest/v1/rpc/")) return send(200, null);
    if (!url.pathname.startsWith("/rest/v1/")) return send(404, { message: "not here" });

    const table = url.pathname.slice("/rest/v1/".length);
    let rows = [...(DATA[table] ?? [])];

    for (const [key, value] of url.searchParams) {
      if (["select", "order", "limit", "offset", "columns"].includes(key)) continue;
      rows = rows.filter((row) => matches(row, key, value));
    }

    /* The embedded read the profile's picture grid uses. `post_media!inner`
       makes the join do the filtering, so a post with no picture never comes
       back at all, and the stand-in has to behave the same way or the grid
       would look right here and be wrong in production. */
    const select = url.searchParams.get("select") ?? "";
    if (table === "posts" && select.includes("post_media")) {
      rows = rows.map((row) => ({
        ...row,
        post_media: DATA.post_media.filter((item) => item.post_id === row.id),
      }));
      if (select.includes("post_media!inner")) {
        rows = rows.filter((row) => row.post_media.length > 0);
      }
    }

    const order = url.searchParams.get("order");
    if (order) {
      const [column, direction] = order.split(".");
      rows.sort((a, b) => {
        const l = a[column] ?? "";
        const r = b[column] ?? "";
        if (typeof l === "number" && typeof r === "number") {
          return direction === "desc" ? r - l : l - r;
        }
        return direction === "desc"
          ? String(r).localeCompare(String(l))
          : String(l).localeCompare(String(r));
      });
    }
    const limit = Number(url.searchParams.get("limit") ?? 0);
    if (limit > 0) rows = rows.slice(0, limit);

    const accept = req.headers.accept ?? "";
    if (accept.includes("vnd.pgrst.object")) {
      if (rows.length === 0) return send(200, null);
      return send(200, rows[0]);
    }
    send(200, rows);
  });
  return new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve(server)));
}

const standin = await serveStandin(STANDIN_PORT);

if (process.argv.includes("--serve")) {
  console.log(`\nstand-in listening on http://127.0.0.1:${STANDIN_PORT}. Ctrl-C to stop.`);
  await new Promise(() => {});
}

/* ---------------------------------------------------------------- the paths */

console.log("\nthe shape the database enforces");
check(
  "every path is <author>/<post>/<file>",
  DATA.post_media.every((row) => {
    const parts = row.storage_path.split("/");
    const author = DATA.posts.find((p) => p.id === row.post_id)?.author_id;
    return parts.length === 3 && parts[0] === author && parts[1] === row.post_id;
  }),
);
check(
  "position is unique per post and never above three",
  DATA.post_media.every((row) => row.position >= 0 && row.position <= 3) &&
    new Set(DATA.post_media.map((row) => `${row.post_id}:${row.position}`)).size ===
      DATA.post_media.length,
);

/* ---------------------------------------------------------------- the screen */

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const host = new URL(BASE_URL).hostname;

function authCookie() {
  const session = {
    access_token: "standin-access-token",
    refresh_token: "standin-refresh-token",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: WALKER, aud: "authenticated", role: "authenticated", email: "walker@example.test" },
  };
  const value = `base64-${Buffer.from(JSON.stringify(session), "utf8").toString("base64url")}`;
  return { name: "sb-127-auth-token", value, domain: host, path: "/" };
}

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

/** Whether every picture on the page decoded, rather than merely rendered. */
async function decoded(page, selector) {
  return await page.evaluate((sel) => {
    const images = [...document.querySelectorAll(sel)];
    return {
      count: images.length,
      loaded: images.filter((img) => img.complete && img.naturalWidth > 0).length,
      alts: images.map((img) => img.alt),
    };
  }, selector);
}

async function run(theme) {
  const context = await browser.newContext({
    colorScheme: theme,
    viewport: { width: 390, height: 844 },
  });
  await context.addCookies([authCookie()]);
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

    const cards = page.locator("article.nf-post");
    const mounted = (await cards.count()) > 0;

    if (mounted) {
      /* ------------------------------------------------- the pictures render */
      const one = page.locator("article", { hasText: "the filling station" });
      const three = page.locator("article", { hasText: "down to the lagoon" });
      const plain = page.locator("article", { hasText: "market is finally patched" });

      check("the post with one picture wears the one-up layout",
        (await one.locator(".nf-post__media--1").count()) === 1);
      check("and carries exactly one picture",
        (await one.locator(".nf-post__media img").count()) === 1);
      check("the post with three wears the three-up layout",
        (await three.locator(".nf-post__media--3").count()) === 1);
      check("and carries exactly three",
        (await three.locator(".nf-post__media img").count()) === 3);
      check("a post with no picture has no picture block at all",
        (await plain.locator(".nf-post__media").count()) === 0);

      /* The whole chain: the row was read, the URL was signed, the browser
         fetched it and decoded it. An `img` on the page proves none of that. */
      const pictures = await decoded(page, ".nf-post__media img");
      /* Five rows are stored and four are drawn: the fifth belongs to a post
         that was taken down, and a tombstone carries nothing. */
      check(`every picture on the feed decoded, and only the live ones drew (${pictures.loaded} of ${pictures.count})`,
        pictures.count === 4 && pictures.loaded === 4);
      check("a screen reader is told which picture it is on a post with several",
        pictures.alts.includes("Picture 2 of 3 on this post"));
      check("and told plainly when there is only one",
        pictures.alts.includes("The picture on this post"));

      /* -------------------------------------------- what a tombstone carries */
      const body = await page.locator("body").innerText();
      check("a post that was taken down says so", body.includes("This post was removed."));
      check("and says the replies under it survived, because they did",
        body.includes("The replies under it are still here."));
      check("a tombstone is not an empty card with the pictures still on it",
        (await page.locator("article", { hasText: "This post was removed." }).count()) === 0);

      /* --------------------------------------------------- the file control */
      const add = page.getByRole("button", { name: "Add a picture" });
      check("the composer offers a picture, which is what the Media tab promises",
        (await add.count()) >= 1);
      const composer = page.locator("form.nf-post").first();
      check("the composer is the one a member sees, not the join notice",
        (await composer.locator("textarea").count()) === 1);
      check("the file input accepts only pictures a canvas can re-encode",
        (await composer.locator('input[type="file"][accept="image/jpeg,image/png,image/webp"]').count()) === 1);
      check("and it takes more than one",
        (await composer.locator('input[type="file"][multiple]').count()) === 1);

      /* ---------------------------------------------------------- the thread */
      console.log(`[${theme}] /post/<the post with three>`);
      await page.goto(`${BASE_URL}/post/${THREE}`, { waitUntil: "load" });
      await page.waitForTimeout(WAIT);
      const thread = await decoded(page, ".nf-post__media img");
      check(`the thread page shows them too (${thread.loaded} of ${thread.count})`,
        thread.count === 3 && thread.loaded === 3);

      /* --------------------------------------------------------- the profile */
      console.log(`[${theme}] /u/tunde_o?tab=media`);
      await page.goto(`${BASE_URL}/u/tunde_o?tab=media`, { waitUntil: "load" });
      await page.waitForTimeout(WAIT);
      const grid = await decoded(page, ".nf-media-grid img");
      check(`the Media tab is no longer the only surface that believes in them (${grid.loaded} of ${grid.count})`,
        grid.count === 4 && grid.loaded === 4);
      check("every tile is a way into the post it came from",
        (await page.locator('.nf-media-grid a[href^="/post/"]').count()) === 4);

      await page.goto(`${BASE_URL}/around/${SLUG}`, { waitUntil: "load" });
      await page.waitForTimeout(WAIT);
    } else {
      console.log(
        "  ....    the place did not mount, so the render checks did not run.\n" +
          "          Build against the stand-in to prove the pictures on screen:\n" +
          `          NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:${STANDIN_PORT} NEXT_PUBLIC_SUPABASE_ANON_KEY=standin \\\n` +
          "            NEXT_DIST_DIR=.next-a2 npm run build --workspace @naijafinds/web",
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
    check("a card carrying pictures does not push sideways at 390px", !scrolls);
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
check("the pictures were rendered in both themes or in neither", dark === light);
if (dark) {
  check(`the browser really fetched the objects (${objectHits} requests)`, objectHits >= 8);
}

await browser.close();
standin.close();

console.log(
  failures === 0
    ? `\nsocial-media: all checks passed${dark ? "" : " (render section did not run)"}`
    : `\nsocial-media: ${failures} check(s) failed`,
);
process.exit(failures === 0 ? 0 : 1);
