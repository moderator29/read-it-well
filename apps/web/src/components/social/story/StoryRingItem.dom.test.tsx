/**
 * The story ring in a real browser: a segment per live story, lit until this
 * device has opened it, quiet and glowless once every one has been, and never
 * moving (the old ring turned for ever).
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

const CSS = [PORTED_CSS, readFileSync(join(process.cwd(), "src/app/css/feed-m.css"), "utf8")].join("\n");

const entryFor = (viewerId: string | null) => `
  import { StoryRingItem } from "@/components/social/story/StoryRingItem";
  import { mount } from "@/lib/testing/browser-root";
  mount(
    <div className="nf-story-ring">
      <StoryRingItem href="/stories/c" title="Ada Obi" name="Ada" headline="The lift works again" imageUrl={null}
        storyIds={["a", "b", "c"]} seenWord="seen" viewerId={${JSON.stringify(viewerId)}} />
    </div>,
  );
`;
const entry = entryFor("viewer-1");

describe.skipIf(!hasBrowser && !process.env.CI)("StoryRingItem", () => {
  it("draws every segment lit when nothing has been opened, and says nothing about seen", async () => {
    const { page, close } = await mountInBrowser({ entry, css: CSS });
    try {
      const disc = page.locator(".nf-story-ring__disc");
      await disc.waitFor();
      const ring = await disc.getAttribute("style");
      expect(ring).toContain("--nf-ring-lit");
      expect(ring).not.toContain("--nf-ring-seen");
      expect(await disc.getAttribute("data-seen")).toBeNull();
      expect(await page.locator(".nf-story-ring__item").innerText()).not.toContain("seen");
    } finally {
      await close();
    }
  });

  it("goes quiet segment by segment, then loses its glow and says seen aloud", async () => {
    const some = await mountInBrowser({
      entry,
      css: CSS,
      init: `localStorage.setItem("nf_seen_stories:viewer-1", JSON.stringify(["a"]))`,
    });
    try {
      const disc = some.page.locator(".nf-story-ring__disc");
      await disc.waitFor();
      await some.page.waitForFunction(() => document.querySelector(".nf-story-ring__disc")?.getAttribute("style")?.includes("--nf-ring-seen"));
      expect(await disc.getAttribute("data-seen")).toBeNull();
    } finally {
      await some.close();
    }
    const all = await mountInBrowser({
      entry,
      css: CSS,
      init: `localStorage.setItem("nf_seen_stories:viewer-1", JSON.stringify(["a","b","c"]))`,
    });
    try {
      const disc = all.page.locator(".nf-story-ring__disc");
      await all.page.waitForFunction(() => document.querySelector(".nf-story-ring__disc")?.getAttribute("data-seen") === "all");
      expect(await all.page.locator(".nf-story-ring__item").innerText()).toContain("seen");
      expect(await disc.evaluate((el) => getComputedStyle(el).boxShadow)).toBe("none");
    } finally {
      await all.close();
    }
  });

  it("keeps the seen list per account: another viewer on the same phone sees every ring lit", async () => {
    const { page, close } = await mountInBrowser({
      entry: entryFor("viewer-2"),
      css: CSS,
      init: `localStorage.setItem("nf_seen_stories:viewer-1", JSON.stringify(["a","b","c"]))`,
    });
    try {
      const disc = page.locator(".nf-story-ring__disc");
      await disc.waitFor();
      expect(await disc.getAttribute("style")).not.toContain("--nf-ring-seen");
      expect(await disc.getAttribute("data-seen")).toBeNull();
    } finally {
      await close();
    }
  });

  it("adopts the pre-scope list once on upgrade, so a ring this device quieted stays quiet (A7)", async () => {
    const { page, close } = await mountInBrowser({
      entry,
      css: CSS,
      init: `localStorage.setItem("nf_seen_stories", JSON.stringify(["a","b","c"]))`,
    });
    try {
      await page.waitForFunction(() => document.querySelector(".nf-story-ring__disc")?.getAttribute("data-seen") === "all");
      expect(await page.evaluate(() => localStorage.getItem("nf_seen_stories"))).toBeNull();
      expect(await page.evaluate(() => localStorage.getItem("nf_seen_stories:viewer-1"))).toBe(JSON.stringify(["a", "b", "c"]));
    } finally {
      await close();
    }
  });

  it("does not hand the pre-scope list to a signed-out reader", async () => {
    const { page, close } = await mountInBrowser({
      entry: entryFor(null),
      css: CSS,
      init: `localStorage.setItem("nf_seen_stories", JSON.stringify(["a","b","c"]))`,
    });
    try {
      const disc = page.locator(".nf-story-ring__disc");
      await disc.waitFor();
      expect(await disc.getAttribute("data-seen")).toBeNull();
      expect(await page.evaluate(() => localStorage.getItem("nf_seen_stories"))).not.toBeNull();
    } finally {
      await close();
    }
  });

  it("never animates: no loop on the ring", async () => {
    const { page, close } = await mountInBrowser({ entry, css: CSS });
    try {
      const disc = page.locator(".nf-story-ring__disc");
      await disc.waitFor();
      expect(await disc.evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
    } finally {
      await close();
    }
  });
});
