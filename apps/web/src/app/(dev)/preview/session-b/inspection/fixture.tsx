import { formatMoney } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { InspectionHero, InspectionSheet } from "@/components/app/inspections/InspectionSheet";
import type { InspectionState } from "@/lib/inspections/types";
import { ROOM_ITEMS } from "@/lib/inspections/report";
import { INSPECTION, INSPECTION_FACTS } from "../../f5/fixtures";

const STATES: readonly InspectionState[] = ["REQUESTED", "CONFIRMED", "PROPOSED", "DECLINED", "COMPLETED", "WITHDRAWN"];

/**
 * The inspection surface on fixture props, shared by the two Session B
 * harness pages (lead ruling R-G): `page.tsx` draws it bare and
 * `shell/page.tsx` draws it inside the app shell, so the first-screen proof
 * can be re-run. FIXTURE-BACKED: it proves the look, never the writes.
 */
/**
 * Report storage is live on production (I1), so the harness draws it live
 * with no rooms saved. `rooms=<n>` draws the first n rooms as saved; `rooms=off`
 * draws the flag off. FIXTURE: the look of a report, never a save.
 */
export async function InspectionFixture({
  side: sideParam,
  state: stateParam,
  rooms: roomsParam,
}: {
  side?: string;
  state?: string;
  rooms?: string;
}) {
  const live = roomsParam !== "off";
  const rooms = live ? Math.max(0, Math.min(8, Number.parseInt(roomsParam ?? "0", 10) || 0)) : 0;
  const locale = await getLocale();
  const side = sideParam === "lister" ? "lister" : "requester";
  const state = STATES.find((one) => one === stateParam) ?? "CONFIRMED";
  return (
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
          reportLive={live}
          report={
            live
              ? {
                  notes: null,
                  items: Object.fromEntries(ROOM_ITEMS.slice(0, rooms).map((item) => [item, true])),
                  photoCount: 0,
                  submittedAt: null,
                }
              : null
          }
        />
      </div>
    </div>
  );
}
