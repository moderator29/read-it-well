import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { clearListingDrafts, listingDraftKey } from "./listing-draft-storage";

function memoryStorage(entries: Record<string, string>) {
  const map = new Map(Object.entries(entries));
  return {
    get length() {
      return map.size;
    },
    key: (i: number) => [...map.keys()][i] ?? null,
    removeItem: (key: string) => void map.delete(key),
    keys: () => [...map.keys()].sort(),
  };
}

describe("SUP-16: the listing draft on this device", () => {
  it("is keyed by the account, and there is none without one", () => {
    expect(listingDraftKey("u1")).toBe("nf_listing_draft:u1");
    expect(listingDraftKey("u2")).not.toBe(listingDraftKey("u1"));
    expect(listingDraftKey(null)).toBeNull();
  });

  it("every account's draft and the old shared one go at sign-out, and nothing else", () => {
    const storage = memoryStorage({
      nf_listing_draft: "{}",
      "nf_listing_draft:u1": "{}",
      "nf_listing_draft:u2": "{}",
      nf_theme: "dark",
    });
    clearListingDrafts(storage);
    expect(storage.keys()).toEqual(["nf_theme"]);
  });

  it("the wizard uses the account's key, and every sign-out clears the drafts", () => {
    const wizard = readFileSync("src/app/agent/list/ListingWizard.tsx", "utf8");
    expect(wizard).not.toContain('"nf_listing_draft"');
    expect(wizard.match(/listingDraftKey\(userId\)/g)?.length).toBe(3);
    for (const file of [
      "src/app/(app)/settings/SettingsHub.tsx",
      "src/app/(app)/settings/AccountSection.tsx",
      "src/app/(app)/settings/devices/DeviceList.tsx",
    ]) {
      expect(readFileSync(file, "utf8"), file).toContain("clearListingDrafts();");
    }
  });
});
