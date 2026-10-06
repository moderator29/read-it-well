/**
 * Paths, fonts, stickers, icons and photographs for the store images.
 *
 * Everything a template draws comes from the repository: the product's own
 * fonts (apps/web/public/fonts), its photographs and brand art
 * (apps/web/public/brand), Fluent 3D emoji stickers and Lucide line icons
 * (scripts/marketing/node_modules). DESIGN.md section 3 lists them.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const MARKETING = join(HERE, "..");
export const REPO = join(MARKETING, "..", "..");
export const BRAND = join(REPO, "apps", "web", "public", "brand");
export const FONTS = join(REPO, "apps", "web", "public", "fonts");
/* STORE_SCREENS points the compositor at another folder of displays (design proofs). */
export const SCREENS = process.env.STORE_SCREENS || join(REPO, "docs", "marketing", "screens");
export const SOURCE = join(REPO, "docs", "marketing", "source");
export const OUT = join(REPO, "docs", "store", "screenshots");
const MODULES = join(MARKETING, "node_modules");
const ICONS = join(MODULES, "lucide-static", "icons");

export const url = (p) => pathToFileURL(p).href;

/* The two stores. `model` picks the handset the 3D studio draws. */
export const STORES = {
  "app-store": { id: "app-store", W: 1320, H: 2868, model: "island", screen: "ios" },
  "google-play": { id: "google-play", W: 1440, H: 2560, model: "android", screen: "android" },
};

/* ------------------------------------------------------------- palette */

export const C = {
  ink: "#010118",
  navy: "#02063F",
  electric: "#0069FE",
  e600: "#0056D0",
  e700: "#003F98",
  quiet: "#5C9FFF",
  sky: "#8FD3FF",
  paper: "#FFFFFF",
  mist: "#F3F7FF",
  studio: "#F2F3F6",
  orange: "#FF6B1A",
  peach: "#FFB27A",
};

/* ------------------------------------------------------------- fonts */

const ext = "U+100-2BA, U+2BD-2C5, U+2C7-2CC, U+2CE-2D7, U+2DD-2FF, U+304, U+308, U+329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF";
const latin = "U+0-FF, U+131, U+152-153, U+2BB-2BC, U+2C6, U+2DA, U+2DC, U+304, U+308, U+329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD";
const viet = "U+102-103, U+110-111, U+128-129, U+168-169, U+1A0-1A1, U+1AF-1B0, U+300-301, U+303-304, U+308-309, U+323, U+329, U+1EA0-1EF9, U+20AB";

/* The same faces and subsets the product ships (apps/web/src/app/css/fonts.css),
   plus Instrument Serif italic for the rare editorial accent. */
export function fontCss() {
  const f = (file) => url(join(FONTS, file));
  const poppins = (w) => `
    @font-face { font-family: "Poppins"; font-weight: ${w}; src: url("${f(`poppins-${w}-latin-ext.woff2`)}") format("woff2"); unicode-range: ${ext}; }
    @font-face { font-family: "Poppins"; font-weight: ${w}; src: url("${f(`poppins-${w}-latin.woff2`)}") format("woff2"); unicode-range: ${latin}; }`;
  const serif = url(join(MODULES, "@fontsource", "instrument-serif", "files", "instrument-serif-latin-400-italic.woff2"));
  return `
    @font-face { font-family: "Inter"; font-weight: 100 900; src: url("${f("inter-latin-ext.woff2")}") format("woff2"); unicode-range: ${ext}; }
    @font-face { font-family: "Inter"; font-weight: 100 900; src: url("${f("inter-vietnamese.woff2")}") format("woff2"); unicode-range: ${viet}; }
    @font-face { font-family: "Inter"; font-weight: 100 900; src: url("${f("inter-latin.woff2")}") format("woff2"); unicode-range: ${latin}; }
    ${poppins(600)}
    ${poppins(700)}
    @font-face { font-family: "Instrument Serif"; font-style: italic; font-weight: 400; src: url("${serif}") format("woff2"); }`;
}

/* ------------------------------------------------------------- art */

export const brandUrl = (name) => url(join(BRAND, name));

/** A Lucide line icon, inline, in the colour and stroke asked for. */
export function icon(name, { size = 32, color = "currentColor", stroke = 2 } = {}) {
  const svg = readFileSync(join(ICONS, `${name}.svg`), "utf8")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\s*class="[^"]*"/, "")
    .replace(/width="24"/, `width="${size}"`)
    .replace(/height="24"/, `height="${size}"`)
    .replace(/stroke="currentColor"/, `stroke="${color}"`)
    .replace(/stroke-width="2"/, `stroke-width="${stroke}"`);
  return svg.trim();
}

/** The live screen as a full display, for the store's handset. */
export const screenFile = (id, store) => join(SCREENS, `${id}-${STORES[store].screen}.png`);
