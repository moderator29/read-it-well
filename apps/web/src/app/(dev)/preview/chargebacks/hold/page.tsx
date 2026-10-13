import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { PAYOUTS_TITLE } from "@/lib/money/copy";
import { PageHeader } from "@/components/app/PageHeader";
import { PayoutsView } from "@/components/money/PayoutsView";
import { ChargebackHoldNotice } from "@/components/money/ChargebackHoldNotice";
import type { ChargebackHold } from "@/lib/money/chargeback-hold-model";
import { NOW } from "../fixtures";

/**
 * The lister's /payouts with the chargeback notice on top, from fixtures.
 * Default: a hold with the owed amount (the draft read). `?state=plain` the
 * hold with no amount (the live predicate only), `?state=open` an undecided
 * dispute that holds nothing, `?state=none` the screen as it is without one.
 */
export const dynamic = "force-dynamic";

const HOLDS: Record<string, ChargebackHold> = {
  held: { state: "held", owedMinor: 22_500_000, currency: "NGN", count: 1, since: "2026-09-29T14:10:00Z", openCount: 1 },
  plain: { state: "held", owedMinor: null, currency: "NGN", count: null, since: null, openCount: 0 },
  open: { state: "open", openCount: 2 },
  none: { state: "none" },
};

export default async function PreviewChargebackHold({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const locale = await getLocale();
  const t = getDictionary(locale);
  const key = typeof params.state === "string" && params.state in HOLDS ? params.state : "held";
  return (
    <main className="nf-page nf-md nf-history">
      <PageHeader title={PAYOUTS_TITLE} fallback="/preview" />
      <ChargebackHoldNotice hold={HOLDS[key]!} copy={t.chargebacks.hold} locale={locale} />
      <PayoutsView
        summary={{ earnedMinor: 186_000_000, grossMinor: 200_000_000, payments: 7, reversedMinor: 0, netMinor: 186_000_000 }}
        entries={[]}
        nextBefore={null}
        before={null}
        locale={locale}
        now={NOW}
      />
    </main>
  );
}
