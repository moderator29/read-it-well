import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * UX-25 (batch 4 review advisory): the Terms and /about said every listing
 * has a real, approved person behind it, while most listings are examples
 * published by Vallo. Both now say what is true and name the examples.
 */
const src = (p: string) => readFileSync(join(process.cwd(), "src", p), "utf8").replace(/\s+/g, " ");

describe("where the listings come from, said truly", () => {
  it("the Terms", () => {
    const terms = src("lib/legal/terms.tsx");
    expect(terms).not.toMatch(/Everything on \{COMPANY_TRADING_NAME\} was listed/);
    expect(terms).not.toMatch(/always somebody to message/);
    expect(terms).toContain("an example cannot be rented, bought or booked");
  });

  it("/about", () => {
    const about = src("app/(site)/about/page.tsx");
    expect(about).not.toContain("Every listing was put up by a named person");
    expect(about).toContain("the ones marked Example show how Vallo works and cannot be rented or booked");
  });
});
