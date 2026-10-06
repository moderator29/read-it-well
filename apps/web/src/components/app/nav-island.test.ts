import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/*
 * The navigation upgraded in place (Session 3, Stage 2; north star sections
 * 6 and 15.5). The dock and the rail keep their slots and structure; these
 * pin the upgrade: the Island material, the spring, 12px/600 labels, cyan
 * counts, the 52px centre turning a quarter into its own close, the current
 * row's bar-and-tint (never a glow) and the collapsed 72px rail.
 */
const APP = join(__dirname, "../../app");
const css = readFileSync(join(APP, "css/nav-island.css"), "utf8");
const globals = readFileSync(join(APP, "globals.css"), "utf8");
const rail = readFileSync(join(__dirname, "AppRail.tsx"), "utf8");
const tree = readFileSync(join(__dirname, "NavTree.tsx"), "utf8");
const dock = readFileSync(join(__dirname, "CreateDock.tsx"), "utf8");

const rule = (selector: string) => {
  const at = css.indexOf(`${selector} {`);
  expect(at, selector).toBeGreaterThan(-1);
  return css.slice(at, css.indexOf("}", at));
};

describe("the navigation partial", () => {
  it("loads after the partials it answers and before data saver", () => {
    const order = ["./css/shell-m.css", "./css/light.css", "./css/brand-glass.css", "./css/nav-island.css", "./css/data-saver.css"];
    const at = order.map((f) => globals.indexOf(`@import "${f}"`));
    for (const i of at) expect(i).toBeGreaterThan(-1);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
  });

  it("never drops below 12px or uses a weight off the scale", () => {
    const body = css.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(body).not.toMatch(/font-weight:\s*(?:650|700|750|800)/);
    expect(body).not.toMatch(/font-size:\s*0\.6/);
  });
});

describe("the dock", () => {
  it("is an Island on the 16px blur, and one edge by day", () => {
    expect(css).toContain("backdrop-filter: blur(var(--nf-tier-island-blur))");
    expect(css).toMatch(/border-color: transparent;\s*box-shadow: var\(--nf-tier-island-shadow\);/);
  });

  it("springs the pill on drift 240ms and sets the chosen word at 12px/600", () => {
    expect(rule(".nf-tabbar .nf-tab")).toContain("flex-grow var(--nf-duration-base) var(--nf-ease-spring)");
    const label = rule(".nf-tabbar .nf-tab__label");
    expect(label).toContain("font-size: var(--nf-text-overline)");
    expect(label).toContain("font-weight: 600");
  });

  it("draws a 52px centre that turns a quarter into its own close", () => {
    expect(rule(".nf-dock-plus")).toMatch(/width: 3\.25rem;\s*height: 3\.25rem;/);
    expect(css).toMatch(/\[aria-expanded="true"\] \.nf-dock-plus \{\s*transform: rotate\(90deg\);/);
    expect(dock).toContain("nf-dock-plus__glyph--close");
  });

  it("counts in cyan, never red or orange", () => {
    const unread = rule(".nf-dockmore__unread");
    expect(unread).toContain("var(--nf-count-fill)");
    expect(unread).not.toMatch(/spark|error|rose/);
  });
});

describe("the side navigation", () => {
  it("marks the current row with a 3px bar and a tint, and no glow", () => {
    expect(css).toMatch(/\.nf-nav \.nf-nav__row--on::before \{[^}]*width: 3px;/);
    const on = rule(".nf-nav .nf-nav__row--on,\n  .nf-nav--drawer .nf-nav__row--on");
    expect(on).toContain("box-shadow: none");
    expect(on).toContain("var(--nf-brand-tint-2)");
  });

  it("collapses to 72px on the desktop rail, remembered on the device in try/catch", () => {
    expect(css).toMatch(/\.nf-nav--rail\[data-collapsed\] \{\s*width: 4\.5rem;/);
    expect(css).toMatch(/:root\[data-rail="collapsed"\] \{\s*--nf-rail-width: 4\.5rem;/);
    expect(rail).toMatch(/try \{\s*return window\.localStorage\.getItem/);
    expect(tree).toContain("title={collapsed ? item.label : undefined}");
  });

  it("keeps the workspace coin on its dark ground by day", () => {
    expect(css).toMatch(/:root\[data-theme="light"\] \.nf-nav \.nf-side-switch__coin \{\s*background: var\(--nf-surface-artwork\);/);
  });
});
