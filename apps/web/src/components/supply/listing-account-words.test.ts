import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";

/**
 * UX-23: one concept, one name. Becoming a lister is a "listing account",
 * the switch is "Switch mode", and "supplier" and "workspace" no longer reach
 * a person on the doors that lead to listing.
 */
describe("one name for listing on Vallo", () => {
  const t = getDictionary("en");

  it("the switch and the door", () => {
    expect(t.supply.switchTitle).toBe("Switch mode");
    expect(t.supply.switchTrigger).toBe("Switch mode");
    expect(t.supply.addTitle).toBe("Add a listing account");
    expect(t.supply.chooser.title).toBe("Add a listing account");
  });

  it("no supplier or workspace in the words a lister reads first", () => {
    const words = [
      t.supply.addTitle,
      t.supply.addMeaning,
      t.supply.empty,
      t.supply.chooser.title,
      t.supply.chooser.sub,
      t.supply.chooser.overviewSub,
    ].join(" ");
    expect(words).not.toMatch(/supplier|workspace/i);
  });

  it("the pages that link to the door say the same", () => {
    for (const file of ["app/(site)/contact/page.tsx", "app/(site)/help/page.tsx", "components/host/StaysDoors.tsx"]) {
      const text = readFileSync(join(process.cwd(), "src", file), "utf8");
      expect(text, file).not.toMatch(/>\s*Add a workspace\s*</);
      expect(text, file).not.toContain("Add a workspace from your profile");
    }
  });
});
