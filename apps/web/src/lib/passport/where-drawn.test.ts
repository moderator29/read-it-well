import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("where the passport is drawn (the Vallo passport, 13 October 2026)", () => {
  const root = join(__dirname, "..", "..");
  const read = (p: string) => readFileSync(join(root, p), "utf8");

  it("is offered in the conversation's options sheet and never read for the lister in the header", () => {
    const page = read("app/(app)/messages/[id]/page.tsx");
    expect(page).toContain("readMyPassportOn()");
    expect(page).not.toContain("readThreadPassport");
    expect(page).not.toContain("readPassportShareState");
    expect(read("app/(app)/messages/[id]/ThreadView.tsx")).not.toContain('data-testid="thread-passport"');
    expect(read("app/(app)/messages/[id]/ThreadOptionsSheet.tsx")).toContain("<PassportThreadRows");
  });

  it("has a settings page with a loading state, reached from the hub", () => {
    expect(read("app/(app)/settings/passport/page.tsx")).toContain("<PassportSettings");
    expect(read("app/(app)/settings/passport/loading.tsx")).toContain("LoadingShell");
    expect(read("app/(app)/settings/SettingsHub.tsx")).toContain('href="/settings/passport"');
  });
});

describe("the old rule is gone from the first-run explainer", () => {
  it("no longer says it is off until turned on or shown only in chosen conversations", () => {
    const first = readFileSync(join(__dirname, "..", "..", "components/app/feature-onboarding/first-runs.ts"), "utf8");
    expect(first).toContain("t.passportV2.firstRun");
    expect(first).not.toContain("trustVisible.passport.offNote");
  });
});

describe("the old renter passport is gone", () => {
  const root = join(__dirname, "..", "..");
  it("leaves no component, action or read of it in the tree", () => {
    for (const path of [
      "components/app/account/PassportCredential.tsx",
      "components/app/account/PassportShareButton.tsx",
      "lib/trust/passport.ts",
      "lib/trust/passport-actions.ts",
      "lib/trust/passport-read.ts",
    ]) {
      expect(() => readFileSync(join(root, path), "utf8")).toThrow();
    }
  });
});
