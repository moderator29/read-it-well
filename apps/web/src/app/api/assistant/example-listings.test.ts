import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/*
 * THE ASSISTANT IS A PUBLICATION SURFACE, AND IT WAS THE ONE NOBODY LISTED.
 *
 * The example-listing sweep sealed four places a property could escape to: the
 * sitemap, the JSON-LD, the Open Graph card and email. The assistant slipped
 * through all of it, because it is not a page and a chat reply does not look
 * like publishing. It is the most consequential of the five. The others display
 * a property and let a reader judge it. This one RECOMMENDS one, in a sentence,
 * with a naira price and a link, to somebody who asked for help finding a home.
 *
 * These tests are source constraints rather than behavioural tests, and that is
 * a deliberate limitation worth stating. The route cannot be imported here: it
 * needs an Anthropic key, a Supabase client and a streaming response, and the
 * vitest config aliases React at its server entry so nothing in the app tree
 * that touches JSX is importable anyway. Asserting on the source is weaker than
 * asserting on behaviour and it is far stronger than nothing, because the
 * failure this guards against is somebody deleting a filter, not the filter
 * behaving oddly.
 */

const ROUTE = readFileSync(
  join(process.cwd(), "src/app/api/assistant/route.ts"),
  "utf8",
);

describe("the assistant cannot recommend a property that does not exist", () => {
  it("excludes example listings from every catalogue search it runs", () => {
    /*
     * Counted rather than merely present. There are two search calls, the
     * narrow one and the widened fallback when free text over-restricts, and
     * an exclusion on only the first would leak on exactly the queries that
     * matter: the ones where the person's own words found nothing.
     */
    const searches = ROUTE.match(/repo\.search\(\{[^}]*\}/g) ?? [];
    expect(searches.length).toBeGreaterThanOrEqual(3);

    const withoutExclusion = searches.filter((call) => !call.includes("excludeDemo"));

    /*
     * EXACTLY ONE, not "at most one", and the difference is the whole test.
     *
     * The single permitted search that sees example listings is the probe
     * asking whether they were the ONLY match, which cannot answer that
     * question while excluding them. Anything above one means a search that
     * feeds a recommendation has lost its filter. Anything below one means the
     * probe has gained an exclusion and now always reports nothing, which
     * would silently turn the honest "these are examples" answer back into a
     * bare "I found nothing" without failing any other assertion here.
     */
    expect(withoutExclusion).toHaveLength(1);
  });

  it("refuses to compare an example listing, even given its id directly", () => {
    // compare_listings takes ids as input, so an id can arrive from a stale
    // turn or be invented. The exclusion has to sit where the row is read.
    expect(ROUTE).toMatch(/row\?\.isDemo/);
  });

  it("tells the model what to do when examples were the only match", () => {
    // "I found nothing" is true and is a worse answer than the truth, because
    // the search page visibly shows results for the same query.
    expect(ROUTE).toContain("exampleOnly");
    expect(ROUTE).toMatch(/example listings that Vallo uses to illustrate/);
  });

  it("forbids describing them rather than leaving it to the model's judgement", () => {
    // The tempting move from "these are examples" is to describe them
    // helpfully. The instruction has to close that door explicitly.
    expect(ROUTE).toMatch(/Do NOT describe, name, price or recommend/);
  });

  it("keeps the banned words out of anything a reader could see", () => {
    // `agent-identity.spec.mjs` bans these in user-facing copy. "example" is
    // the agreed word and the note above uses it.
    const note = /The only properties matching this search[^"]*/.exec(ROUTE)?.[0] ?? "";
    expect(note.length).toBeGreaterThan(0);
    expect(note).not.toMatch(/\b(demo|sample|preview|not live)\b/i);
  });
});
