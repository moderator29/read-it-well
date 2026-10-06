import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { BRAND_DOMAIN } from "@/lib/brand-domain";
import { SHARE_CARD_FOOTER } from "@/lib/price-check/disclaimer";
import { OWN_CARD, SITE_CARD } from "./site-card";

/**
 * NO LINK UNFURLS BLANK, AND NONE UNFURLS AS ANOTHER PAGE (W3, round 5).
 *
 * Measured on a running server before this: /terms, /privacy, /docs,
 * /contact, /sign-in and the invite door /join/<code> carried no og:image at
 * all, /check and every docs chapter carried the HOME page's og:title and
 * description over their own card, and every page's twitter:title was the
 * slogan. Next replaces a layout's whole `openGraph` with a page's, image
 * included, so these rules are about the source, and this reads it.
 */

const APP = join(__dirname, "..", "..", "app");
const ROOT_LAYOUT = join(APP, "layout.tsx");

function pages(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) pages(path, out);
    else if (name === "page.tsx") out.push(path);
  }
  return out;
}

const PUBLIC_TREES = ["(site)", "(auth)", "(landing)", "join", "s"].map((tree) => join(APP, tree)).filter(existsSync);
const PUBLIC_PAGES = PUBLIC_TREES.flatMap((tree) => pages(tree));
const hasOwnCard = (page: string) => readdirSync(dirname(page)).some((name) => name.startsWith("opengraph-image."));
const source = (page: string) => readFileSync(page, "utf8");

describe("every public page unfurls with a picture and its own words", () => {
  it("finds the public pages", () => {
    expect(PUBLIC_PAGES.length).toBeGreaterThan(30);
  });

  it("holds OWN_CARD to the cards on disk", () => {
    const declared = new Map<string, boolean>();
    for (const page of PUBLIC_PAGES) {
      const key = /publicPageMetadata\(\s*"([A-Za-z]+)"/.exec(source(page))?.[1];
      if (key) declared.set(key, hasOwnCard(page));
    }
    expect(declared.size).toBeGreaterThan(10);
    for (const [key, own] of declared) expect(OWN_CARD.has(key as never), key).toBe(own);
  });

  it("names the site's card wherever a page writes its own Open Graph and draws no card", () => {
    const blank = PUBLIC_PAGES.filter((page) => {
      const src = source(page);
      if (!/openGraph\s*:/.test(src) || hasOwnCard(page)) return false;
      return !/SITE_CARD/.test(src);
    }).map((page) => relative(APP, page));
    expect(blank).toEqual([]);
  });

  it("gives a page with its own card its own Open Graph words", () => {
    /* A card file and a title, with no Open Graph words: the unfurl reads the
       home page's title under this page's picture. */
    const borrowed = PUBLIC_PAGES.filter((page) => {
      const src = source(page);
      if (!hasOwnCard(page) || !/(generateMetadata|export const metadata)/.test(src)) return false;
      return !/openGraph\s*:|publicPageMetadata\(/.test(src);
    }).map((page) => relative(APP, page));
    expect(borrowed).toEqual([]);
  });

  it("lets Twitter's words follow each page's Open Graph", () => {
    const layout = readFileSync(ROOT_LAYOUT, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const twitter = [...layout.matchAll(/twitter:\s*\{([^}]*)\}/g)].map((m) => m[1]!);
    expect(twitter.length).toBeGreaterThan(0);
    for (const body of twitter) expect(body).not.toMatch(/\b(title|description)\s*:/);
  });

  it("points at the root card the proxy serves signed out", () => {
    expect(SITE_CARD.url).toBe("/opengraph-image.jpg");
    expect(existsSync(join(APP, "opengraph-image.jpg"))).toBe(true);
    expect(statSync(join(APP, "opengraph-image.jpg")).size).toBeLessThanOrEqual(100 * 1024);
  });
});

describe("the address a forwarded card prints", () => {
  it("is the brand's, never the domain nobody registered", () => {
    expect(SHARE_CARD_FOOTER).toContain(BRAND_DOMAIN);
    expect(SHARE_CARD_FOOTER).not.toContain("vallo.ng");
  });
});
