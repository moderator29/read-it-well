/**
 * The faces: self-hosted, preloaded, and able to draw Nigeria.
 *
 * The proof behind item 34 of docs/POLISH_PASS.md, and it is measured in a
 * browser rather than read off the source, because the whole reason the item
 * was still open is that the source looked fine. layout.tsx asked next/font
 * for "latin" and "latin-ext" with `preload` left at its default of true, the
 * build wrote a manifest naming ten preloadable files, and not one preload
 * link ever reached the head. Nothing in the source said so.
 *
 * What is checked here:
 *
 *   1. The head really carries font preloads, as fonts, with crossorigin, and
 *      every one of them is a file that exists and is served immutable.
 *   2. The preloaded set is per locale. Yoruba and Igbo read headings in Inter
 *      because Poppins cannot draw their vowels, so they are sent the
 *      vietnamese subset and no Poppins at all.
 *   3. Nothing is fetched that was not preloaded. A font the browser discovers
 *      late is the defect this item exists to remove, so the sweep fails if
 *      one appears.
 *   4. The faces are ours: same origin, no request to fonts.gstatic.com.
 *   5. Inter actually draws the naira sign, the Yoruba and Igbo dotted vowels
 *      and the Hausa hooked letters, rather than handing them to Arial. This
 *      is the one that matters: the comment in layout.tsx has always claimed
 *      Inter was chosen for exactly these glyphs, while the subset list it sat
 *      above did not include the only subset that carries half of them.
 *
 * Run with the server already up:
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/fonts.spec.mjs
 */

import { chromium } from "playwright-core";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3210";
const EXECUTABLE_PATH = "/opt/pw-browsers/chromium";
const LOCALE_COOKIE = "nf_locale";

let failures = 0;
function check(name, condition, detail) {
  if (condition) {
    console.log(`  ok      ${name}`);
  } else {
    failures += 1;
    console.log(`  FAILED  ${name}`);
    if (detail) for (const line of [].concat(detail).slice(0, 12)) console.log(`            ${line}`);
  }
}

/* The exact set each locale should be told to fetch early. Yoruba and Igbo
   swap the display face to Inter in tokens.css, so Poppins never paints on
   them and the vietnamese subset does. */
const EXPECTED = {
  en: [
    "inter-latin", "inter-latin-ext",
    "poppins-600-latin", "poppins-600-latin-ext",
    "poppins-700-latin", "poppins-700-latin-ext",
  ],
  ha: [
    "inter-latin", "inter-latin-ext",
    "poppins-600-latin", "poppins-600-latin-ext",
    "poppins-700-latin", "poppins-700-latin-ext",
  ],
  yo: ["inter-latin", "inter-latin-ext", "inter-vietnamese"],
  ig: ["inter-latin", "inter-latin-ext", "inter-vietnamese"],
};

/* One glyph per orthography this platform ships, plus the currency. Every one
   of them has to come out of Inter and not out of the fallback. */
const GLYPHS = [
  ["the naira sign", "₦"],
  ["Yoruba e with dot below", "ẹ"],
  ["Yoruba o with dot below", "ọ"],
  ["Yoruba s with dot below", "ṣ"],
  ["Igbo i with dot below", "ị"],
  ["Igbo u with dot below", "ụ"],
  ["Hausa hooked b", "ɓ"],
  ["Hausa hooked d", "ɗ"],
  ["Hausa hooked k", "ƙ"],
  ["Hausa hooked y", "ƴ"],
  ["a Yoruba vowel carrying a tone mark", "ẹ́"],
];

const browser = await chromium.launch({ executablePath: EXECUTABLE_PATH });

/* ------------------------------------------------------- 1. the preloads */

console.log("\nPreload, per locale");

for (const [locale, expected] of Object.entries(EXPECTED)) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addCookies([{ name: LOCALE_COOKIE, value: locale, url: BASE_URL }]);
  const page = await ctx.newPage();

  /* Every woff2 the browser asks for, and where from. */
  const fetched = new Set();
  const offOrigin = new Set();
  page.on("request", (r) => {
    if (!r.url().includes(".woff2")) return;
    if (r.url().startsWith(BASE_URL)) fetched.add(r.url().split("/").pop().replace(".woff2", ""));
    else offOrigin.add(new URL(r.url()).host);
  });

  await page.goto(`${BASE_URL}/home`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);

  const preloaded = await page.$$eval('link[rel="preload"][as="font"]', (links) =>
    links.map((l) => ({
      name: l.getAttribute("href").split("/").pop().replace(".woff2", ""),
      cors: l.getAttribute("crossorigin"),
      type: l.getAttribute("type"),
    })),
  );
  const names = preloaded.map((p) => p.name).sort();

  check(
    `${locale}: preloads exactly ${expected.length} faces`,
    names.join(",") === [...expected].sort().join(","),
    [`expected ${[...expected].sort().join(", ")}`, `got      ${names.join(", ") || "(nothing)"}`],
  );
  check(
    `${locale}: every preload is as=font, type=font/woff2, crossorigin`,
    preloaded.length > 0 && preloaded.every((p) => p.cors === "anonymous" && p.type === "font/woff2"),
    preloaded.filter((p) => p.cors !== "anonymous" || p.type !== "font/woff2").map((p) => p.name),
  );

  /* The point of the whole item: nothing arrives late. */
  const late = [...fetched].filter((f) => !expected.includes(f));
  check(`${locale}: no face is fetched that was not preloaded`, late.length === 0, late);
  check(`${locale}: no font is fetched from another origin`, offOrigin.size === 0, [...offOrigin]);

  /* ------------------------------------------------ 5. the glyphs, drawn */

  const drawn = await page.evaluate(async (glyphs) => {
    await document.fonts.ready;
    const canvas = document.createElement("canvas");
    const ctx2 = canvas.getContext("2d");
    const width = (family, text) => {
      ctx2.font = `32px ${family}`;
      return ctx2.measureText(text).width;
    };
    const out = [];
    for (const [label, text] of glyphs) {
      /*
       * Ask for the face FIRST. `document.fonts.check` answers "is a face
       * covering this string loaded right now", not "does this platform ship
       * one", and the two are different on purpose: a subset is fetched when
       * a glyph in its range is painted and not before. Written the other way
       * round, this reported that Inter could not draw ẹ ọ ị ụ on an English
       * page, which is true and is not the question. `load` resolves with the
       * faces whose unicode-range covers the text, so an empty array is the
       * real failure: it means no subset we ship holds the glyph at all.
       */
      const faces = await document.fonts.load("32px Inter", text);
      out.push({
        label,
        text,
        covered: faces.length > 0 && document.fonts.check("32px Inter", text),
        /* And the belt to that brace: if Inter really drew it, the advance
           differs from the metric-matched Arial that would have. */
        inter: width("Inter", text),
        fallback: width('"Inter Fallback"', text),
      });
    }
    return out;
  }, GLYPHS);

  if (locale === "en") {
    for (const g of drawn) {
      check(
        `Inter draws ${g.label}`,
        g.covered && g.inter > 0 && Math.abs(g.inter - g.fallback) > 0.01,
        [`covered ${g.covered}, Inter ${g.inter.toFixed(2)}px, fallback ${g.fallback.toFixed(2)}px`],
      );
    }

    const body = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
    check("body text is set in Inter", /^Inter/.test(body), [body]);
  }

  await ctx.close();
}

/* ------------------------------------------------- 2. served like a font */

console.log("\nDelivery");

const ctx = await browser.newContext();
const page = await ctx.newPage();
for (const name of ["inter-latin", "inter-latin-ext", "inter-vietnamese", "poppins-600-latin", "poppins-600-latin-ext", "poppins-700-latin", "poppins-700-latin-ext"]) {
  const res = await page.request.get(`${BASE_URL}/fonts/${name}.woff2`);
  const cache = res.headers()["cache-control"] ?? "";
  check(
    `${name}.woff2 is served, immutable, for a year`,
    res.status() === 200 && cache.includes("immutable") && cache.includes("31536000"),
    [`status ${res.status()}, cache-control "${cache}"`],
  );
}
await ctx.close();

await browser.close();

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
