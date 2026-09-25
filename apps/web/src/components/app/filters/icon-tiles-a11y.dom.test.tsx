/**
 * Track J: the filter drawer's icon tiles say what they are to assistive
 * technology. A pick-one group is a radiogroup of radios with one tab stop; a
 * pick-any group is a group of checkboxes, each its own stop; every tile has
 * a text name, and the glyphs are hidden from the accessibility tree.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, describe, expect, it } from "vitest";
import { axe, closeAxe, hasBrowser } from "@/lib/a11y/axe";
import { IconTiles } from "./IconTiles";

afterAll(closeAxe);

const KINDS = [
  { value: "all", label: "All", icon: "grid" },
  { value: "apartment", label: "Apartments", icon: "building-apartment" },
  { value: "land", label: "Plots", icon: "land-plot" },
] as const;

describe("IconTiles semantics", () => {
  it("single is a radiogroup with aria-checked and exactly one tab stop", () => {
    const html = renderToStaticMarkup(
      <IconTiles label="Property type" mode="single" testPrefix="k" selected={["apartment"]} onToggle={() => {}} options={KINDS} />,
    );
    expect(html).toMatch(/role="radiogroup"[^>]*aria-label="Property type"/);
    expect(html.match(/role="radio"/g)).toHaveLength(3);
    expect(html.match(/aria-checked="true"/g)).toHaveLength(1);
    expect(html.match(/tabindex="0"/gi)).toHaveLength(1);
    expect(html).toMatch(/aria-checked="true" tabindex="0"[^>]*data-testid="k-apartment"/i);
  });

  it("multi is a group of checkboxes, every one reachable by Tab", () => {
    const html = renderToStaticMarkup(
      <IconTiles label="Space" mode="multi" testPrefix="s" selected={["all", "land"]} onToggle={() => {}} options={KINDS} />,
    );
    expect(html).toMatch(/role="group"[^>]*aria-label="Space"/);
    expect(html.match(/role="checkbox"/g)).toHaveLength(3);
    expect(html.match(/aria-checked="true"/g)).toHaveLength(2);
    expect(html.match(/tabindex="0"/gi)).toHaveLength(3);
  });

  it("draws no ink of its own: every glyph is currentColor", () => {
    const html = renderToStaticMarkup(
      <IconTiles label="Space" mode="multi" testPrefix="s" selected={[]} onToggle={() => {}} options={KINDS} />,
    );
    expect(html).not.toMatch(/fill="#|stroke="#/);
    expect(html).toContain('stroke="currentColor"');
  });
});

describe.skipIf(!hasBrowser && !process.env.CI)("IconTiles (axe)", () => {
  it("passes axe's ARIA and name rules in both modes", async () => {
    for (const mode of ["single", "multi"] as const) {
      const html = renderToStaticMarkup(
        <IconTiles label="Property type" mode={mode} testPrefix="k" selected={["all"]} onToggle={() => {}} options={KINDS} />,
      );
      expect(
        await axe(html, { rules: ["aria-allowed-attr", "aria-required-attr", "aria-required-children", "aria-required-parent", "button-name", "aria-allowed-role"] }),
      ).toEqual([]);
    }
  });
});
