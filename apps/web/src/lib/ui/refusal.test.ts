import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const src = (path: string) => readFileSync(join(process.cwd(), "src", path), "utf8");
const strip = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, "");

describe("the field's refusal is a transition, not a state (A8 SHOULD 3)", () => {
  it("the shake is keyed on data-refused, never on aria-invalid alone", () => {
    const css = strip(src("app/css/controls.css"));
    expect(css).toContain(".nf-field[data-refused]:not(.nf-auth .nf-field) {");
    expect(css).not.toMatch(/nf-field\[aria-invalid="true"\][^{]*\{\s*animation/);
  });

  it("the watcher marks only an attribute change to invalid, clears on end and on valid, and is mounted once with the details", () => {
    const code = strip(src("lib/ui/refusal.ts"));
    expect(code).toContain('attributeFilter: ["aria-invalid"]');
    expect(code).toContain("attributeOldValue: true");
    expect(code).toContain('record.oldValue === "true"');
    expect(code).toContain('event.animationName === "nf-field-refuse"');
    expect(strip(src("components/ui/DetailsHost.tsx"))).toContain("<RefusalHost />");
  });
});
