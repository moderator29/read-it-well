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
const { ClientCopyProvider } = await import("@/lib/i18n/client-copy");
const { clientCopyOf } = await import("@/lib/i18n/client-copy-of");
const { getDictionary } = await import("@vallo/i18n");

afterAll(closeAxe);

describe.skipIf(!hasBrowser && !process.env.CI)("ListingGallery (axe)", () => {
  it("the photo track is focusable, named, and passes axe's scroller rule", async () => {
    /* The gallery reads its words from the root layout's provider, so it is
       rendered inside one, as it is in the app. */
    const html = renderToStaticMarkup(
      <ClientCopyProvider copy={clientCopyOf(getDictionary("en"))}>
      <ListingGallery
        listingId="l1"
        title="Two bedroom flat, Yaba"
        hue={210}
        kind="apartment"
        photos={["https://images.unsplash.com/photo-a", "https://images.unsplash.com/photo-b", "https://images.unsplash.com/photo-c"]}
      />
      </ClientCopyProvider>,
    );
    /* Named for what it holds, with no instructions in the name (they would
       be announced on every focus), and a group rather than a second region
       inside the gallery's own labelled section. */
    expect(html).toMatch(/role="group"[^>]*aria-label="Photographs of Two bedroom flat, Yaba"/);
    expect(html).not.toContain('role="region"');
    const css = `.nf-scroll-x > div{flex:0 0 390px;height:200px}`;
    expect(await axe(html, { rules: ["scrollable-region-focusable", "aria-allowed-attr", "aria-prohibited-attr"], css })).toEqual([]);
  });
});
