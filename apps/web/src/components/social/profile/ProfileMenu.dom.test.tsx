/**
 * THE PROFILE'S "..." MENU OPENS WHOLLY ON SCREEN (D79).
 *
 * The founder on a phone: Copy, Mute, Report and Block "render clipped off the
 * right edge of the screen". The menu hung from one edge of its trigger
 * whatever room there was on that side. Here the trigger is placed at the
 * left edge, in the middle and at the right edge of a 390px screen, and the
 * open menu must sit inside the viewport every time.
 *
 * Fictional person; nothing is sent (server actions are stubbed).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  BROWSER_TEST_TIMEOUT,
  closeBrowser,
  hasBrowser,
  mountInBrowser,
  warmBrowser,
} from "@/lib/testing/mount-in-browser";
import { PORTED_CSS } from "@/components/ui/ported-test-css";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);

const read = (...parts: string[]) => readFileSync(join(process.cwd(), ...parts), "utf8");
const CSS = [
  PORTED_CSS,
  read("src", "app", "social-feed.shared.css"),
  read("src", "app", "social-feed.css"),
  read("src", "components", "social", "profile", "social-profile.css"),
].join("\n");

const entry = (justify: string) => `
  import { ProfileMenu } from "@/components/social/profile/ProfileMenu";
  import { reportWordsOf } from "@/components/social/sheet-words";
  import { getDictionary } from "@vallo/i18n";
  import { mount } from "@/lib/testing/browser-root";
  mount(
    <div style={{ display: "flex", justifyContent: "${justify}", padding: "120px 16px 0" }}>
      <ProfileMenu
        handle="ada_lekki"
        userId="00000000-0000-4000-8000-0000000000aa"
        displayLabel="Adaeze Okafor-Williamson"
        isOwner={false}
        signedIn
        reportWords={reportWordsOf(getDictionary("en"))}
      />
    </div>
  );
`;

describe.skipIf(!hasBrowser && !process.env.CI)("the profile's overflow menu at 390px", () => {
  for (const justify of ["flex-start", "center", "flex-end"]) {
    it(`opens inside the screen with its trigger at ${justify}`, async () => {
      const { page, close } = await mountInBrowser({ entry: entry(justify), css: CSS });
      try {
        await page.getByRole("button", { name: /More actions for/ }).click();
        const box = await page.getByRole("menu").boundingBox();
        expect(box).not.toBeNull();
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(390);
      } finally {
        await close();
      }
    });
  }
});
