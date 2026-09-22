import "@/app/css/price-check.css";

import { getDictionary } from "@vallo/i18n";
import { Stack, Section } from "@/components/app/Screen";
import { EmptyActions } from "@/components/app/EmptyActions";
import { ComparablesRail, Disclaimer, RefusalPanel, StripPlot } from "@/components/app/price/ResultPanel";
import { REFUSALS, REFUSAL_CODES } from "@/lib/price-check/refusals";
import type { Comparable } from "@/lib/price-check/types";

/**
 * ALL NINE REFUSALS, ON ONE PAGE.
 *
 * THIS IS THE ONLY PLACE THEY CAN ALL BE SEEN. The live estate produces
 * exactly one of them, `demo_only`, and will go on producing only that one
 * until real listings arrive. A screen that cannot be looked at is a screen
 * nobody has designed, and eight of nine were in that position.
 *
 * The comparables below are fixtures and they are LABELLED as fixtures in this
 * file's own name and folder. Nothing here reaches a database and nothing here
 * is ever served outside the harness: `(dev)/preview/layout.tsx` refuses to
 * render unless the harness is explicitly opened, and never on Vercel whatever
 * the variable says.
 */

const FIXTURE_COMPARABLES: Comparable[] = [
  { id: "1", title: "", area: "Yaba", city: "Lagos", bedrooms: 3, bathrooms: 3, sizeSqm: 110, publishedAt: "", ageDays: 40, distanceM: 320, priceMinor: 180_000_000, priceBasis: "advertised_rent_year", pricePerSqmMinor: null },
  { id: "2", title: "", area: "Yaba", city: "Lagos", bedrooms: 3, bathrooms: 2, sizeSqm: null, publishedAt: "", ageDays: 90, distanceM: 610, priceMinor: 220_000_000, priceBasis: "advertised_rent_year", pricePerSqmMinor: null },
  { id: "3", title: "", area: "Yaba", city: "Lagos", bedrooms: 4, bathrooms: 3, sizeSqm: 150, publishedAt: "", ageDays: 150, distanceM: 880, priceMinor: 350_000_000, priceBasis: "advertised_rent_year", pricePerSqmMinor: null },
  { id: "4", title: "", area: "Yaba", city: "Lagos", bedrooms: 3, bathrooms: 3, sizeSqm: null, publishedAt: "", ageDays: 20, distanceM: 1_200, priceMinor: 600_000_000, priceBasis: "advertised_rent_year", pricePerSqmMinor: null },
  { id: "5", title: "", area: "Yaba", city: "Lagos", bedrooms: 3, bathrooms: 4, sizeSqm: 200, publishedAt: "", ageDays: 220, distanceM: 2_400, priceMinor: 900_000_000, priceBasis: "advertised_rent_year", pricePerSqmMinor: null },
];

const COUNTS: Partial<Record<(typeof REFUSAL_CODES)[number], number>> = {
  too_few_comparables: 3,
};

export default async function PreviewPriceRefusals() {
  const t = getDictionary("en");
  const copy = t.priceCheck;

  const refusalCopy = {
    no_location: copy.refusals.noLocation,
    no_comparables: copy.refusals.noComparables,
    too_few_comparables: copy.refusals.tooFewComparables,
    too_few_sized: copy.refusals.tooFewSized,
    wide_dispersion: copy.refusals.wideDispersion,
    stale: copy.refusals.stale,
    unsupported_type: copy.refusals.unsupportedType,
    unsupported_period: copy.refusals.unsupportedPeriod,
    demo_only: copy.refusals.demoOnly,
  };

  const actionLabel: Record<string, string> = {
    dropPin: copy.actions.dropPin,
    areaReport: copy.actions.areaReport,
    notifyMe: copy.actions.notifyMe,
    showNearby: copy.actions.showNearby,
    registeredFirm: copy.actions.registeredFirm,
    changePeriod: copy.actions.changePeriod,
  };

  return (
    <main className="nf-shell py-section">
      <h1 className="nf-h2">The nine refusals</h1>
      <p className="mt-inline nf-body text-[var(--nf-content-secondary)]">
        Each one says what the situation is, makes clear the fault is not the reader&apos;s, and
        leaves them somewhere to go. Only one of these nine is reachable on this project today.
      </p>

      <div className="mt-section">
        <Stack>
          {REFUSAL_CODES.map((code) => {
            const spec = REFUSALS[code];
            const primary = spec.actions[0]!;
            const secondary = spec.actions[1];
            return (
              <Section key={code} title={code} divided>
                <RefusalPanel
                  result={{
                    kind: "refused",
                    code,
                    comparableCount: COUNTS[code] ?? 0,
                    radiusM: 3000,
                    dispersion: code === "wide_dispersion" ? 0.94 : null,
                  }}
                  refusalCopy={refusalCopy}
                  actions={
                    <EmptyActions
                      primary={{ label: actionLabel[primary] ?? primary, href: "#" }}
                      secondary={
                        secondary
                          ? { label: actionLabel[secondary] ?? secondary, href: "#" }
                          : undefined
                      }
                    />
                  }
                />
                {spec.showsStripPlot && (
                  <StripPlot
                    comparables={FIXTURE_COMPARABLES}
                    locale="en"
                    heading={copy.result.spreadHeading}
                  />
                )}
                {spec.showsComparables && (
                  <ComparablesRail
                    comparables={FIXTURE_COMPARABLES.slice(0, COUNTS[code] ?? 3)}
                    locale="en"
                    copy={copy.result}
                  />
                )}
                <Disclaimer />
              </Section>
            );
          })}
        </Stack>
      </div>
    </main>
  );
}
