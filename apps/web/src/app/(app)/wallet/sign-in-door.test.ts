import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { withoutComments } from "@/lib/copy/source-scan";

/**
 * /wallet's sign-in door brings the member back here through `withNext`
 * (lib/auth/next-link), like every money page.
 */
describe("/wallet: the sign-in door", () => {
  const code = withoutComments(readFileSync(join(__dirname, "page.tsx"), "utf8"));

  it("is built with withNext and comes back to /wallet", () => {
    expect(code).toContain('withNext("/sign-in", "/wallet")');
  });

  it("never builds an auth address by hand", () => {
    expect(code).not.toMatch(/\bauthHref\(/);
    expect(code).not.toMatch(/["'`]\/sign-in\?next=/);
  });
});
