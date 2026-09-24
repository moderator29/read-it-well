import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/** OPS-17: soft 404s. */
describe("a missing page is a real 404", () => {
  it("the not-found page tells crawlers not to index it", async () => {
    const source = readFileSync("src/app/not-found.tsx", "utf8");
    expect(source).toContain("robots: { index: false, follow: false }");
  });

  it("a missing listing is refused in its metadata, before the body streams", () => {
    const page = readFileSync("src/app/(app)/listing/[id]/page.tsx", "utf8");
    const meta = page.slice(page.indexOf("export async function generateMetadata"));
    const body = meta.slice(0, meta.indexOf("\n}\n"));
    expect(body).toMatch(/if \(!listing\) notFound\(\);\s+return listingMetadata/);
  });
});
