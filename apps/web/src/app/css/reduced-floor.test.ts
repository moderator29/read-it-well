/**
 * EVERY REDUCED-MOTION ALTERNATIVE OPTS IN TO THE FLOOR (W2, round 5).
 *
 * The floor in `animation.css` collapses every animation and transition to
 * 0.01ms under `prefers-reduced-motion` unless the element sets
 * `--nf-reduced-duration` / `--nf-reduced-transition` (see the comment there,
 * and `reduced-floor.dom.test.tsx` for the computed proof). This reads every
 * stylesheet under `src` and finds the declarations written inside a
 * `prefers-reduced-motion: reduce` block that name a duration longer than
 * 1ms: each one is a fade somebody meant, and each must sit in a rule that
 * opts in, or it is silently instant.
 *
 * Two escapes are refused as well: a layered `!important` on an animation in
 * a reduced block (the old workaround, which beats the floor for everything,
 * delays and loops included), except on a view-transition pseudo, which the
 * floor's `*` never reaches and base.css stops on its own.
 *
 * PENDING lists the fades in files other agents had open on 6 October; each
 * has a patch in the W2 scratch folder. When a patch lands, its entry must be
 * removed here (the test fails on an entry that is already honoured).
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import postcss, { type AtRule, type Declaration, type Rule } from "postcss";
import { describe, expect, it } from "vitest";

const SRC = join(__dirname, "..", "..");

const PENDING = new Set<string>([
  "components/app/search/discovery.css",
  "components/app/search/results-motion.css",
  "app/css/map.css",
  "app/css/pay-stage.css",
]);

function cssFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) cssFiles(path, out);
    else if (entry.name.endsWith(".css")) out.push(path);
  }
  return out;
}

const TIME = /(\d*\.?\d+)(ms|s)\b/g;
const longest = (value: string) =>
  Math.max(0, ...[...value.matchAll(TIME)].map((m) => parseFloat(m[1]!) * (m[2] === "s" ? 1000 : 1)));

const inReduced = (node: Declaration) => {
  for (let p = node.parent; p; p = p.parent as typeof p) {
    if (p.type === "atrule" && (p as AtRule).name === "media" && /prefers-reduced-motion:\s*reduce/.test((p as AtRule).params)) return true;
  }
  return false;
};
const layered = (node: Declaration) => {
  for (let p = node.parent; p; p = p.parent as typeof p) if (p.type === "atrule" && (p as AtRule).name === "layer") return true;
  return false;
};

type Finding = { file: string; line: number; decl: string; problem: string };

function audit(): Finding[] {
  const found: Finding[] = [];
  for (const path of cssFiles(SRC)) {
    const file = relative(SRC, path);
    if (file === "app/css/animation.css") continue;
    const root = postcss.parse(readFileSync(path, "utf8"));
    root.walkDecls((d) => {
      if (!inReduced(d) || d.parent?.type !== "rule") return;
      const rule = d.parent as Rule;
      const isAnim = /^animation(-duration)?$/.test(d.prop);
      const isTrans = /^transition(-duration)?$/.test(d.prop);
      if (!isAnim && !isTrans) return;
      const at = { file, line: d.source?.start?.line ?? 0, decl: `${rule.selector.replace(/\s+/g, " ")} { ${d.prop}: ${d.value} }` };
      if (isAnim && d.important && layered(d) && !/::view-transition/.test(rule.selector) && longest(d.value) > 1) {
        found.push({ ...at, problem: "escapes the floor with a layered !important" });
        return;
      }
      if (d.important || longest(d.value) <= 1) return;
      const optIn = isAnim ? "--nf-reduced-duration" : "--nf-reduced-transition";
      if (!rule.nodes.some((n) => n.type === "decl" && (n as Declaration).prop === optIn)) {
        found.push({ ...at, problem: `swallowed by the floor (no ${optIn})` });
      }
    });
  }
  return found;
}

describe("the reduced-motion floor", () => {
  const findings = audit();

  it("swallows no fade a component wrote for reduced motion, outside the pending patches", () => {
    expect(findings.filter((f) => !PENDING.has(f.file))).toEqual([]);
  });

  it("lists no pending file whose fades are already honoured", () => {
    const open = new Set(findings.map((f) => f.file));
    expect([...PENDING].filter((file) => !open.has(file))).toEqual([]);
  });

  it("reads its numbers from the three registered, non-inherited properties", () => {
    const css = readFileSync(join(SRC, "app/css/animation.css"), "utf8");
    for (const [name, initial] of [
      ["--nf-reduced-duration", "0.01ms"],
      ["--nf-reduced-delay", "0ms"],
      ["--nf-reduced-transition", "0.01ms"],
    ]) {
      expect(css).toMatch(new RegExp(`@property ${name} \\{\\s*syntax: "<time>";\\s*inherits: false;\\s*initial-value: ${initial};`));
    }
    expect(css).toContain("animation-duration: var(--nf-reduced-duration, 0.01ms) !important;");
    expect(css).toContain("animation-delay: var(--nf-reduced-delay, 0ms) !important;");
    expect(css).toContain("transition-duration: var(--nf-reduced-transition, 0.01ms) !important;");
    expect(css).toContain("animation-iteration-count: 1 !important;");
  });
});
