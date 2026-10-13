import { getDictionary } from "@vallo/i18n";
import { SupplyPage } from "@/components/site/SupplyPage";
import { CheckAnswer } from "@/app/(site)/check/CheckForm";
import { SUPPLY_DOORS, type SupplyRole } from "@/lib/site/supply-doors";
import type { ListerFees } from "@/lib/site/lister-fees";

/**
 * The front door's states that a sandbox cannot reach (the front-door
 * re-audit, 30 September): a supply page with the fee tiles drawn (the live
 * rates need the service key), and every answer the agent check can give
 * (the lookup needs it too). FIXTURE RATES, NOT VALLO'S: the figures below
 * exist only to draw the tiles.
 *
 *   /preview/front-door?door=agent|host|landlord
 */
const FIXTURE_FEES: ListerFees = {
  commissionBps: 500,
  commissionFlatMinor: 0,
  listingFeeBps: 0,
  listingFeeFlatMinor: 0,
};

export default async function FrontDoorPreview({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const role = ((await searchParams).door ?? "agent") as SupplyRole;
  const door = SUPPLY_DOORS[role] ?? SUPPLY_DOORS.agent;
  const t = getDictionary("en");
  const copy = t.trustDoors.check;
  return (
    <main id="main">
      <SupplyPage door={door} fees={FIXTURE_FEES} t={t} />
      <section className="nf-shell pb-section" aria-label="Check answers">
        <div className="mx-auto grid max-w-xl gap-md" data-testid="check-answers">
          <CheckAnswer outcome={{ state: "result", query: "08031234567", result: { found: false, kind: "phone" } }} copy={copy} locale="en" warning={t.publicDoors.warning} />
          <CheckAnswer
            outcome={{
              state: "result",
              query: "VA-7K3MP",
              result: { found: true, kind: "code", displayName: "Example Agent", role: "agent", code: "VA-7K3MP", hint: "567", identityCheckedAt: "2026-09-01T10:00:00Z", handle: null },
            }}
            copy={copy}
            locale="en"
          />
          <CheckAnswer outcome={{ state: "unreadable" }} copy={copy} locale="en" />
          <CheckAnswer outcome={{ state: "limited", retryIn: "12 minutes" }} copy={copy} locale="en" />
        </div>
      </section>
    </main>
  );
}
