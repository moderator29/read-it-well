/**
 * THE COMMENT PILL OPENS THE EXISTING REPLY FLOW, in the feed itself.
 *
 * "Drop a comment" under a post goes to that post's own page with the reply
 * box focused (`/post/<id>?reply=1`), the thread-first flow the feed has
 * always used, so a reply is written with the conversation in view. The feed
 * is mounted with a fixture post and a signed-in session, and the router's
 * calls are recorded.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { BROWSER_TEST_TIMEOUT, closeBrowser, hasBrowser, mountInBrowser, warmBrowser } from "@/lib/testing/mount-in-browser";
import { PORTED_CSS } from "@/components/ui/ported-test-css";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);

const read = (...parts: string[]) => readFileSync(join(process.cwd(), ...parts), "utf8");
const CSS = [
  PORTED_CSS,
  read("src", "app", "social-feed.shared.css"),
  read("src", "app", "social-feed.css"),
  read("src", "components", "social", "feed", "feed-v2.css"),
].join("\n");

const entry = `
  import { Feed } from "@/components/social/feed/Feed";
  import { sheetWordsOf } from "@/components/social/sheet-words";
  import { getDictionary } from "@vallo/i18n";
  import { FEED_POSTS } from "@/app/(dev)/preview/f4/fixtures";
  import { mount } from "@/lib/testing/browser-root";
  import { AuthGateProvider } from "@/components/auth/AuthGate";
  window.__ids = FEED_POSTS.map((p) => p.id);
  mount(
    <AuthGateProvider signedIn>
      <Feed initial={FEED_POSTS.slice(0, 2)} locale="en" sheet={sheetWordsOf(getDictionary("en"))} signedIn canCompose emptyMessage="Nothing" />
    </AuthGateProvider>
  );
`;

describe.skipIf(!hasBrowser && !process.env.CI)("the feed's comment pill", () => {
  it("opens that post's reply flow, one push, and for the post it sits under", async () => {
    const { page, close } = await mountInBrowser({ entry, css: CSS });
    try {
      const pills = page.getByTestId("post-comment-pill");
      await pills.nth(1).waitFor({ timeout: 15000 });
      await pills.nth(1).click({ timeout: 4000 });
      const { pushes, ids } = await page.evaluate(() => {
        const w = window as unknown as { __router?: { calls: unknown[][] }; __ids: string[] };
        return {
          pushes: (w.__router?.calls ?? []).filter((c) => c[0] === "push").map((c) => String(c[1])),
          ids: w.__ids,
        };
      });
      expect(pushes).toEqual([`/post/${ids[1]}?reply=1`]);
    } finally {
      await close();
    }
  });
});
