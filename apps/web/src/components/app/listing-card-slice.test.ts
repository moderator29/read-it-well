import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import { describe, expect, it } from "vitest";

/**
 * THE LISTING CARD DRAWS THE SAME MARKUP FROM ITS SLICE AS FROM THE WHOLE
 * DICTIONARY. `forListingCard` hands the card a dictionary narrowed to the
 * namespaces, and for `shape` and `trustVisible` the keys, that its import
 * graph reads. `slice-coverage.test.ts` proves that by reading the source;
 * this runs it, in every locale, over the fixture rows (an example row
 * included), so a namespace read through a path the source scan cannot see is
 * a failed test here and not a crash on /search. It only covers the branches
 * the fixtures reach (the cash, compound and service lines are not among
 * them), which is why the key-level guard is the source walk and not this.
 *
 * Bundled with esbuild against the ordinary React build, like
 * `lib/testing/render-client.ts`, with `next/link` and `next/image` stubbed
 * because their server halves are not what is under test.
 */
const WEB_SRC = join(__dirname, "..", "..");

const STUBS: Record<string, string> = {
  "navigation.js": `
    export const useRouter = () => ({ push() {}, replace() {}, refresh() {}, back() {}, prefetch() {} });
    export const usePathname = () => "/";
    export const useSearchParams = () => new URLSearchParams();`,
  "empty.js": `export {};`,
  "link.js": `
    import { createElement } from "react";
    export default function Link({ href, children, prefetch, scroll, replace, ...rest }) {
      return createElement("a", { href: typeof href === "string" ? href : String(href?.pathname ?? ""), ...rest }, children);
    }`,
  "image.js": `
    import { createElement } from "react";
    export default function Image({ src, alt, fill, priority, sizes, quality, placeholder, blurDataURL, unoptimized, loader, ...rest }) {
      return createElement("img", { src: typeof src === "string" ? src : "", alt, ...rest });
    }`,
};

describe("ListingCard from its dictionary slice", () => {
  it("renders every fixture row identically in each locale", async () => {
    const dir = mkdtempSync(join(tmpdir(), "nf-card-slice-"));
    try {
      for (const [name, body] of Object.entries(STUBS)) writeFileSync(join(dir, name), body);
      writeFileSync(
        join(dir, "entry.tsx"),
        `
        import { renderToStaticMarkup } from "react-dom/server";
        import { getDictionary, LOCALES } from "@vallo/i18n";
        import { forListingCard } from "@/lib/i18n/slice";
        import { ListingCard } from "@/components/app/ListingCard";
        import { ClientCopyProvider } from "@/lib/i18n/client-copy";
        import { clientCopyOf } from "@/lib/i18n/client-copy-of";
        import { EXAMPLE_LISTING, SHELF } from "@/app/(dev)/preview/f3/fixtures";
        export const html = () => JSON.stringify(LOCALES.map((locale) => {
          const t = getDictionary(locale);
          const draw = (dict) => [...SHELF, EXAMPLE_LISTING].map((listing, index) =>
            renderToStaticMarkup(
              <ClientCopyProvider copy={clientCopyOf(t)}>
                <ListingCard listing={listing} locale={locale} t={dict} index={index} />
              </ClientCopyProvider>,
            ));
          return { locale, whole: draw(t), sliced: draw(forListingCard(t)) };
        }));
        `,
      );
      const out = join(dir, "out.mjs");
      await build({
        entryPoints: [join(dir, "entry.tsx")],
        bundle: true,
        platform: "node",
        format: "esm",
        outfile: out,
        jsx: "automatic",
        logLevel: "silent",
        alias: {
          "@": WEB_SRC,
          "next/navigation": join(dir, "navigation.js"),
          "next/link": join(dir, "link.js"),
          "next/image": join(dir, "image.js"),
          "server-only": join(dir, "empty.js"),
        },
        nodePaths: [join(WEB_SRC, "..", "node_modules"), join(WEB_SRC, "..", "..", "..", "node_modules")],
        define: { "process.env.NODE_ENV": '"production"' },
        external: ["@opentelemetry/api"],
      });
      const mod = (await import(/* @vite-ignore */ pathToFileURL(out).href)) as { html: () => string };
      const runs = JSON.parse(mod.html()) as { locale: string; whole: string[]; sliced: string[] }[];
      expect(runs.length).toBeGreaterThan(0);
      for (const run of runs) {
        expect(run.whole.length).toBeGreaterThan(0);
        expect(run.sliced, run.locale).toEqual(run.whole);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 90_000);
});
