import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { withoutComments } from "@/lib/copy/source-scan";

/**
 * /refunds's sign-in door brings the member back here through `withNext`
 * (lib/auth/next-link), which runs the destination through safeReturnPath;
 * `authHref` only encodes it (X2, Session 3 Round 4; the brief's rule).
 */
describe("/refunds: the sign-in door", () => {
  const code = withoutComments(readFileSync(join(__dirname, "page.tsx"), "utf8"));

  it("is built with withNext and comes back to /refunds", () => {
    expect(code).toContain('withNext("/sign-in", "/refunds")');
  });

  it("never builds an auth address by hand", () => {
    expect(code).not.toMatch(/\bauthHref\(/);
    expect(code).not.toMatch(/["'`]\/sign-in\?next=/);
  });
});
