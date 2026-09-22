import "@/app/css/price-check.css";

import { getDictionary } from "@vallo/i18n";
import { Stack } from "@/components/app/Screen";
import { AreaReport, NeighbourhoodFacts } from "@/components/app/price/AreaPanel";

/**
 * THE AREA REPORT AND THE FACTS PANEL, WHICH ARE WHAT STAGE ONE ACTUALLY IS.
 *
 * Both are empty against the live estate for the same reason everything else
 * is, so both are drawn here with fixtures AND with their empty states, which
 * are the ones a real reader meets today.
 *
 * The facts panel is the one part of this feature that needs no price data at
 * all. Nobody else in this market collects power and water structurally per
 * listing, and every figure in it is a count with its denominator beside it:
 * "7 of 19", never "37 per cent", because a percentage over nineteen listings
 * is a figure pretending to be a survey.
 */
export default async function PreviewPriceArea() {
  const t = getDictionary("en");
  const copy = t.priceCheck;

  const typeNames = {
    apartment: copy.subject.apartment,
    home: copy.subject.home,
    shop: copy.subject.shop,
    office: copy.subject.office,
  };

  return (
    <main className="nf-shell py-section">
      <h1 className="nf-h2">Area prices, and the facts that need no prices</h1>

      <div className="mt-section">
        <Stack>
          <AreaReport
            rows={[
              { scope: "area", propertyType: "apartment", bedrooms: 2, listingCount: 7, p25Minor: 450_000_000, medianMinor: 520_000_000, p75Minor: 600_000_000, sizedCount: 4, medianPerSqmMinor: 4_800_000, oldestAt: "2026-03-04T00:00:00Z", newestAt: "2026-08-21T00:00:00Z" },
              { scope: "area", propertyType: "apartment", bedrooms: 3, listingCount: 12, p25Minor: 770_000_000, medianMinor: 800_000_000, p75Minor: 950_000_000, sizedCount: 2, medianPerSqmMinor: null, oldestAt: "2026-02-11T00:00:00Z", newestAt: "2026-09-02T00:00:00Z" },
              { scope: "area", propertyType: "home", bedrooms: 4, listingCount: 3, p25Minor: 1_800_000_000, medianMinor: 2_100_000_000, p75Minor: 2_600_000_000, sizedCount: 3, medianPerSqmMinor: 9_200_000, oldestAt: "2026-05-19T00:00:00Z", newestAt: "2026-07-30T00:00:00Z" },
            ]}
            census={{ realCount: 22, demoCount: 0, locatedCount: 22, sizedCount: 9 }}
            locale="en"
            copy={copy.area}
            typeNames={typeNames}
          />

          <NeighbourhoodFacts
            facts={{
              listingCount: 19,
              powerGrid: "BAND_A",
              powerGridCount: 11,
              powerBackup: "GENERATOR_INVERTER",
              powerBackupCount: 8,
              waterSupply: "BOREHOLE",
              waterSupplyCount: 14,
              prepaidMeterCount: 7,
              prepaidMeterKnown: 15,
              estateAccessCount: 12,
              estateAccessKnown: 19,
            }}
            copy={copy.facts}
          />

          <div className="nf-hairline pt-section-tight">
            <h2 className="nf-h3">And what a real reader meets today</h2>
            <AreaReport
              rows={[]}
              census={{ realCount: 0, demoCount: 11, locatedCount: 0, sizedCount: 0 }}
              locale="en"
              copy={copy.area}
              typeNames={typeNames}
            />
            <NeighbourhoodFacts facts={null} copy={copy.facts} />
          </div>
        </Stack>
      </div>
    </main>
  );
}
