import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The founder's rule of 23 September: an account's email address can never be
 * changed. This card draws the email as a fixed fact and never writes it.
 * (The server refusal is Session A's: scope request EMAIL-LOCK.)
 */
const source = readFileSync(
  join(process.cwd(), "src/components/app/account/ProfileIdentityCard.tsx"),
  "utf8",
);
const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

describe("ProfileIdentityCard: the email cannot be changed", () => {
  it("has no email input and no email writer", () => {
    expect(code).not.toMatch(/type="email"/);
    expect(code).not.toMatch(/updateEmail/);
    expect(code).not.toMatch(/save\(\{[^}]*email/);
  });

  it("saves the name, and only the name", () => {
    expect(code).toMatch(/save\(\{ name: next\.slice\(0, MAX_NAME\) \}\)/);
    const saves = code.match(/save\(\{[^}]*\}\)/g) ?? [];
    expect(saves).toHaveLength(1);
  });

  it("draws the email as text with the one plain line", () => {
    expect(code).toContain("Your email address cannot be changed.");
    expect(code).toMatch(/data-testid="identity-email"/);
    expect(code).not.toMatch(/support/i);
  });
});
