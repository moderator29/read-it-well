import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * FIVE GAPS AGAINST MOTION_SYSTEM.md CLOSED (Session 3, C1; the table is in the
 * scratchpad's `c1/motion-gaps.md`), HELD BY SOURCE. Chromium checks of the
 * same rules are in `motion-gaps.dom.test.tsx`.
 */
const src = (path: string) => readFileSync(join(process.cwd(), "src", path), "utf8");
const css = (file: string) => src(`app/css/${file}`);
const strip = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, "");

describe("principle 10: nothing loops forever", () => {
  it("the edge light's runners take two laps and stop (the dock, the hero bands, the summary card)", () => {
    const edge = strip(css("edge-m.css"));
    expect(edge).not.toMatch(/infinite/);
    expect(edge).toMatch(/animation: nf-edge-long var\(--nf-edge-lap, 7\.5s\) linear\s+var\(--nf-edge-delay, 0s\) 2 both/);
    expect(edge).toMatch(/animation: nf-edge-side var\(--nf-edge-lap, 7\.5s\) linear\s+var\(--nf-edge-delay, 0s\) 2 both/);
    expect(edge).toContain("animation: nf-edge-turn var(--nf-edge-lap, 7.5s) linear 2 both");
  });

  it("the runners end shrunk to a point, so stopping leaves nothing drawn", () => {
    const edge = strip(css("edge-m.css"));
    const long = edge.slice(edge.indexOf("@keyframes nf-edge-long"), edge.indexOf("@keyframes nf-edge-side"));
    expect(long.trimEnd().replace(/\s+/g, " ")).toMatch(/100% \{ translate: var\(--nf-edge-x0\) 0; scale: 0 1; \} \}$/);
    const side = edge.slice(edge.indexOf("@keyframes nf-edge-side"), edge.indexOf("The round dock button"));
    expect(side.replace(/\s+/g, " ")).toMatch(/100% \{ translate: var\(--nf-edge-xl\) var\(--nf-edge-y0\); scale: 1 0; \}/);
  });

  it("the supplier flows' step-bar sheen and head object float stop after two passes", () => {
    const flow = strip(css("flow-m.css"));
    expect(flow).not.toMatch(/infinite/);
    expect(flow).toContain("animation: nf-flow-sheen 2.6s var(--nf-ease-standard) 600ms 2 both");
    /* No fill mode on the float: a backwards fill would hold `transform: none` over the pop before it. */
    expect(flow).toContain("nf-flow-float 6s var(--nf-ease-standard) 1s 2;");
  });
});

describe("the dock pill springs on drift at 240ms", () => {
  const shell = strip(css("shell-m.css"));
  const from = shell.indexOf(".nf-tabbar .nf-tab {\n    flex: 1 1 0;");
  /* From the slot rule through the pill rule (about 3.5KB of the dock block). */
  const dock = shell.slice(from, from + 3500);

  it("the slot, its word and its pill all travel on drift at the base rung", () => {
    /* flex-grow (the slot), max-width, margin and transform (the word), transform (the pill). */
    expect(dock.match(/var\(--nf-duration-base\) var\(--nf-ease-spring\)/g)).toHaveLength(5);
    expect(dock).not.toMatch(/--nf-duration-slow\) var\(--nf-ease-spring\)/);
  });
});

describe("the form error, for every form (whip 160ms, 4px, once)", () => {
  const controls = strip(css("controls.css"));

  it("shakes the shared Field when it becomes invalid, and leaves the auth screens to their own", () => {
    expect(controls).toContain('.nf-field[aria-invalid="true"]:not(.nf-auth .nf-field) {');
    expect(controls).toContain("animation: nf-field-refuse var(--nf-duration-fast) var(--nf-ease-whip) both");
    const frames = controls.slice(controls.indexOf("@keyframes nf-field-refuse"), controls.indexOf("@keyframes nf-field-refuse") + 200);
    expect(frames).toContain("translate3d(-4px, 0, 0)");
    expect(frames).toContain("translate3d(4px, 0, 0)");
    expect(frames).not.toMatch(/width|height|top|left|filter|color/);
  });

  it("draws none under reduced motion, Calm or Off", () => {
    expect(controls).toMatch(/prefers-reduced-motion: reduce\) \{\s*\.nf-field\[aria-invalid="true"\]:not\(\.nf-auth \.nf-field\) \{\s*animation: none;/);
    expect(controls).toMatch(/\[data-motion="calm"\], \[data-motion="off"\]\) \.nf-field\[aria-invalid="true"\] \{\s*animation: none;/);
  });
});

describe("pull to refresh: the mark turns with the drag and spins once on release", () => {
  const details = strip(css("details.css"));
  const tsx = src("components/ui/PullToRefresh.tsx");

  it("rotates the ring from the pull, as a direct response to the finger", () => {
    expect(tsx).toContain("const turn = Math.round(progress * 270)");
    expect(tsx).toContain("transform: `rotate(${turn}deg)`");
    expect(tsx).toContain('"--nf-ptr-a": `${turn}deg`');
  });

  it("spins one full turn on glide over the deliberate rung when refreshing starts, and never loops", () => {
    expect(details).toContain(".nf-ptr[data-refreshing] .nf-ptr__ring {\n    animation: nf-ptr-spin var(--nf-duration-deliberate) var(--nf-ease-standard) both;");
    expect(details).toMatch(/@keyframes nf-ptr-spin \{\s*to \{\s*transform: rotate\(calc\(var\(--nf-ptr-a, 0deg\) \+ 360deg\)\);/);
    expect(details).not.toMatch(/nf-ptr[^{]*\{[^}]*infinite/);
  });

  it("is still under reduced motion, Calm and Off", () => {
    expect(details).toMatch(/prefers-reduced-motion: reduce\) \{\s*\.nf-ptr\[data-refreshing\] \.nf-ptr__ring \{\s*animation: none;/);
    expect(details).toMatch(/\[data-motion="calm"\], \[data-motion="off"\]\) \.nf-ptr\[data-refreshing\] \.nf-ptr__ring \{\s*animation: none;/);
  });
});
