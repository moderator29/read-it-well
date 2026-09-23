import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Item 4: the tombstone is drawn inside a conversation and nowhere else.
 *
 * This suite renders no component (the config runs server modules only), so
 * the rule is proved on the source: every file that can draw the "was
 * removed" line is named here, and each one is a conversation renderer. A
 * feed, a profile grid, a card or a search result that starts importing the
 * tombstone, or printing its sentence, fails this test.
 */

const SRC = fileURLToPath(new URL("../..", import.meta.url));

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      /* The fixture harness renders fixed props, not the product. */
      if (name === "(dev)" || name === "node_modules") continue;
      walk(path, out);
    } else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) {
      out.push(path);
    }
  }
  return out;
}

const files = walk(SRC).map((path) => ({
  path: relative(SRC, path).split(sep).join("/"),
  text: readFileSync(path, "utf8"),
}));

/** The renderers of a conversation: a post's thread and a comments sheet. */
const CONVERSATION = new Set([
  "app/(app)/post/[id]/ThreadView.tsx",
  "components/social/comments/CommentsSheet.tsx",
]);

describe("the tombstone lives only in a conversation", () => {
  it("only the thread view imports the Tombstone component", () => {
    const importers = files
      .filter((file) => /import\s*\{[^}]*\bTombstone\b[^}]*\}\s*from/.test(file.text))
      .map((file) => file.path);
    expect(importers).toEqual(["app/(app)/post/[id]/ThreadView.tsx"]);
  });

  it("only the tombstone and conversation renderers print the removed sentence", () => {
    const printers = files
      .filter((file) => /POST_COPY\.removed\b/.test(file.text))
      .map((file) => file.path)
      .filter((path) => path !== "components/social/feed/Tombstone.tsx");
    for (const path of printers) expect(CONVERSATION.has(path)).toBe(true);
  });

  it("a post card draws nothing for a removed post, and no tombstone", () => {
    const card = files.find((file) => file.path === "components/social/feed/PostCard.tsx");
    expect(card?.text).toMatch(/if \(post\.removed\) return null;/);
    expect(card?.text).not.toMatch(/<Tombstone\b/);
  });

  it("the thread view draws the tombstone only for a removed post", () => {
    const thread = files.find((file) => file.path === "app/(app)/post/[id]/ThreadView.tsx");
    expect(thread?.text).toMatch(/post\.removed \? \(\s*<Tombstone /);
  });
});
