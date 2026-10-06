import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { EXAMPLE_STATEMENT } from "@/lib/listings/syndication";
import { BANNED_IN_EXAMPLE_COPY, firstBannedPhrase } from "@/lib/copy/banned-phrases";
import { withoutComments } from "@/lib/copy/source-scan";

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

/**
 * A component's source with its prose taken out.
 *
 * EVERY ASSERTION IN THIS FILE IS MADE AGAINST THIS AND NOT AGAINST THE RAW
 * FILE, and the reason is the one that cost this platform a compliance record
 * elsewhere in the tree: a source assertion that reads comments is satisfied by
 * a comment. `expect(NOTICE).toContain("EXAMPLE_STATEMENT")` passed on the doc
 * block above the component as readily as on the component, so the disclosure
 * could have been deleted entirely and left a green suite behind, with the
 * paragraph explaining why it must never be deleted doing the work of proving
 * it had not been. The same went for every `not.toContain` below: a comment
 * mentioning `hover:` or `<button` failed a test about code that was clean.
 *
 * `withoutComments` keeps line numbers and does not mistake a URL or a regular
 * expression for a comment. It is the same reader the copy sweep uses.
 */
const read = (path: string) => withoutComments(readFileSync(join(SRC, path), "utf8"));

const NOTICE = read("components/app/listing/ExampleNotice.tsx");

/** Every surface in the product that draws a property card. */
const CARD_RENDERERS = [
  "components/app/ListingCard.tsx",
  "components/app/search/MapDock.tsx",
] as const;

/*
 * Banned by `agent-identity.spec.mjs` and by `PRODUCT.md` section 7. "example"
 * is the agreed word.
 *
 * The list used to be typed out here, and in four other specs, and every one of
 * the five was a private copy that agreed with the others by luck. It is one
 * list now, in `lib/copy/banned-phrases`, widened with the schedule promises
 * that walked past all five. See F2-003.
 */
const BANNED = BANNED_IN_EXAMPLE_COPY;

describe("the example listing disclosure", () => {
  it("renders the one shared sentence rather than a copy of it", () => {
    expect(NOTICE).toContain("EXAMPLE_STATEMENT");
    // The words themselves must not be typed out anywhere in the component.
    expect(NOTICE).not.toContain("No such property is available");
  });

  it("uses the agreed word and none of the banned ones", () => {
    expect(EXAMPLE_STATEMENT.toLowerCase()).toContain("example");
    expect(firstBannedPhrase(EXAMPLE_STATEMENT, BANNED)).toBeNull();
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

  /*
   * D24 (the founder, 6 October) REVERSED THE RULE THIS BLOCK USED TO HOLD.
   *
   * It asserted that every card renderer SAYS something visible about an
   * example listing. The founder's ruling is that the visible "example"
   * labelling comes off the listing surfaces, and that the danger was never the
   * missing word but fabricated trust. So the rule is now the other half: a
   * card renderer still READS `isDemo`, and reads it to WITHHOLD trust (no
   * Verified mark, no rating on an example row), never to label. The notice
   * and the example badge may not appear on a card at all.
   */
  it.each(CARD_RENDERERS)("withholds trust on an example listing and labels nothing in %s", (path) => {
    const source = read(path);
    expect(source).toContain("isDemo");
    expect(source).not.toMatch(/<ExampleNotice\b/);
    expect(source).not.toContain("nf-badge--example");
    /* The Verified mark is gated on the row not being an example. */
    expect(source).toMatch(/verified\s*&&\s*!listing\.isDemo/);
  });

  /*
   * THE LANDING'S CARDS SAY IT TOO (UIUX item 6). The landing prints real
   * catalogue rows in the AI showcase and the two worlds room through
   * `ListingMini`, fed by `toMiniListing`, which did not carry `isDemo`: an
   * example flat read as live inventory on the front page. The mapper now
   * carries it, and the card swaps its market badge for the Example mark.
   */
  it("says Example on the landing's listing cards", () => {
    const mapper = read("lib/site/listing-card.ts");
    expect(mapper).toMatch(/example:\s*listing\.isDemo\s*===\s*true/);
    const mini = read("components/site/landing/ListingMini.tsx");
    expect(mini).toMatch(/listing\.example\s*\?\s*\(\s*<span className="nf-badge nf-badge--example/);
    expect(mini).toContain("exampleLabel");
  });

  /*
   * The landing's hands-on deck draws four product moments that are
   * illustrations, not inventory; each moment carries the Example mark.
   */
  it("marks every moment in the landing's hands-on deck as an example", () => {
    const room = read("components/site/landing/StackRoom.tsx");
    expect(room).toContain("nf-badge--example");
    const moments = room.match(/moment:\s*\(/g)?.length ?? 0;
    const marks = room.match(/\{example\}/g)?.length ?? 0;
    expect(moments).toBeGreaterThan(0);
    expect(marks).toBe(moments);
  });

  /*
   * The detail pages no longer say it either (D24). What they must do instead
   * is draw every trust signal through `earnedTrust`, the presentation-side
   * lock that clears badge, dates and rating on an example row.
   */
  it.each([
    "app/(app)/listing/[id]/page.tsx",
    "app/(app)/stay/[id]/StayDetailView.tsx",
    "app/(app)/restaurant/[id]/RestaurantFace.tsx",
    "components/app/listing/ListingMoveInBlock.tsx",
    "components/app/listing/ListingHandoffShell.tsx",
  ])("labels nothing as an example on %s", (path) => {
    const source = read(path);
    expect(source).not.toMatch(/<ExampleNotice\b/);
    expect(source).not.toContain("nf-badge--example");
    expect(source).not.toMatch(/tone="example"/);
  });

  it("draws the listing page's trust through earnedTrust", () => {
    const page = read("app/(app)/listing/[id]/page.tsx");
    expect(page).toContain("withEarnedTrust(");
    expect(page).toContain("earnedTrust(");
  });
});
