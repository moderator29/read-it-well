#!/usr/bin/env node
/*
 * THE BADGE, READ OFF THE RENDERED DOM OF THE COMPONENT THE PRODUCT SHIPS.
 *
 * Not a description of the mark, not a copy of its path, not a snapshot taken
 * when somebody was happy: `components/trust/TierBadge.tsx` itself, bundled
 * from source and rendered through `react-dom/server`, with the markup then
 * examined. Both tiers, the absent case, and the accessible naming.
 *
 * WHY THIS IS A SCRIPT AND NOT PART OF THE VITEST SUITE DIRECTLY.
 * `apps/web/vitest.config.ts` runs every test under the `react-server`
 * condition and aliases `react` at its React Server Components build, because
 * the modules that suite exists for are server modules whose `cache` semantics
 * are wrong under any other build. That build cannot render: `react-dom/server`
 * under `react-server` throws "react-dom/server is not supported in React
 * Server Components" by design, and the two React builds cannot be mixed (the
 * jsx runtime refuses with "the react-server condition must be enabled").
 * The config's own docstring says as much: "nothing in this suite renders a
 * component". So the render happens here, under the ordinary client
 * conditions, and `agent-badge-derivation.test.ts` runs this file and asserts
 * on its verdict, which keeps the check inside the suite without changing a
 * shared config.
 *
 * THE NEGATIVE IS THE ASSERTION THAT MATTERS. A check that only proves gold
 * draws gold and platinum draws platinum passes just as happily over a
 * component that draws a badge for EVERYBODY, and drawing a mark for somebody
 * nobody has checked is the failure that costs a reader money. `none` must
 * render the empty string, and that is checked first.
 *
 * Run it directly:  node scripts/probes/badge_mark_dom.mjs
 * Exit 0 with a PASS line, or exit 1 naming the assertion that failed.
 */

import { build } from "esbuild";
import { renderToStaticMarkup } from "react-dom/server";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { mkdtempSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ENTRY = join(ROOT, "apps/web/src/components/trust/TierBadge.tsx");

const failures = [];
function check(name, ok, detail) {
  if (!ok) failures.push(`${name}${detail ? `: ${detail}` : ""}`);
}

/*
 * The bundle lands INSIDE the repository, not in the system temp directory.
 * It imports `react` and `react-dom` as externals, and Node resolves a bare
 * specifier by walking up from the importing file, so a bundle in /tmp cannot
 * see `node_modules` here and dies with ERR_MODULE_NOT_FOUND. Measured, not
 * guessed: that is exactly how this probe failed on its first run.
 */
mkdirSync(join(ROOT, "node_modules/.cache"), { recursive: true });
const out = mkdtempSync(join(ROOT, "node_modules/.cache/vallo-badge-"));
try {
  /*
   * Bundled from the real file. The stylesheet import is stubbed, because a
   * `.css` import carries no markup and resolving it would drag Tailwind in;
   * the colours the markup references are `var(--nf-badge-*)` custom property
   * names, which ARE in the markup and are asserted below.
   */
  await build({
    entryPoints: [ENTRY],
    outfile: join(out, "badge.mjs"),
    bundle: true,
    format: "esm",
    platform: "node",
    jsx: "automatic",
    external: ["react", "react-dom", "react/jsx-runtime"],
    absWorkingDir: ROOT,
    logLevel: "silent",
    alias: { "@": join(ROOT, "apps/web/src") },
    loader: { ".css": "empty" },
  });

  const { TierBadge } = await import(join(out, "badge.mjs"));
  const render = (props) => renderToStaticMarkup(TierBadge(props));

  /* 1. THE NEGATIVE, FIRST AND LOUDEST. */
  const absent = render({ tier: "none" });
  check("an unchecked person draws NOTHING", absent === "", `got ${JSON.stringify(absent)}`);

  /* 2. Gold, and it is not platinum. */
  const gold = render({ tier: "gold" });
  check("gold is marked gold", gold.includes('data-tier="gold"'));
  check("gold paints the gold gradient", gold.includes("var(--nf-badge-gold-top)"));
  check("gold does not paint platinum", !gold.includes("var(--nf-badge-platinum-top)"));
  check(
    "gold says what it means and claims nothing more",
    gold.includes("Identity checked by a person at Vallo."),
  );

  /* 3. Platinum, and it is not gold. */
  const platinum = render({ tier: "platinum" });
  check("platinum is marked platinum", platinum.includes('data-tier="platinum"'));
  check("platinum paints the platinum gradient", platinum.includes("var(--nf-badge-platinum-top)"));
  check("platinum does not paint gold", !platinum.includes("var(--nf-badge-gold-top)"));
  check("platinum says it is Vallo", platinum.includes("A Vallo administrator."));

  /* 4. NO BACKGROUND, the founder's instruction of 23 September, as a check. */
  for (const [name, html] of [
    ["gold", gold],
    ["platinum", platinum],
  ]) {
    check(`${name} draws no background`, !/background/i.test(html));
    check(`${name} draws no border or ring`, !/border/i.test(html));
    check(`${name} draws no round plate`, !/rounded-full/.test(html));
    check(`${name} draws no shadow or halo`, !/box-?shadow/i.test(html));
    check(
      `${name} draws no disc or plate shape`,
      !/<(?:circle|rect|ellipse)\b/.test(html),
      "a circle, rect or ellipse is in the markup",
    );
    /* Exactly two painted shapes: the seal, and the tick knocked through it. */
    const paths = html.match(/<path/g)?.length ?? 0;
    check(`${name} paints exactly the seal and the tick`, paths === 2, `${paths} paths`);
  }

  /* 5. Said once, not twice, and not never. */
  const silent = render({ tier: "gold", decorative: true });
  check("the mark is announced when it stands alone", gold.includes('role="img"'));
  check(
    "the mark carries its meaning as its accessible name",
    gold.includes('aria-label="Identity checked by a person at Vallo."'),
  );
  check("the mark is silent when a label already says it", !silent.includes('role="img"'));
  check("and it is hidden rather than merely unlabelled", silent.includes("aria-hidden"));

  /* 6. The seal is the founder's, by its measured geometry. */
  check(
    "the silhouette is the eight lobed seal measured off the artwork",
    gold.includes("M12 1C12.65 1 13.38 1.74"),
  );
} finally {
  rmSync(out, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error(`BADGE DOM PROBE FAILED, ${failures.length} assertion(s):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log(
  "BADGE DOM PROBE PASS: the real TierBadge renders NOTHING for an unchecked person, " +
    "the gold seal with its own gradient and meaning for a checked one, the platinum seal " +
    "for a platform administrator, neither borrowing the other's paint; no background, " +
    "border, plate, shadow, disc or rect behind either, exactly two painted shapes; " +
    "announced once when it stands alone and hidden when a label already carries it.",
);
