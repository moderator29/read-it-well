import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToString } from "react-dom/server";
import { Button } from "./Button";

/*
 * THE ACTION MORPH (Session 3; north star motion 7, reference 7061). Opt in
 * only, so every existing call site renders exactly as before; and the
 * loading ring is drawn once and held, never spun.
 */
const buttons = readFileSync(join(__dirname, "../../app/css/buttons.css"), "utf8");
const morph = buttons.slice(buttons.indexOf("THE ACTION MORPH"), buttons.indexOf("THE BUTTON SYSTEM (founder reference 55"));

describe("the action morph", () => {
  it("changes nothing for a button that does not ask", () => {
    const html = renderToString(<Button variant="primary" loading>Pay</Button>);
    expect(html).not.toContain("nf-btn--morph");
    expect(html).not.toContain("data-morph");
    /* A plain loading button draws the held ring, never a spinner. */
    expect(html).not.toContain("nf-spinner");
    expect(html).toContain("nf-btn__ring");
    expect(html).toContain("nf-btn__arc");
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("Pay");
  });

  it("bounds a plain loading button too: the ring and the line draw once and hold, nothing loops", () => {
    const plain = buttons.slice(buttons.indexOf('.nf-btn[data-loading="true"]::after {'), buttons.indexOf("THE ACTION MORPH"));
    expect(plain).toMatch(/nf-btn-loading var\(--nf-duration-deliberate\) var\(--nf-ease-standard\) both/);
    expect(plain).not.toMatch(/infinite|alternate/);
    expect(plain).toMatch(/\.nf-btn\[data-loading="true"\] \.nf-btn__ring \.nf-btn__arc \{\s*animation: nf-btn-arc-draw/);
  });

  it("collapses to the ring when loading, with no spinner and the label kept for the ear", () => {
    const html = renderToString(<Button variant="primary" morph loading>Pay</Button>);
    expect(html).toContain("nf-btn--morph");
    expect(html).toContain('data-morph="loading"');
    expect(html).not.toContain("nf-spinner");
    expect(html).toContain("nf-btn__arc");
    expect(html).toContain("Pay");
    expect(html).toContain('aria-busy="true"');
  });

  it("keeps a caller's own aria-busy rather than overwriting it", () => {
    /* `rest` is spread before the computed props, so the computed one must
       carry the caller's along (audit A7). */
    expect(renderToString(<Button aria-busy>Load more</Button>)).toContain('aria-busy="true"');
    expect(renderToString(<Button aria-busy="true">Load more</Button>)).toContain('aria-busy="true"');
    expect(renderToString(<Button>Load more</Button>)).not.toContain("aria-busy");
    expect(renderToString(<Button loading aria-busy={false}>Load more</Button>)).toContain('aria-busy="true"');
  });

  it("is done, and inert, until it settles", () => {
    const html = renderToString(<Button variant="primary" morph done>Pay</Button>);
    expect(html).toContain('data-morph="done"');
    expect(html).toMatch(/<button[^>]*disabled/);
  });

  it("never morphs an icon button", () => {
    const html = renderToString(<Button variant="icon" morph loading aria-label="Close" leadingIcon="close" />);
    expect(html).not.toContain("nf-btn--morph");
  });

  it("draws the arc once and holds: no infinite animation anywhere in the morph", () => {
    expect(morph).not.toMatch(/infinite/);
    expect(morph).toMatch(/to \{\s*stroke-dashoffset: 0\.25;/);
  });

  it("runs on the specified curves: whip out, land into the tick, a 1.04 pop over 180ms", () => {
    expect(morph).toMatch(/nf-btn-collapse var\(--nf-duration-fast\) var\(--nf-ease-whip\)/);
    expect(morph).toMatch(/nf-btn-tick-draw var\(--nf-duration-base\) var\(--nf-ease-entrance\)/);
    expect(morph).toMatch(/nf-btn-pop 180ms/);
    expect(morph).toMatch(/scale\(1\.04\)/);
  });

  it("sinks a text button one pixel on press", () => {
    expect(buttons).toMatch(/\.nf-btn:active:not\(:disabled\):not\(\[aria-disabled="true"\]\) \{\s*transform: translateY\(var\(--nf-press-sink\)\) scale\(var\(--nf-press-scale\)\);/);
  });
});
