import { formatMoney } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { InspectionHero, InspectionSheet } from "@/components/app/inspections/InspectionSheet";
import type { InspectionState } from "@/lib/inspections/types";
import { INSPECTION, INSPECTION_FACTS } from "../../f5/fixtures";

export const dynamic = "force-dynamic";

const STATES: readonly InspectionState[] = ["REQUESTED", "CONFIRMED", "PROPOSED", "DECLINED", "COMPLETED", "WITHDRAWN"];

/**
 * Session B's proof harness for the inspection surface (lead ruling R-G), so
 * the shots in docs/design/proofs/session-b/inspection/ can be re-run. It
 * renders the real `InspectionHero` and `InspectionSheet` on the F5 fixture
 * inspection with the render's listing facts, behind the preview gate.
 * FIXTURE-BACKED: it proves the look, never the writes.
 *
 * `?side=lister` shows the lister's side; `?state=REQUESTED` (any state)
 * shows that state.
 */
export default async function SessionBInspectionPreview({
  searchParams,
}: {
  searchParams: Promise<{ side?: string; state?: string }>;
}) {
  const locale = await getLocale();
  const params = await searchParams;
  const side = params.side === "lister" ? "lister" : "requester";
  const state = STATES.find((one) => one === params.state) ?? "CONFIRMED";
  return (
    <div className="nf-shell py-section-tight">
      <div className="mx-auto max-w-2xl">
        <InspectionHero sub="Check the property, confirm details, submit your report." />
        <div className="nf-ix-list">
          <InspectionSheet
            inspection={{
              ...INSPECTION,
              state,
              listingTitle: "Lekki Phase 1 Apartment",
              counterpartName: "Tunde Adebayo",
              listerNote: null,
            }}
            side={side}
            facts={{
              ...INSPECTION_FACTS,
              kindLabel: "2 Bedroom Apartment",
              priceLabel: formatMoney(250_000_000, locale),
              periodLabel: "per year",
            }}
            locale={locale}
            open
          />
        </div>
      </div>
    </div>
  );
}
