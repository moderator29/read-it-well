import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * UI-08: the feed's reading text follows the in-app Text size setting, which
 * scales the root font size. A pixel size cannot follow it, so none is left
 * in the feed's type, and the main reading sizes are on the type scale.
 */
const css = readFileSync(join(__dirname, "social-feed.css"), "utf8");

/** Every block for a selector, joined: a selector can be declared in parts. */
function rule(selector: string): string {
  const blocks: string[] = [];
  let at = css.indexOf(`  ${selector} {`);
  while (at > -1) {
    blocks.push(css.slice(at, css.indexOf("}", at)));
    at = css.indexOf(`  ${selector} {`, at + 1);
  }
  expect(blocks.length, selector).toBeGreaterThan(0);
  return blocks.join("\n");
}

describe("feed text follows Text size", () => {
  it("has no font-size or line-height in px", () => {
    expect(css.match(/font-size:\s*[\d.]+px/g) ?? []).toEqual([]);
    expect(css.match(/line-height:\s*[\d.]+px/g) ?? []).toEqual([]);
  });

  it("puts the post body, handle, time, counts and ring names on the type scale", () => {
    /* The body is the largest type on the card since the premium pass (D72):
       what a post is for is the biggest thing on it. */
    expect(rule(".nf-post__body")).toContain("font-size: var(--nf-text-body)");
    expect(rule(".nf-act-pill")).toContain("font-size: var(--nf-text-caption)");
    expect(rule(".nf-post__handle")).toContain("font-size: var(--nf-text-caption)");
    expect(rule(".nf-post__when")).toContain("font-size: var(--nf-text-caption)");
    expect(rule(".nf-post__act")).toContain("font-size: var(--nf-text-caption)");
    expect(rule(".nf-story-ring__name")).toContain("font-size: var(--nf-text-overline)");
  });
});
