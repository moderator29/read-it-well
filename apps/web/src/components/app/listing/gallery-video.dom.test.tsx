/**
 * VIDEOS ARE SLIDES OF THE ONE GALLERY (founder, 13 October). Three photos and
 * two videos, mounted for real in Chromium: they swipe through in the
 * lister's order, only the video slides carry the "Watch video" button, and
 * pressing it plays that video in place, muted, with its controls, fetching
 * the file only then. Swiping away stops it.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { BROWSER_TEST_TIMEOUT, closeBrowser, hasBrowser, mountInBrowser, warmBrowser } from "@/lib/testing/mount-in-browser";
import { appCss } from "@/lib/testing/locale-fit";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT * 2 });
beforeAll(async () => {
  if (hasBrowser) await warmBrowser();
});
afterAll(closeBrowser);

const entry = `
  import { mount } from "@/lib/testing/browser-root";
  import { ListingGallery } from "@/components/app/listing/ListingGallery";
  import { PhotoViewerProvider } from "@/components/app/listing/PhotoViewer";
  import { listingMedia } from "@/components/app/listing/gallery-media";

  const PHOTOS = ["/p/one.jpg", "/p/two.jpg", "/p/three.jpg"];
  const VIDEOS = [
    { url: "/v/a.mp4", posterUrl: "/v/a.jpg", durationSeconds: 42, position: 1 },
    { url: "/v/b.mp4", posterUrl: "/v/b.jpg", durationSeconds: 18, position: 4 },
  ];
  const media = listingMedia(PHOTOS, VIDEOS);
  mount(
    <PhotoViewerProvider title="Two bedroom flat, Yaba" photos={PHOTOS} media={media} hue={210} kind="apartment">
      <ListingGallery listingId="l1" title="Two bedroom flat, Yaba" hue={210} kind="apartment" photos={PHOTOS} media={media} floatingBack={false} />
    </PhotoViewerProvider>
  );
`;

describe.skipIf(!hasBrowser && !process.env.CI)("ListingGallery with videos", () => {
  it("swipes through photos and videos in order; only videos show the pill; pressing it plays in place", async () => {
    const { page, close } = await mountInBrowser({ entry, css: await appCss() });
    try {
      const track = page.locator('[role="group"][aria-label^="Photographs of"]');
      await track.waitFor();
      const panes = track.locator(":scope > div");
      expect(await panes.count()).toBe(5);
      const kinds = await panes.evaluateAll((els) => els.map((el) => el.getAttribute("data-kind") ?? "photo"));
      expect(kinds).toEqual(["photo", "video", "photo", "photo", "video"]);

      /* The pill is a real button named "Watch video", on the video slides only. */
      const pills = page.getByRole("button", { name: "Watch video" });
      expect(await pills.count()).toBe(2);
      for (const i of [0, 2, 3]) expect(await panes.nth(i).getByTestId("gallery-watch").count()).toBe(0);
      expect(await panes.nth(1).getByTestId("gallery-watch").count()).toBe(1);
      expect(await panes.nth(4).getByTestId("gallery-watch").count()).toBe(1);

      /* Photos keep their name: each photo slide is still the button that
         opens it full screen (the image itself is drawn behind it). */
      for (const i of [0, 2, 3]) {
        expect(await panes.nth(i).getByRole("button", { name: `View photo ${i + 1} full screen` }).count()).toBe(1);
      }
      expect(await panes.nth(1).getByTestId("gallery-open").count()).toBe(0);

      /* Never autoplays, nothing fetched before the press. */
      expect(await page.locator("video").count()).toBe(0);

      /* Swipe to the first video, then press its pill. */
      await track.evaluate((el) => el.scrollTo({ left: el.clientWidth, behavior: "instant" as ScrollBehavior }));
      await page.waitForTimeout(400);
      expect((await page.getByTestId("gallery-counter").textContent())?.replace(/\s/g, "")).toContain("2/5");
      await panes.nth(1).getByTestId("gallery-watch").click();
      const player = page.getByTestId("gallery-video");
      await player.waitFor();
      const state = await player.evaluate((v: HTMLVideoElement) => ({
        src: v.getAttribute("src"),
        muted: v.muted,
        controls: v.controls,
      }));
      expect(state).toEqual({ src: "/v/a.mp4", muted: true, controls: true });
      expect(await panes.nth(1).getByTestId("gallery-watch").count()).toBe(0);
      /* The counter steps off the player's controls while it plays. */
      expect(await page.getByTestId("gallery-counter").count()).toBe(0);

      /* Swiping away stops it: the player is gone and the pill is back. */
      await track.evaluate((el) => el.scrollTo({ left: el.clientWidth * 2, behavior: "instant" as ScrollBehavior }));
      await page.waitForFunction(() => document.querySelectorAll('[data-testid="gallery-video"]').length === 0, null, { timeout: 5000 });
      expect(await panes.nth(1).getByTestId("gallery-watch").count()).toBe(1);
    } finally {
      await close();
    }
  });
});
