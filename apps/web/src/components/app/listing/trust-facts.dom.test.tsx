/**
 * Session 3, Stage 5: the space detail's trust facts and infrastructure rows,
 * rendered for real.
 *
 *   - a trust fact is a DATE, never a tick, and a check with no date is not a
 *     row at all, so a null never reads as a negative;
 *   - an example row (D24) draws exactly what an unchecked real row draws;
 *   - the power, water and meter rows are marked with the real Tier A object
 *     only for what the agent stated, and the meter is no longer a tick.
 */
import { getDictionary } from "@vallo/i18n";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => undefined, back: () => undefined, replace: () => undefined, prefetch: () => undefined }),
  usePathname: () => "/listing/x",
  useSearchParams: () => new URLSearchParams(),
}));

const { TrustFacts } = await import("./TrustFacts");
const { ListingUtilities } = await import("./ListingUtilities");
const { earnedTrust } = await import("./earned-trust");
const { proofDate } = await import("@/lib/trust/proof-strip");

const t = getDictionary("en");
const real = {
  isDemo: false,
  verified: true,
  inspectedAt: "2026-09-12T10:00:00Z",
  addressVerifiedAt: "2026-08-03T09:00:00Z",
  rating: 0,
  reviewCount: 0,
};

describe("TrustFacts", () => {
  it("prints each check as its date, with no tick glyph", () => {
    const html = renderToStaticMarkup(
      <TrustFacts listingId="x" trust={earnedTrust(real)} strip={null} proofCount={0} locale="en" t={t} />,
    );
    expect(html).toContain('data-testid="trust-inspected"');
    expect(html).toMatch(/datetime="2026-09-12T10:00:00Z"/i);
    expect(html).toContain(proofDate("2026-09-12T10:00:00Z", "en"));
    expect(html).toContain('data-testid="trust-address"');
    expect(html).toContain('href="/listing/x/trust"');
  });

  it("draws an example row exactly as an unchecked real row: the quiet lede, nothing negative", () => {
    const example = renderToStaticMarkup(
      <TrustFacts listingId="x" trust={earnedTrust({ ...real, isDemo: true })} strip={null} proofCount={0} locale="en" t={t} />,
    );
    const unchecked = renderToStaticMarkup(
      <TrustFacts
        listingId="x"
        trust={earnedTrust({ ...real, inspectedAt: undefined, addressVerifiedAt: undefined })}
        strip={null}
        proofCount={0}
        locale="en"
        t={t}
      />,
    );
    expect(example).toBe(unchecked);
    expect(example).toContain('data-testid="trust-none"');
    expect(example.toLowerCase()).not.toMatch(/example|not verified|unverified|not inspected/);
  });
});

describe("ListingUtilities, marked with the real objects", () => {
  it("marks stated backup, meter and water with their objects", () => {
    const html = renderToStaticMarkup(
      <ListingUtilities
        utilities={{ powerGrid: "PATCHY", powerBackup: "GENERATOR", waterSupply: "BOREHOLE", prepaidMeter: true, hasEstateAccess: false }}
        access={null}
        bookingConfirmed={false}
      />,
    );
    expect(html).toContain('data-object="generator"');
    expect(html).toContain('data-object="prepaid-meter"');
    expect(html).toContain('data-object="borehole-pump"');
  });

  it("draws no object for a row nobody answered", () => {
    const html = renderToStaticMarkup(
      <ListingUtilities
        utilities={{ waterSupply: "TANKER", hasEstateAccess: false }}
        access={null}
        bookingConfirmed={false}
      />,
    );
    expect(html).toContain('data-object="water-tank"');
    expect(html).not.toContain('data-object="generator"');
    expect(html).not.toContain('data-object="prepaid-meter"');
  });
});
