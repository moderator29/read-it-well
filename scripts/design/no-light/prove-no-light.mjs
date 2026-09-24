/**
 * THE ONLY PROOF THAT MATTERS FOR THIS TASK: a browser told its operating
 * system is set to LIGHT, opening real screens, and getting the dark palette.
 *
 *   node scripts/design/no-light/prove-no-light.mjs --base http://127.0.0.1:3184
 *
 * The failure mode of removing a theme is a page that looks right on the
 * machine that removed it and white on somebody's phone, so nothing here is
 * asked of the machine's own preference. `colorScheme: "light"` is Chromium's
 * emulation of an operating system set to light: `prefers-color-scheme: light`
 * matches, and the browser draws its OWN furniture, the parts no stylesheet
 * can reach, in its light palette unless `color-scheme` says otherwise.
 *
 * WHAT IT CHECKS ON EVERY ROUTE.
 *
 *   1. `matchMedia("(prefers-color-scheme: light)")` MATCHES. If it does not,
 *      the emulation is not on and every other assertion below is vacuous.
 *      This is the guard that stops a green run meaning nothing.
 *   2. The computed `color-scheme` on the root element is `dark`.
 *   3. The document element carries no `data-theme` attribute.
 *   4. The painted canvas is DARK: the most common pixel in the top strip of
 *      the viewport has a relative luminance under 0.2. Read off the pixels
 *      rather than off `getComputedStyle`, because a stylesheet saying navy and
 *      a browser painting white is exactly the fault being looked for.
 *   5. On the route that carries native form controls, every `<input>`,
 *      `<select>` and `<textarea>` computes `color-scheme: dark` too, inherited
 *      from the root. That is the property the browser reads when it draws the
 *      inside of an open `<select>`, a date picker, the number spinners and the
 *      autofill fill, none of which a stylesheet can touch.
 *
 * It writes one shot per route and prints a line per check. A shot of a page
 * that is already dark is not evidence on its own; the assertions are, and the
 * shots are there so a person can look.
 */
import { chromium } from "playwright-core";
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const arg = (n, d = null) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : d;
};
const BASE = arg("base", "http://127.0.0.1:3184").replace(/\/$/, "");
/* Shots land under docs/design/proofs/no-light/, beside the other proof runs. */
const OUT = join(HERE, "..", "..", "..", "docs/design/proofs/no-light");
mkdirSync(OUT, { recursive: true });

/* Real screens, not the token gallery: a marketing page, the signed-in home,
   a money screen, a settings screen, and one with native form controls. */
const ROUTES = (
  arg("routes", null) ??
  [
    "/preview/f1/home",
    "/preview/f4/settings",
    "/preview/e/wallet",
    "/preview/f3/listing",
    "/preview/b1b/owner",
  ].join(",")
)
  .split(",")
  .map((r) => r.trim())
  .filter(Boolean);

const lin = (v) => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  /* Without SwiftShader, headless Chromium drops `backdrop-filter` in silence
     and the glass surfaces are photographed as flat fills. */
  args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--disable-lcd-text"],
});

let failures = 0;
const note = (ok, text) => {
  if (!ok) failures += 1;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${text}`);
};

for (const route of ROUTES) {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    /* The operating system says LIGHT. This is the whole test. */
    colorScheme: "light",
    deviceScaleFactor: 2,
  });
  console.log(`\n${route}`);
  try {
    const res = await page.goto(`${BASE}${route}`, { waitUntil: "networkidle", timeout: 60_000 });
    const status = res?.status() ?? 0;
    if (status < 200 || status >= 300) throw new Error(`server answered ${status}`);
    const landed = new URL(page.url()).pathname.replace(/\/$/, "") || "/";
    const asked = new URL(`${BASE}${route}`).pathname.replace(/\/$/, "") || "/";
    if (landed !== asked) throw new Error(`browser ended up at ${landed}`);
    /* A layout `notFound()` answers HTTP 200 with the not-found body, which is
       a page with excellent contrast and nothing to do with the route asked
       for. The status code cannot see it. */
    if (await page.locator("[data-nf-not-found]").count())
      throw new Error("not-found body served at 200");
    await page.waitForTimeout(600);

    const read = await page.evaluate(() => ({
      osIsLight: window.matchMedia("(prefers-color-scheme: light)").matches,
      rootScheme: getComputedStyle(document.documentElement).colorScheme,
      dataTheme: document.documentElement.getAttribute("data-theme"),
      controls: [...document.querySelectorAll("input, select, textarea")].map((el) => ({
        tag: el.tagName.toLowerCase(),
        type: el.getAttribute("type") ?? "",
        scheme: getComputedStyle(el).colorScheme,
      })),
    }));

    note(read.osIsLight, "the operating system is emulated as LIGHT (if this fails, nothing below counts)");
    note(read.rootScheme === "dark", `root color-scheme is "${read.rootScheme}"`);
    note(read.dataTheme === null, `no data-theme attribute on the root (saw ${JSON.stringify(read.dataTheme)})`);

    const shot = await page.screenshot({ path: join(OUT, `${route.replace(/\//g, "_")}.png`) });
    const { data, info } = await sharp(shot)
      .extract({ left: 0, top: 0, width: 780, height: 240 })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const hist = new Map();
    for (let i = 0; i < data.length; i += 4) {
      const k = `${data[i]},${data[i + 1]},${data[i + 2]}`;
      hist.set(k, (hist.get(k) ?? 0) + 1);
    }
    const [top] = [...hist.entries()].sort((a, b) => b[1] - a[1]);
    const canvas = top[0].split(",").map(Number);
    const L = lum(canvas);
    note(
      L < 0.2,
      `the painted canvas is rgb(${canvas}), relative luminance ${L.toFixed(3)} ` +
        `(${Math.round((100 * top[1]) / (info.width * info.height))} per cent of the top strip)`,
    );

    if (read.controls.length > 0) {
      const wrong = read.controls.filter((c) => c.scheme !== "dark");
      note(
        wrong.length === 0,
        `${read.controls.length} native form control(s) inherit color-scheme: dark` +
          (wrong.length ? `; wrong: ${JSON.stringify(wrong)}` : ""),
      );
    } else {
      console.log("  ....  no native form controls on this route");
    }
  } catch (e) {
    failures += 1;
    console.log(`  FAIL  ${e.message.split("\n")[0]}`);
  } finally {
    await page.close();
  }
}
await browser.close();
console.log(`\n${failures === 0 ? "every check passed" : `${failures} check(s) failed`}.`);
process.exit(failures === 0 ? 0 : 1);
