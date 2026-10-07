import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/* The button system's stylesheets (reference 55, spec section 19): every
   material token answered in both themes, hover only for a fine pointer, and
   every kind with its pressed and disabled states. */
const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
const tokens = read("../../../../../packages/design-tokens/src/tokens.css");
const buttons = read("../../app/css/buttons.css");
const controls = read("../../app/css/controls.css");
const chips = read("../../app/css/chips.css");

const systemBlock = tokens.slice(tokens.indexOf("THE BUTTON SYSTEM (founder reference 55"));
const night = systemBlock.slice(0, systemBlock.indexOf(':root[data-theme="light"],'));
const paper = systemBlock.slice(systemBlock.indexOf(':root[data-theme="light"],'));
const names = (block: string) => new Set([...block.matchAll(/(--nf-act-[a-z0-9-]+)\s*:/g)].map((m) => m[1]));

describe("button system tokens", () => {
  it("defines the night set and answers the themed ones on paper", () => {
    const n = names(night);
    const p = names(paper);
    expect(n.size).toBeGreaterThan(30);
    for (const t of p) expect(n.has(t), `${t} has no night value`).toBe(true);
    for (const t of ["--nf-act-fill", "--nf-act-fill-press", "--nf-act-ring", "--nf-act-disabled-fill", "--nf-act-surface", "--nf-act-ink"]) {
      expect(p.has(t), `${t} is not answered on paper`).toBe(true);
    }
  });

  it("keeps the guide's brand blue", () => {
    expect(night).toMatch(/--nf-act-blue:\s*#0066FF;/);
  });

  /* A8, fifth audit: the old literal ramp (#1A75FF over #0066FF over #005CEB, its top 4.30:1 under white) kept
     painting selected segments, the pill and the switch's on layer after the primary had moved on. The rest and
     hover ramps every selected control reads are written from the brand blue, in both themes, with no literal
     colour that could drift from it; `action-fill.dom.test.tsx` measures the paint. */
  it("writes the action ramp from --nf-act-blue, never from literal stops", () => {
    for (const [theme, block] of [["night", night], ["paper", paper]] as const) {
      for (const token of ["--nf-act-fill", "--nf-act-fill-hover"]) {
        const value = block.match(new RegExp(`${token}:\\s*([^;]+);`))?.[1] ?? "";
        expect(value, `${theme} ${token}`).toMatch(/var\(--nf-act-blue\)/);
        expect(value, `${theme} ${token} names a literal colour`).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(/i);
      }
    }
  });

  it("every --nf-act token a stylesheet reads exists", () => {
    const defined = names(tokens);
    for (const css of [buttons, controls, chips]) {
      for (const m of css.matchAll(/var\((--nf-act-[a-z0-9-]+)\)/g)) expect(defined.has(m[1]), m[1]).toBe(true);
    }
  });
});

describe("button system rules", () => {
  const section = buttons.slice(buttons.indexOf("THE BUTTON SYSTEM (founder reference 55"));

  it("puts every hover behind a fine pointer", () => {
    const outside = section
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/@media \((?:hover: hover\) and \(pointer: fine|prefers-reduced-motion: reduce)\) \{[\s\S]*?\n  \}\n/g, "");
    expect(outside).not.toMatch(/:hover/);
  });

  it("gives every button kind a pressed and a disabled state", () => {
    for (const kind of ["primary", "glass", "quiet", "surface", "dropdown", "danger"]) {
      expect(section, `${kind} pressed`).toMatch(new RegExp(`nf-btn--${kind}[^{]*:active`));
    }
    expect(section).toMatch(/\.nf-btn:disabled:not\(\[data-loading="true"\]\)/);
  });

  it("animates only transform", () => {
    for (const m of section.matchAll(/transition:\s*([^;]+);/g)) {
      const value = m[1] ?? "";
      expect(value.split(",").every((part) => /^\s*(transform|width|none)\b/.test(part)), value).toBe(true);
    }
  });

  it("draws the controls the guide adds", () => {
    for (const cls of [".nf-qty", ".nf-action-tile", ".nf-switch", 'input[type="checkbox"]', 'input[type="radio"]']) {
      expect(controls).toContain(cls);
    }
    expect(chips).toContain(".nf-tag--spark");
    expect(buttons).toContain(".nf-btn--fab");
    expect(buttons).toContain(".nf-link-btn");
  });
});

describe("the soft-cornered rectangle (founder ruling, 30 September)", () => {
  const section = buttons.slice(buttons.indexOf("THE BUTTON SYSTEM (founder reference 55"));
  it("steps the corner with the size and keeps icon buttons round", () => {
    expect(tokens).toMatch(/--nf-radius-button:\s*var\(--nf-act-radius-md\);/);
    expect(section).toMatch(/\.nf-btn \{[^}]*border-radius: var\(--nf-act-radius-md\)/);
    expect(section).toMatch(/\.nf-btn--sm \{\s*border-radius: var\(--nf-act-radius-sm\)/);
    expect(section).toMatch(/\.nf-btn--lg \{\s*border-radius: var\(--nf-act-radius-lg\)/);
    expect(section).toMatch(/\.nf-btn--icon \{\s*border-radius: var\(--nf-radius-circle\)/);
    expect(section).not.toMatch(/radius-pill/);
  });
});
