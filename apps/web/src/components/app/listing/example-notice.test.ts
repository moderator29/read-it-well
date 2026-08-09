import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { EXAMPLE_STATEMENT } from "@/lib/listings/syndication";

/**
 * THE DISCLOSURE, GUARDED BY SOURCE.
 *
 * These are source assertions rather than a render, and that is deliberate. The
 * thing that has to hold is not what the component looks like once, it is that
 * the disclosure cannot be quietly turned into something a person will not
 * read. Every rule below is one of the honesty requirements, expressed as the
 * shape of the code that would break it:
 *
 *   - the sentence is the shared constant, never retyped, so the card, the page
 *     and the crawler cannot drift apart;
 *   - the banned words never appear;
 *   - it is not gated behind a hover, a toggle or a disclosure;
 *   - it carries no action, because the database refuses every transaction
 *     against these rows;
 *   - every card renderer in the product mounts it.
 *
 * The last one is the one that actually caught something: `MapDock` is a full
 * property card that does not go through `ListingCard`, so a component-level
 * check would have passed while the map still showed an invented property with
 * a real area and a real price and said nothing.
 */

const SRC = join(process.cwd(), "src");
const read = (path: string) => readFileSync(join(SRC, path), "utf8");

const NOTICE = read("components/app/listing/ExampleNotice.tsx");

/** Every surface in the product that draws a property card. */
const CARD_RENDERERS = [
  "components/app/ListingCard.tsx",
  "components/app/search/MapDock.tsx",
] as const;

/** Banned by `agent-identity.spec.mjs`. "example" is the agreed word. */
const BANNED = ["demo", "sample", "preview", "not live"] as const;

describe("the example listing disclosure", () => {
  it("renders the one shared sentence rather than a copy of it", () => {
    expect(NOTICE).toContain("EXAMPLE_STATEMENT");
    // The words themselves must not be typed out anywhere in the component.
    expect(NOTICE).not.toContain("No such property is available");
  });

  it("uses the agreed word and none of the banned ones", () => {
    expect(EXAMPLE_STATEMENT.toLowerCase()).toContain("example");
    for (const word of BANNED) {
      expect(EXAMPLE_STATEMENT.toLowerCase()).not.toContain(word);
    }
  });

  it("is not behind a hover, a toggle or a collapsed region", () => {
    for (const marker of ["hover:", "aria-expanded", "line-clamp", "useState", "title="]) {
      expect(NOTICE).not.toContain(marker);
    }
  });

  it("offers no action, because the platform can honour none", () => {
    for (const marker of ["<button", "<Link", "<a ", "onClick"]) {
      expect(NOTICE).not.toContain(marker);
    }
  });

  it("is set at a readable tier rather than as a caption", () => {
    expect(NOTICE).toContain("nf-body");
    expect(NOTICE).not.toContain("nf-caption");
  });

  it("names no colour, so it survives both themes", () => {
    expect(NOTICE).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(NOTICE).not.toMatch(/\brgb\(|\bhsl\(/);
  });

  it.each(CARD_RENDERERS)("is mounted by %s, gated on isDemo", (path) => {
    const source = read(path);
    expect(source).toContain("ExampleNotice");
    expect(source).toMatch(/isDemo\s*&&\s*<ExampleNotice/);
  });
});
