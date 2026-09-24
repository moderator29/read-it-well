import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";

/**
 * SUP-13. The owner form promised "We check who you are before anything is
 * published", and nothing checks identity before a publish: approval leaves
 * the verification tier at 0. What is enforced is that a person decides the
 * application (reviewAgentApplication requires an admin) and publishes every
 * listing (listings_00_guard_owner_write refuses a member's own publish,
 * probe sup-p2-03). The sentence now says that, in every locale.
 */
const LOCALES = join(process.cwd(), "..", "..", "packages", "i18n", "src", "locales");

describe("the owner form's assurance (SUP-13)", () => {
  it("says what is enforced: a person reads the application and every listing", () => {
    const own = getDictionary("en").supply.register.owner;
    expect(own.you.assurance).toBe(
      "A person at Vallo reads your application, and every listing, before anything is published.",
    );
  });

  it.each(["en.ts", "ha.ts", "ig.ts", "yo.ts"])("no longer promises an identity check in %s", (file) => {
    const source = readFileSync(join(LOCALES, file), "utf8");
    expect(source).not.toContain("We check who you are before anything is published");
    expect(source).not.toContain("Muna duba ko wanene kai kafin a wallafa");
    expect(source).not.toContain("Anyị na-enyocha onye ị bụ tupu e bipụta");
    expect(source).not.toContain("A máa ń ṣàyẹ̀wò ẹni tí o jẹ́ kí a tó tẹ");
  });
});
