import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";

/**
 * UX-23: one concept, one name. Becoming a lister had nine names ("Switch
 * role", "Switch profile", "Register as a supplier", "Agent Mode" and more).
 * The finding asked for one; PRODUCT.md section 7 names it: WORKSPACE (V-75),
 * with "Add a workspace" as the one door and "Your workspaces" as the switch.
 * `lib/i18n/workspace-terms.test.ts` walks every English string for the
 * retired synonyms; this holds the door itself and keeps "supplier" off it.
 */
describe("one name for listing on Vallo", () => {
  const t = getDictionary("en");

  it("the switch and the door", () => {
    expect(t.supply.switchTitle).toBe("Your workspaces");
    expect(t.supply.addTitle).toBe("Add a workspace");
    expect(t.supply.chooser.title).toBe("Add a workspace");
  });

  it("no supplier or listing account in the words a lister reads first", () => {
    const words = [
      t.supply.addTitle,
      t.supply.addMeaning,
      t.supply.empty,
      t.supply.chooser.title,
      t.supply.chooser.sub,
      t.supply.chooser.overviewSub,
    ].join(" ");
    expect(words).not.toMatch(/supplier|listing account/i);
  });

  it("the pages that link to the door say the same", () => {
    for (const file of ["app/(site)/contact/page.tsx", "app/(site)/help/page.tsx"]) {
      const text = readFileSync(join(process.cwd(), "src", file), "utf8");
      expect(text, file).not.toMatch(/>\s*Add a listing account\s*</);
      expect(text, file).not.toMatch(/supplier/i);
    }
  });
});
