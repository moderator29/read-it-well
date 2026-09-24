import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * UI-02: /profile linked to /reviews, which no route serves, and every member
 * landed on a 404. Every literal in-app href in a component (`href="/..."`)
 * must resolve to a page or route handler under src/app (route groups
 * ignored, dynamic segments matching anything) or a literal redirect in
 * next.config.ts.
 */
const APP = __dirname;
const SRC = join(APP, "..");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else out.push(path);
  }
  return out;
}

/** Route patterns as segment lists, e.g. ["listing", "*"]. */
const ROUTES = walk(APP)
  .filter((f) => /[/\\](page|route)\.(tsx?|jsx?|mdx)$/.test(f))
  .map((f) =>
    relative(APP, f)
      .split(sep)
      .slice(0, -1)
      .filter((s) => !/^\(.*\)$/.test(s) && !s.startsWith("@"))
      .map((s) => (s.startsWith("[[...") ? "**?" : s.startsWith("[...") ? "**" : s.startsWith("[") ? "*" : s)),
  );

function resolves(href: string): boolean {
  const path = href.split(/[?#]/)[0] ?? "";
  const segs = path.split("/").filter(Boolean);
  return ROUTES.some((route) => {
    for (let i = 0; i < route.length; i += 1) {
      const r = route[i];
      if (r === "**" || r === "**?") return r === "**?" || segs.length > i;
      if (segs[i] === undefined) return false;
      if (r !== "*" && r !== segs[i]) return false;
    }
    return segs.length === route.length;
  });
}

/** Literal redirect sources in next.config.ts answer too (e.g. /support → /contact). */
const REDIRECTS = new Set(
  [...readFileSync(join(SRC, "..", "next.config.ts"), "utf8").matchAll(/source:\s*"(\/[^":*]*)"/g)].map((m) => m[1]),
);

const PUBLIC_FILES = new Set(readdirSync(join(SRC, "..", "public")).map((n) => `/${n}`));

describe("literal in-app links", () => {
  it("resolve to a route (the resolver itself works)", () => {
    expect(resolves("/profile")).toBe(true);
    expect(resolves("/listing/abc?x=1")).toBe(true);
    expect(resolves("/reviews")).toBe(false);
  });

  it("every href=\"/...\" in a component has a page behind it", () => {
    const dead: string[] = [];
    for (const file of walk(SRC).filter((f) => /\.tsx$/.test(f) && !/\.test\.tsx$/.test(f))) {
      const text = readFileSync(file, "utf8");
      for (const m of text.matchAll(/\bhref=["'](\/[^"'#?]*)(?:[?#][^"']*)?["']/g)) {
        const href = m[1] ?? "";
        if (href.startsWith("//") || PUBLIC_FILES.has(`/${href.split("/")[1]}`)) continue;
        if (!resolves(href) && !REDIRECTS.has(href)) dead.push(`${relative(SRC, file)}: ${href}`);
      }
    }
    expect(dead).toEqual([]);
  });
});
