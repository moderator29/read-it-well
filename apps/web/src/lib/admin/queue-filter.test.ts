import { describe, expect, it } from "vitest";

import { orSafe } from "./queue-filter";

/**
 * `.or()` takes a PostgREST filter EXPRESSION, not a value, and that grammar is
 * comma-delimited. Six admin queries interpolated an operator's search term
 * straight into one, so an ordinary term like "lagos, ikeja" ended the
 * condition halfway through and a term containing `)` closed the group.
 *
 * These are character-level tests on purpose. The thing that broke was one
 * character, and a test that only checked "does it still find lagos" would have
 * passed on the broken version.
 */
describe("orSafe", () => {
  it("wraps the value so a comma cannot end the condition", () => {
    expect(orSafe("%lagos, ikeja%")).toBe('"%lagos, ikeja%"');
  });

  it("escapes a double quote so the quoting cannot be closed early", () => {
    expect(orSafe('a "quoted" place')).toBe('"a \\"quoted\\" place"');
  });

  it("escapes a backslash BEFORE the quotes, or the escape escapes itself", () => {
    expect(orSafe("back\\slash")).toBe('"back\\\\slash"');
    /* The ordering is the whole trick. Replacing quotes first would turn `\"`
       into `\\"`, whose backslash then pairs with the one the second pass adds
       and leaves the quote live. */
    expect(orSafe('\\"')).toBe('"\\\\\\""');
  });

  it("contains the grouping characters of the grammar itself", () => {
    const hostile = "x)or(id.gt.0";
    const out = orSafe(hostile);
    expect(out.startsWith('"')).toBe(true);
    expect(out.endsWith('"')).toBe(true);
    /* Every quote inside the wrapper is escaped, so the first unescaped quote
       is the closing one. That is what makes the parentheses inert. */
    expect(out.slice(1, -1).replace(/\\./g, "")).not.toContain('"');
  });

  it("leaves an ordinary term alone apart from the wrapper", () => {
    expect(orSafe("%lagos%")).toBe('"%lagos%"');
  });
});
