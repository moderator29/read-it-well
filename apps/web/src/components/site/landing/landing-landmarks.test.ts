import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Every chapter of the landing is one `<section aria-labelledby>`, which is
 * already a named landmark. A second `role="region"` inside a chapter that is
 * named after the chapter repeats a landmark's role and name, which axe reports
 * as landmark-unique on every locale and theme. A scroller inside a chapter is
 * a named group instead.
 */
describe("the landing's landmarks", () => {
  it("draws no role=region inside a chapter, and every chapter section is named by its own heading", () => {
    const files = readdirSync(__dirname).filter((name) => name.endsWith(".tsx") && !name.includes(".test."));
    for (const name of files) {
      const source = readFileSync(join(__dirname, name), "utf8");
      expect(source, name).not.toMatch(/role="region"/);
      for (const tag of source.match(/<section[^>]*data-chapter="[^"]+"[^>]*>/g) ?? []) {
        expect(tag, name).toMatch(/aria-labelledby="[^"]+"/);
      }
    }
  });
});
