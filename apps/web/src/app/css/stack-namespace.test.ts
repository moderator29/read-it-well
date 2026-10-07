/**
 * ONE STACK, ONE NAMESPACE (7 October 2026, the founder: "Featured stays is
 * broken"). The Property home's featured stack shipped as `.nf-stack__card`
 * with `position: absolute`, the name the Stays home's `SwipeStack` already
 * used for in-flow cards. Stylesheets are global once loaded, so the Stays
 * deck lost its height and every card drew as a sliver. Each stack now owns
 * its own prefix: `nf-stack` is `SwipeStack`'s alone, `nf-fstack` is
 * `FeaturedStack`'s alone.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(__dirname, "..", "..");

function cssFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return cssFiles(path);
    return name.endsWith(".css") ? [path] : [];
  });
}

describe("stack namespaces", () => {
  it("only SwipeStack's stylesheet styles .nf-stack__ selectors", () => {
    const owners = cssFiles(SRC)
      .filter((file) => /\.nf-stack__[a-z]/.test(readFileSync(file, "utf8")))
      .map((file) => relative(SRC, file));
    expect(owners).toEqual(["components/app/listing/swipe-stack.css"]);
  });

  it("only home.css styles the Property featured stack's .nf-fstack selectors", () => {
    const owners = cssFiles(SRC)
      .filter((file) => /\.nf-fstack/.test(readFileSync(file, "utf8")))
      .map((file) => relative(SRC, file));
    expect(owners).toEqual(["app/css/home.css"]);
  });
});
