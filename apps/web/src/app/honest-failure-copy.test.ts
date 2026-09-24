import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { getDictionary } from "@vallo/i18n";

/**
 * STORE-01 / UX-17. The failure screens promised "Nothing you were doing was
 * lost" — false on the one screen where it matters most: a half-typed form
 * behind a dropped connection or a crashed render IS lost. And several
 * consumer strings spoke in the engineer's voice (row level security, the
 * ledger, kobo-stored totals, a list of 749).
 *
 * These screens are client error boundaries and a static shell page, which
 * this node suite cannot render, so the promise is checked in their source.
 */
const FAILURE_SCREENS = [
  "app/error.tsx",
  "app/(app)/error.tsx",
  "app/global-error.tsx",
  "app/offline/page.tsx",
  "../../native-shell/index.html",
];

function read(relative: string): string {
  return readFileSync(fileURLToPath(new URL(`./${relative.replace(/^app\//, "")}`, import.meta.url)), "utf8");
}

describe("failure screens promise nothing they cannot keep", () => {
  it.each(FAILURE_SCREENS)("%s does not say nothing was lost", (file) => {
    const text = read(file).replace(/\s+/g, " ");
    expect(text).not.toMatch(/nothing (you were doing )?(has been|was) lost/i);
    expect(text).not.toMatch(/nothing you were doing was lost/i);
    expect(text).not.toMatch(/Everything is where you left it/i);
  });

  it.each(["app/error.tsx", "app/global-error.tsx"])(
    "%s asks for the reference only when there is one",
    (file) => {
      const text = read(file).replace(/\s+/g, " ");
      expect(text).toMatch(/error\.digest \? "If it keeps happening, tell support and quote the reference below\."/);
      expect(text).toContain("tell support what you were doing");
    },
  );
});

describe("consumer copy is not written for engineers", () => {
  it("names no mechanism a renter cannot know", () => {
    const all = JSON.stringify(getDictionary("en"));
    for (const word of ["row level security", "your own row", "from the ledger", "read the ledger", "list of 749", "read from the platform as the page loads"]) {
      expect(all).not.toContain(word);
    }
    const checkout = read("app/(app)/checkout/page.tsx");
    expect(checkout).not.toContain("stored to the kobo");
  });
});
