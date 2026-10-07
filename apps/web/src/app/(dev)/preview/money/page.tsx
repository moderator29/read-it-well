import { notFound } from "next/navigation";
import { previewHarnessIsOpen } from "@/lib/preview-harness";
import { MoneyCentre } from "@/components/money/MoneyCentre";
import { PayoutList } from "@/components/money/PayoutList";
import { ReferenceList } from "@/components/money/ReferenceList";
import { TransactionCheckout } from "@/components/money/TransactionCheckout";
import { TransactionTimeline } from "@/components/money/TransactionTimeline";
import { WithdrawalMaths } from "@/components/money/WithdrawalMaths";
import { Button } from "@/components/ui/Button";
import { RAIL_COPY, WITHDRAW_CONFIRM } from "@/lib/money/copy";
import { FeeGateFixture } from "./FeeGateFixture";
import { FIXTURE_BALANCES, FIXTURE_EVENTS, FIXTURE_PAYOUTS, FIXTURE_QUOTE, FIXTURE_REFS_FIAT } from "./fixtures";

export const dynamic = "force-dynamic";

/**
 * THE MONEY DECK (C2, Session 3 round 3): every D50 and D51 surface drawn
 * with FIXTURE data, including the protected-rail surfaces that no product
 * route may reach until the rail is live (`lib/money/rails.ts`). Development
 * only; the layout's gate 404s it everywhere else.
 */
export default function MoneyDeck() {
  if (!previewHarnessIsOpen(process.env)) notFound();
  const now = Date.parse("2026-10-06T09:00:00Z");
  return (
    <main className="nf-shell py-section">
      <div className="mx-auto grid max-w-2xl gap-xl">
        <p role="note" className="nf-caption" data-testid="money-fixture-note">
          Fixture data for design review. Every figure, name, reference and date on this page is invented, and the partner is
          a placeholder. The protected-rail surfaces here are not reachable from the product until the rail is live.
        </p>
        <h1 className="nf-h2">Money surfaces</h1>

        <section className="grid gap-sm">
          <h2 className="nf-h3">The lister&apos;s fee, before publishing</h2>
          <FeeGateFixture blocking={false} />
          <FeeGateFixture blocking />
          {/* A server page cannot hand a client component a function: the
              no-policy case goes through the client fixture too. */}
          <FeeGateFixture blocking={false} kind="stay" priceMinor={45_000_00} policy={null} />
        </section>

        <section className="grid gap-sm">
          <h2 className="nf-h3">Checkout that understands the transaction</h2>
          <TransactionCheckout
            rail="protected"
            space={{ title: "Fixture space, two bedrooms", location: "Fixture area, Fixture city", href: "/preview/money" }}
            agreement={{ id: "fixture-agreement", status: "approved" }}
            payeeName="Fixture lister"
            amountMinor={1_800_000_00}
            currency="NGN"
            locale="en"
            conditions={["Vallo approved the agreement before payment opened."]}
            references={[{ kind: "agreement", value: "fixture-agreement" }]}
          />
        </section>

        <section className="grid gap-sm">
          <h2 className="nf-h3">Timeline</h2>
          <TransactionTimeline events={FIXTURE_EVENTS} viewer="payer" locale="en" next={RAIL_COPY.protected.releaseCondition} id="nf-fixture-timeline" />
        </section>

        <section className="grid gap-sm">
          <h2 className="nf-h3">Money centre</h2>
          <MoneyCentre balances={FIXTURE_BALANCES} locale="en" />
          <MoneyCentre balances={null} locale="en" id="nf-money-centre-absent" />
        </section>

        <section className="grid gap-sm">
          <h2 className="nf-h3">Withdrawal</h2>
          <WithdrawalMaths withdrawal={{ state: "waiting", amountMinor: 1_000_000_00 }} locale="en" now={now} action={(ok) => <Button variant="primary" full disabled={!ok}>{WITHDRAW_CONFIRM}</Button>} />
          <WithdrawalMaths id="nf-withdraw-ready" withdrawal={{ state: "ready", quote: FIXTURE_QUOTE }} locale="en" now={now} action={(ok) => <Button variant="primary" full disabled={!ok}>{WITHDRAW_CONFIRM}</Button>} />
          <WithdrawalMaths id="nf-withdraw-expired" withdrawal={{ state: "expired" }} locale="en" now={now} />
        </section>

        <section className="grid gap-sm">
          <h2 className="nf-h3">References</h2>
          <ReferenceList references={FIXTURE_REFS_FIAT} settlement="fiat" />
        </section>

        <section className="grid gap-sm">
          <h2 className="nf-h3">Payouts</h2>
          <PayoutList entries={FIXTURE_PAYOUTS} locale="en" />
        </section>
      </div>
    </main>
  );
}
