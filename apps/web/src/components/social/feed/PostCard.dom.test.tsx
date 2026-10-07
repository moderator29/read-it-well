/**
 * A post's picture opens the post the way its link would (audit A7): a plain
 * tap in this tab, and a cmd or ctrl click or the middle button in a new tab.
 * Forwarding the picture's tap with `link.click()` used to drop the modifier
 * and open the post in this tab whatever was held.
 *
 * The post is the preview harness's own fixture (fictional, never shipped).
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  BROWSER_TEST_TIMEOUT,
  closeBrowser,
  hasBrowser,
  mountInBrowser,
  warmBrowser,
} from "@/lib/testing/mount-in-browser";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);

const entry = `
  import { PostCard } from "@/components/social/feed/PostCard";
  import { FEED_POSTS } from "@/app/(dev)/preview/f4/fixtures";
  import { mount } from "@/lib/testing/browser-root";
  const noop = () => {};
  window.__postId = FEED_POSTS[0].id;
  mount(<PostCard post={FEED_POSTS[0]} locale="en" onLike={noop} onReply={noop} onRepost={noop} onShare={noop} onMenu={noop} />);
`;

/* window.open is recorded rather than run, so a new tab is observable. */
const init = `window.__opened = []; window.open = (url, target) => { window.__opened.push([String(url), target]); return null; };`;

const opened = (page: import("playwright-core").Page) =>
  page.evaluate(() => (window as unknown as { __opened: [string, string][] }).__opened);

describe.skipIf(!hasBrowser && !process.env.CI)("a post's picture", () => {
  it("opens the post in a new tab on a ctrl or cmd click, and leaves this tab where it is", async () => {
    const { page, close } = await mountInBrowser({ entry, init });
    try {
      const id = await page.evaluate(() => (window as unknown as { __postId: string }).__postId);
      await page.locator(".nf-post__media").first().click({ modifiers: ["ControlOrMeta"] });
      const calls = await opened(page);
      expect(calls).toHaveLength(1);
      expect(new URL(calls[0]![0]).pathname).toBe(`/post/${id}`);
      expect(calls[0]![1]).toBe("_blank");
      expect(new URL(page.url()).pathname).toBe("/");
    } finally {
      await close();
    }
  });

  it("opens the post in a new tab on a middle click", async () => {
    const { page, close } = await mountInBrowser({ entry, init });
    try {
      await page.locator(".nf-post__media").first().click({ button: "middle" });
      expect(await opened(page)).toHaveLength(1);
      expect(new URL(page.url()).pathname).toBe("/");
    } finally {
      await close();
    }
  });

  it("opens the post in this tab on a plain tap, as it always did", async () => {
    const { page, close } = await mountInBrowser({ entry, init });
    try {
      const id = await page.evaluate(() => (window as unknown as { __postId: string }).__postId);
      await Promise.all([page.waitForURL(`**/post/${id}`), page.locator(".nf-post__media").first().click()]);
    } finally {
      await close();
    }
  });
});
