import type { Metadata } from "next";
import { formatMoney, getDictionary } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { getFeeConsole, type FeeRateView } from "@/lib/admin/money-queries";
import { adminUi, type AdminUi } from "../_components/ui";
import { FeeRateForm } from "../_components/MoneyDecisions";

export const metadata: Metadata = {
  title: "Fees",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * What the platform charges, and the controls to change it.
 *
 * Everything is zero today, by the owner's decision: the engine is built and
 * switched off until there is a user base, so that nobody already earning here
 * is ambushed by a rate they did not sign up to.
 *
 * ZERO IS RENDERED AS "NO FEE" AND NEVER AS A BLANK. That is the one rule this
 * page has to get right. A missing value and a deliberate zero look identical
 * in a table of numbers and mean completely different things: one is a decision
 * the platform made and can stand behind, the other is a bug. Every row here
 * says which.
 *
 * A rate change is an INSERT, never an edit, so the history below is the whole
 * story of what has ever been charged and nothing in it can be quietly revised.
 * That is also why a rate cannot start in the past: back-dating one would make
 * a fee already charged unexplainable by the table.
 */
export default async function AdminFeesPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const ui = adminUi(t, locale);

  const read = await getFeeConsole();

  if (read.state !== "ok") {
    return (
      <div className="nf-console">
        <ui.QueueHeader title="Fees" lede="What the platform charges." />
        <ui.QueueUnavailable />
      </div>
    );
  }

  return (
    <div className="nf-console">
      <ui.QueueHeader
        title="Fees"
        lede="What the platform charges, with the date each rate started. Changing a rate adds a row rather than editing one, so anything already charged stays explainable by the rate that was in force at the time."
      />

      <FeeSection
        title="Commission on a completed transaction"
        blurb="Taken from money that actually changed hands: an escrow that released, a stay that was paid for. It is computed at the moment of settlement and frozen onto the transaction with the rate that produced it, so it is never recomputed from a rate that has moved since."
        kind="commission"
        rates={read.data.commission}
        ui={ui}
        locale={locale}
      />

      <FeeSection
        title="Listing fee"
        blurb="Charged to a lister for putting a property up. Not a share of anything, which is why it can be a flat amount as well as a percentage."
        kind="listing_fee"
        rates={read.data.listingFee}
        ui={ui}
        locale={locale}
      />
    </div>
  );
}

function describe(rate: FeeRateView, locale: Awaited<ReturnType<typeof getLocale>>): string {
  const parts: string[] = [];
  if (rate.basisPoints > 0) parts.push(`${rate.basisPoints / 100}%`);
  if (rate.flatMinor > 0) parts.push(`${formatMoney(rate.flatMinor, locale)} flat`);
  // The whole point of this page. A zero rate is an answer, not an absence.
  return parts.length === 0 ? "No fee" : parts.join(" plus ");
}

function FeeSection({
  title,
  blurb,
  kind,
  rates,
  ui,
  locale,
}: {
  title: string;
  blurb: string;
  kind: "commission" | "listing_fee";
  rates: FeeRateView[];
  ui: AdminUi;
  locale: Awaited<ReturnType<typeof getLocale>>;
}) {
  const live = rates.find((r) => r.inForce);

  return (
    <section className="nf-card mb-5 p-4 sm:p-5">
      <h2 className="text-[1rem] font-semibold text-[var(--nf-content-primary)]">{title}</h2>
      <p className="mt-1 max-w-[62ch] text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]">
        {blurb}
      </p>

      <p className="nf-numeric mt-3 text-[1.5rem] font-bold text-[var(--nf-content-primary)]">
        {live ? describe(live, locale) : "No rate on record"}
      </p>
      <p className="text-[0.75rem] text-[var(--nf-content-muted)]">
        {live
          ? `In force since ${ui.when(live.effectiveFrom)}`
          : "Nothing is being charged, because no rate exists at all. That is a bug rather than a decision."}
      </p>

      <h3 className="mt-4 text-[0.8125rem] font-semibold uppercase tracking-wide text-[var(--nf-content-muted)]">
        Every rate there has ever been
      </h3>
      <ul className="mt-1">
        {rates.map((rate) => (
          <li
            key={rate.id}
            className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-[var(--nf-border-subtle)] py-2.5"
          >
            <span className="min-w-0">
              <span className="text-[0.875rem] font-medium text-[var(--nf-content-primary)]">
                {describe(rate, locale)}
              </span>
              {rate.inForce && <span className="nf-badge nf-badge--brand ml-2">In force</span>}
              {rate.scheduled && <span className="nf-badge ml-2">Starts later</span>}
              {rate.note && (
                <span className="mt-0.5 block max-w-[62ch] text-[0.75rem] leading-relaxed text-[var(--nf-content-muted)]">
                  {rate.note}
                </span>
              )}
            </span>
            <span className="shrink-0 text-right text-[0.75rem] text-[var(--nf-content-muted)]">
              <span className="block">{ui.when(rate.effectiveFrom)}</span>
              {rate.setByName && <span className="block">{rate.setByName}</span>}
            </span>
          </li>
        ))}
      </ul>

      <FeeRateForm
        kind={kind}
        currentBasisPoints={live?.basisPoints ?? 0}
        currentFlatMinor={live?.flatMinor ?? 0}
      />
    </section>
  );
}
