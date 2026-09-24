/**
 * DOC-21: the photo gallery on the listing and stay pages scrolled sideways
 * with no keyboard access (axe `scrollable-region-focusable`, 2 nodes live).
 */
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, describe, expect, it, vi } from "vitest";
import { axe, closeAxe, hasBrowser } from "@/lib/a11y/axe";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => undefined, back: () => undefined, replace: () => undefined, prefetch: () => undefined }),
  usePathname: () => "/listing/x",
  useSearchParams: () => new URLSearchParams(),
}));

const { ListingGallery } = await import("./ListingGallery");

afterAll(closeAxe);

describe.skipIf(!hasBrowser && !process.env.CI)("ListingGallery (axe)", () => {
  it("the photo track is focusable, named, and passes axe's scroller rule", async () => {
    const html = renderToStaticMarkup(
      <ListingGallery
        listingId="l1"
        title="Two bedroom flat, Yaba"
        hue={210}
        kind="apartment"
        photos={["https://images.unsplash.com/photo-a", "https://images.unsplash.com/photo-b", "https://images.unsplash.com/photo-c"]}
      />,
    );
    expect(html).toMatch(/role="region"[^>]*aria-label="Photographs of Two bedroom flat, Yaba/);
    const css = `.nf-scroll-x > div{flex:0 0 390px;height:200px}`;
    expect(await axe(html, { rules: ["scrollable-region-focusable", "aria-allowed-attr", "aria-prohibited-attr"], css })).toEqual([]);
  });
});
