import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * UI-19: the viewport's overscroll behaviour comes from the root element only,
 * so the no-rubber-band rule sits on `html`, not on `body`.
 */
describe("the rubber-band rule reaches the viewport", () => {
  const css = readFileSync(join(__dirname, "base.css"), "utf8");
  /** Every top-level block for a selector, joined. */
  const block = (selector: string) => {
    const out: string[] = [];
    const re = new RegExp(`^${selector} \\{`, "gm");
    let m: RegExpExecArray | null;
    while ((m = re.exec(css))) out.push(css.slice(m.index, css.indexOf("}", m.index)));
    expect(out.length, selector).toBeGreaterThan(0);
    return out.join("\n");
  };
  it("is on html and not on body", () => {
    expect(block("html")).toContain("overscroll-behavior-y: none");
    expect(block("body")).not.toContain("overscroll-behavior-y");
  });
});
