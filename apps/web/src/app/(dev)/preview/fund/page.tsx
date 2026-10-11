/* Preview harness for STEP 7, FUND (D77): the renter's funding screen, drawn by
   the real FundScreen from recorded facts, one state per link. The swipe
   answers as the server would, after a pause; nothing is called.

     /preview/fund                  ready: the balance covers the rent
     ?state=short                   the balance covers a quarter: top up
     ?state=onboarding              no balance yet: open it
     ?state=stale                   ready, on the last figure Payluk gave
     ?state=refused                 ready, and the recorded answer is a refusal
     ?state=review                  closed: a person is looking first
     ?state=soon                    closed: the escrow rail is not live yet

   Closed outside development by the preview layout. */
import { formatMoney } from "@vallo/i18n/core";
import { getLocale } from "@/lib/locale";
import { FundScreen } from "@/components/money/fund/FundScreen";
import { fundModel, type FundFacts } from "@/lib/money/fund-model";
import { PreviewFundControl } from "./PreviewFundControl";

const READY: FundFacts = {
  viewerIsRenter: true,
  kind: "rent",
  agreementStatus: "approved",
  payable: "payable",
  rail: "escrow",
  railLive: true,
  arrangementStatus: null,
  amountMinor: 120_000_000,
  placeTitle: "Two-bedroom flat, Yaba",
  counterpartName: "Adaeze Okafor",
  moveIn: "1 November 2026",
  balance: { state: "ready", availableMinor: 150_250_000, confirmedAt: "2026-10-07T09:00:00Z", live: true },
};

const STATES: Record<string, FundFacts> = {
  ready: READY,
  refused: READY,
  short: { ...READY, balance: { state: "ready", availableMinor: 30_000_000, confirmedAt: "2026-10-07T09:00:00Z", live: true } },
  onboarding: { ...READY, balance: { state: "onboarding" } },
  stale: { ...READY, balance: { state: "ready", availableMinor: 150_250_000, confirmedAt: "2026-10-07T08:10:00Z", live: false } },
  review: { ...READY, payable: "review_required" },
  soon: { ...READY, railLive: false },
};

export default async function Page({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const { state = "ready" } = await searchParams;
  const facts = STATES[state] ?? READY;
  const locale = await getLocale();
  const model = fundModel(facts);
  if (model.kind === "go_held") return null;
  return (
    <div className="mx-auto max-w-xl px-md py-lg">
      <nav className="mb-md flex flex-wrap gap-xs text-[length:var(--nf-text-caption)]" aria-label="Fixture states">
        {Object.keys(STATES).map((k) => (
          <a key={k} href={k === "ready" ? "/preview/fund" : `/preview/fund?state=${k}`} aria-current={k === state ? "page" : undefined} className="underline">
            {k}
          </a>
        ))}
      </nav>
      <FundScreen
        facts={facts}
        model={model}
        locale={locale}
        backHref="/preview/fund"
        control={<PreviewFundControl amountLabel={formatMoney(facts.amountMinor, locale, "NGN")} answer={state === "refused" ? "refused" : "ok"} />}
      />
    </div>
  );
}
