/**
 * DOC-21: the listing and stay detail defects axe found live, each rendered
 * for real and checked by axe-core in Chromium:
 *   - the utilities list broke `<dl>` structure (`definition-list`, `dlitem`);
 *   - the amenity capsules and the photo gallery scrolled sideways with no
 *     keyboard access (`scrollable-region-focusable`);
 *   - the stay card's chip row did the same inside a link, six times on /stays.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getDictionary } from "@vallo/i18n";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, describe, expect, it, vi } from "vitest";
import { axe, closeAxe, hasBrowser } from "@/lib/a11y/axe";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => undefined, back: () => undefined, replace: () => undefined, prefetch: () => undefined }),
  usePathname: () => "/listing/x",
  useSearchParams: () => new URLSearchParams(),
}));

const { ListingUtilities } = await import("./ListingUtilities");
const { DetailCapsules } = await import("./DetailAnatomy");

afterAll(closeAxe);

/** The product's own rules for the rows under test, so axe measures real overflow. */
const CATALOGUE_CSS = readFileSync(join(__dirname, "..", "..", "..", "app", "css", "catalogue.css"), "utf8");

describe.skipIf(!hasBrowser && !process.env.CI)("listing detail (axe)", () => {
  it("the utilities list is a well-formed definition list", async () => {
    const html = renderToStaticMarkup(
      <ListingUtilities
        utilities={{ powerGrid: "BAND_A", powerBackup: "INVERTER", powerBackupHours: 6, waterSupply: "BOREHOLE", prepaidMeter: true, hasEstateAccess: false }}
        access={null}
        bookingConfirmed={false}
      />,
    );
    expect(await axe(html, { rules: ["definition-list", "dlitem"] })).toEqual([]);
    /* Every term stays a real box: older WebKit (the iOS app's web view)
       drops the role of an element with display: contents. */
    expect(html).not.toMatch(/<dt[^>]*class="[^"]*\bcontents\b/);
  });

  it("the amenity capsules can be scrolled from the keyboard when they overflow", async () => {
    const items = ["Swimming pool", "Wi-Fi on every floor", "Fitted kitchen", "Parking on site"].map((label, i) => ({
      key: `k${i}`,
      icon: "sparkle" as const,
      label,
    }));
    const html = renderToStaticMarkup(<DetailCapsules items={items} label="Amenities" />);
    const narrow = `.nf-detail-capsule{flex:0 0 160px;white-space:nowrap}`;
    expect(await axe(`<div style="width:300px">${html}</div>`, { rules: ["scrollable-region-focusable"], css: narrow })).toEqual([]);
  });

  it("the stay card's chips wrap instead of scrolling inside the card's link", async () => {
    const { StayCard } = await import("../stays/StayCard");
    const { ClientCopyProvider } = await import("@/lib/i18n/client-copy");
    const { clientCopyOf } = await import("@/lib/i18n/client-copy-of");
    /* The card's save control reads its words from the root layout's
       provider, so the card is rendered inside one, as it is in the app. */
    const html = renderToStaticMarkup(
      <ClientCopyProvider copy={clientCopyOf(getDictionary("en"))}>
      <StayCard
        t={getDictionary("en")}
        locale="en"
        stay={{
          id: "s1",
          href: "/stay/s1",
          title: "Lekki waterfront suite",
          where: "Lekki Phase 1",
          kind: "shortlet",
          hue: 200,
          photo: null,
          verified: false,
          isDemo: false,
          rating: null,
          nightlyMinor: 8_500_000,
          currency: "NGN",
          amenities: ["pool", "wifi", "kitchen", "parking"],
          totalMinor: null,
          nights: null,
        } as never}
      />
      </ClientCopyProvider>,
    );
    expect(await axe(`<div style="width:300px">${html}</div>`, { rules: ["scrollable-region-focusable", "nested-interactive"], css: CATALOGUE_CSS })).toEqual([]);
  });
});
