import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StatusBadge, statusBadgeClass } from "./StatusBadge";

/* The shared status badge (SW-C6): one material in chips.css, five tones, a
   rounded rectangle on the 6px corner with an 11px floor on the type. */
const chips = readFileSync(fileURLToPath(new URL("../../app/css/chips.css", import.meta.url)), "utf8");
const tokens = readFileSync(
  fileURLToPath(new URL("../../../../../packages/design-tokens/src/tokens.css", import.meta.url)),
  "utf8",
);

function rule(selectorStart: string): string {
  const at = chips.indexOf(selectorStart);
  expect(at, selectorStart).toBeGreaterThan(-1);
  return chips.slice(at, chips.indexOf("}", at));
}

describe("the shared status badge (SW-C6)", () => {
  it("writes the shared class and the tone, and nothing of its own", () => {
    expect(statusBadgeClass({ tone: "success" })).toBe("nf-badge nf-badge--success");
    expect(statusBadgeClass({ tone: "pending", size: "md", className: "extra" })).toBe(
      "nf-badge nf-badge--pending nf-badge--md extra",
    );
    expect(renderToStaticMarkup(createElement(StatusBadge, { tone: "error", live: true }, "Failed"))).toBe(
      '<span role="status" class="nf-badge nf-badge--error">Failed</span>',
    );
  });

  it("has a material rule for every tone it offers", () => {
    for (const tone of ["success", "pending", "error", "info", "neutral"]) {
      expect(chips).toContain(`.nf-badge--${tone}`);
    }
  });

  it("is a rounded rectangle and never a capsule: the 6px corner on a 20px badge is under 0.35", () => {
    const material = rule(".nf-badge,\n  .nf-count-badge,");
    expect(material).toContain("border-radius: var(--nf-radius-xs)");
    const xs = Number(/--nf-radius-xs:\s*(\d+)px/.exec(tokens)?.[1]);
    expect(xs).toBe(6);
    expect(xs / 20).toBeLessThan(0.35);
    expect(material).toContain("font-size: max(0.75rem,");
  });

  it("paints the pill through the badge's tone classes, not an inline fill", () => {
    const pill = readFileSync(fileURLToPath(new URL("./StatusPill.tsx", import.meta.url)), "utf8");
    expect(pill).toContain('warning: "nf-badge--pending"');
    expect(pill).toContain('danger: "nf-badge--error"');
    expect(pill).toContain("TONE_CLASS[tone]");
    expect(pill).not.toContain("state-warning-surface");
  });
});
