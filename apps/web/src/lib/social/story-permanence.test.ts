import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { stringLiterals } from "@/lib/copy/source-scan";

/**
 * A story is not ephemeral: nothing expires it (stories-schema.ts, and no
 * scheduled job touches public.stories). The copy says "It stays up", which
 * is true, so no screen and no glossary entry may say a story expires.
 */
const SRC = join(process.cwd(), "src");
const read = (p: string) => readFileSync(join(SRC, p), "utf8");

describe("stories say what the mechanism does", () => {
  it.each([
    "lib/social/stories-actions.ts",
    "lib/social/stories-schema.ts",
    "components/social/story/StoryComposer.tsx",
    "app/(app)/stories/new/page.tsx",
  ])("%s never tells a person a story expires", (file) => {
    for (const literal of stringLiterals(read(file))) {
      expect(literal.text).not.toMatch(/\bexpire[sd]?\b/i);
    }
  });

  it("the product glossary agrees", () => {
    const product = readFileSync(join(process.cwd(), "../../docs/PRODUCT.md"), "utf8");
    const row = product.split("\n").find((line) => line.startsWith("| **Story** |")) ?? "";
    expect(row).not.toMatch(/that expires/i);
  });
});
