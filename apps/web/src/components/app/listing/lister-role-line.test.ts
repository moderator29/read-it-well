import { describe, expect, it } from "vitest";
import { fillLister } from "./lister-role";
import { LISTING_ROLES, LISTING_ROLE_SENTENCE, LISTING_ROLE_FILTER_LABEL } from "@/lib/supply/roles";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * THE TEST THAT THE LAST ONE SHOULD HAVE BEEN, AND WHAT IT STILL CANNOT REACH.
 *
 * `lib/supply/roles.test.ts` asserts that `LISTING_ROLE_SENTENCE.owner` does
 * not contain `{name}` and that `LISTING_ROLE_FILTER_LABEL` is truthy for every
 * role. Both pass. BOTH PASSED WHILE THE TWO CONSTANTS HAD ZERO CONSUMERS
 * anywhere in the tree, and the track was read as having shipped three listing
 * badges on the strength of them. A test that asserts a constant exists is not
 * proof that a label is on a screen.
 *
 * WHAT THIS FILE ADDS. Two things the old test could not do. It proves the
 * FILLED sentence, which is the thing a reader actually sees and the thing that
 * breaks silently when somebody renames a placeholder. And it proves that the
 * screens MOUNT the component, by reading their own source, so deleting the
 * line from the card fails a test instead of passing one.
 *
 * WHAT THIS FILE STILL CANNOT DO, SAID PLAINLY RATHER THAN IMPLIED. It does not
 * render to markup. `apps/web/vitest.config.ts` aliases the bare specifier
 * `react` at `react.react-server.js`, and Vite matches a string alias by
 * PREFIX, so `react/jsx-dev-runtime` rewrites to a path inside a file and
 * cannot resolve. No component in this repository can be rendered under this
 * config, and the config is deliberate: it exists so that `cache` behaves under
 * test the way it behaves in the app. Changing it to render one component would
 * change the semantics of every server module in the suite. THE MARKUP LEVEL
 * PROOF THEREFORE BELONGS IN A PLAYWRIGHT SPEC AGAINST A RUNNING SERVER, and
 * until the listing READ carries `listing_role` there is no page to point one
 * at. That is recorded rather than papered over.
 */
describe("the sentence a reader actually sees", () => {
  it("names nobody for an owner, which is the whole offer", () => {
    expect(fillLister("owner")).toBe("Listed by the owner");
    expect(fillLister("owner", "Chidi Okeke")).toBe("Listed by the owner");
  });

  it("fills the agent's name into the agent sentence", () => {
    expect(fillLister("agent", "Chidi Okeke")).toBe("Listed by Chidi Okeke, agent");
  });

  it("fills the firm's name into the firm sentence", () => {
    expect(fillLister("firm", "Acme Properties Ltd")).toBe("Listed by Acme Properties Ltd");
  });

  it("says NOTHING rather than printing a template when no name reaches it", () => {
    for (const role of ["agent", "firm"] as const) {
      for (const name of [null, undefined, "", "   "]) {
        expect(fillLister(role, name)).toBeNull();
      }
    }
  });

  it("never lets a placeholder out, for any role and any name", () => {
    for (const role of LISTING_ROLES) {
      for (const name of [null, undefined, "", "  ", "A Name", "Acme Ltd"]) {
        const out = fillLister(role, name);
        if (out === null) continue;
        expect(out).not.toContain("{name}");
        expect(out).not.toContain("undefined");
        expect(out).not.toContain("null");
      }
    }
  });

  it("gives a different sentence for each of the three, which is the point", () => {
    const filled = LISTING_ROLES.map((r) => fillLister(r, "Acme Properties Ltd"));
    expect(new Set(filled).size).toBe(3);
  });
});

describe("the screens mount it, which is what the old green light could not see", () => {
  const read = (file: string) => readFileSync(join(__dirname, file), "utf8");

  it("the listing page's agent card renders the component", () => {
    const card = read("ListingAgentCard.tsx");
    expect(card).toContain("ListerRoleLine");
    /* Mounted, not merely imported. An unused import is what "shipped" looked
       like last time. */
    expect(card).toMatch(/<ListerRoleLine\b/);
    expect(card).toMatch(/listingRole/);
  });

  it("no screen and no component holds a second copy of the vocabulary", () => {
    /* A second copy anywhere is a defect: change the source of truth and the
       screen stops changing with it.
       COMMENTS ARE STRIPPED FIRST, and the first run of this test is why. It
       failed on the doc comment in `ListerRoleLine.tsx`, which QUOTES the three
       sentences in order to explain them. A comment that names a string is
       documentation; a string literal that reproduces it is the defect. The
       test has to be able to tell them apart or it fails honest work and
       teaches the next person to delete the explanation. */
    const sentences = Object.values(LISTING_ROLE_SENTENCE);
    const labels = Object.values(LISTING_ROLE_FILTER_LABEL);
    for (const file of ["ListerRoleLine.tsx", "ListingAgentCard.tsx", "lister-role.ts"]) {
      const literals = stringLiteralsIn(withoutComments(read(file)));
      for (const copy of [...sentences, ...labels]) {
        expect(literals, `${file} holds its own copy of "${copy}"`).not.toContain(copy);
      }
    }
  });

  it("the line is not drawn as a trust mark", () => {
    /* The verified badge means a checked human and nothing else. `listing_role`
       is a CLAIM until a member of staff dates it, so it may never borrow a
       tick, a shield or a badge shape. */
    const source = read("ListerRoleLine.tsx");
    const markup = source.slice(source.indexOf("return ("));
    expect(markup).not.toMatch(/UiIcon|BrandIcon|VerifiedAgentBadge|nf-badge/);
  });
});

/**
 * Every string literal in a source file.
 *
 * THE COPY RULE READS LITERALS AND NOT THE WHOLE FILE, and the second run of
 * this test is why. `LISTING_ROLE_FILTER_LABEL.agent` is the single word
 * "Agent", which appears inside the IDENTIFIER `ListingAgentCard` in every
 * file that mentions the card. A rule that cannot tell a hardcoded label from a
 * component's name is a rule that fires on correct code, and a test that fires
 * on correct code gets deleted rather than obeyed.
 */
function stringLiteralsIn(source: string): string[] {
  return (source.match(/"[^"\n]*"|'[^'\n]*'|`[^`]*`/g) ?? []).map((raw) => raw.slice(1, -1));
}

/** Source with every block and line comment removed, so the copy rule reads
    code rather than prose. */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
}
