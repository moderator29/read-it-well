import type { Metadata } from "next";
import { formatMoney, getDictionary } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { getFeeConsole, type FeeRateView } from "@/lib/admin/money-queries";
import { getRevenueSummary, REVENUE_WINDOW_DAYS } from "@/lib/admin/revenue-queries";
import type { RevenueSummary } from "@/lib/admin/revenue-queries";
import { adminUi, type AdminUi } from "../_components/ui";
import { FeeRateForm } from "../_components/MoneyDecisions";

export const metadata: Metadata = {
  title: "Fees",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const SOURCE_LABEL: Record<string, string> = {
  escrow_commission: "Commission on released escrow",
  listing_fee: "Listing fee",
};

/**
 * What the platform charges, what it has earned, and the controls to change it.
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
 *
 * THE EARNED SECTION IS THE OTHER HALF OF THE SAME QUESTION, and it is new.
 * A rate table says what the platform intends to charge. It cannot say whether
 * a single naira ever arrived, and until `public.platform_revenue` existed the
 * answer was that commission was withheld from payees and credited to nobody.
 * Showing the rate and the receipts on one screen is what makes the difference
 * visible: a rate above zero with nothing earned beside it is now a question an
 * operator can see rather than one nobody could ask.
 */
export default async function AdminFeesPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const ui = adminUi(t, locale);

  const [read, revenue] = await Promise.all([
    getFeeConsole(),
    getRevenueSummary(REVENUE_WINDOW_DAYS),
  ]);

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

      <Earned summary={revenue.state === "ok" ? revenue.data : null} ui={ui} locale={locale} />
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

/**
 * What has actually landed in `public.platform_revenue`.
 *
 * Read through `public.admin_revenue_summary`, because the table denies every
 * browser-reachable role outright. An unavailable read renders as a refusal
 * rather than as zero: "you cannot see this" and "the platform has earned
 * nothing" are very different sentences and must never be printed the same way.
 */
function Earned({
  summary,
  ui,
  locale,
}: {
  summary: RevenueSummary | null;
  ui: AdminUi;
  locale: Awaited<ReturnType<typeof getLocale>>;
}) {
  if (!summary) {
    return (
      <ui.Section title="What the platform has earned">
        <ui.QueueUnavailable />
      </ui.Section>
    );
  }

  return (
    <ui.Section
      title="What the platform has earned"
      hint={`Booked to the revenue ledger, which is written in the same transaction that credits the payee. Totals cover the last ${summary.windowDays} days.`}
    >
      <ui.StatRow>
        <ui.Stat
          label={`Last ${summary.windowDays} days`}
          value={formatMoney(summary.windowTotalMinor, locale)}
          hint={summary.windowTotalMinor === 0 ? "Every rate is zero today" : undefined}
        />
        <ui.Stat
          label="All time"
          value={formatMoney(summary.allTimeMinor, locale)}
          hint="Since the revenue ledger existed"
        />
      </ui.StatRow>

      <div className="nf-card">
        <ul className="nf-rows nf-group">
          {summary.bySource.map((line) => (
            <li key={line.source} className="nf-row">
              <span className="min-w-0 flex-1">
                <span className="nf-body block font-semibold text-content">
                  {SOURCE_LABEL[line.source] ?? line.source}
                </span>
                <span className="nf-caption block">
                  {line.entries === 0
                    ? "Nothing booked in this window"
                    : `${line.entries === 1 ? "1 entry" : `${line.entries} entries`}`}
                </span>
              </span>
              <span className="nf-numeric nf-body shrink-0 font-bold">
                {formatMoney(line.amountMinor, locale)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {summary.recent.length > 0 && (
        <div className="mt-block">
          <h3 className="nf-overline">The most recent entries</h3>
          <div className="nf-card mt-heading">
            <ul className="nf-rows nf-group">
              {summary.recent.map((entry) => (
                <li key={entry.id} className="nf-row">
                  <span className="min-w-0 flex-1">
                    <span className="nf-body block font-semibold text-content">
                      {SOURCE_LABEL[entry.source] ?? entry.source}
                    </span>
                    <span className="nf-caption block truncate">
                      {entry.reference} · {ui.when(entry.createdAt)}
                    </span>
                  </span>
                  <span className="nf-numeric nf-body shrink-0 font-bold">
                    {formatMoney(entry.amountMinor, locale)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </ui.Section>
  );
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
    <section className="nf-card nf-section--tight p-card">
      <h2 className="nf-h4">{title}</h2>
      <p className="nf-body-sm mt-row max-w-[68ch] text-content-2">{blurb}</p>

      <p className="nf-numeric nf-h2 mt-group text-content">
        {live ? describe(live, locale) : "No rate on record"}
      </p>
      <p className="nf-caption mt-inline-tight">
        {live
          ? `In force since ${ui.when(live.effectiveFrom)}`
          : "Nothing is being charged, because no rate exists at all. That is a bug rather than a decision."}
      </p>

      <h3 className="nf-overline mt-block">Every rate there has ever been</h3>
      <ul className="mt-heading">
        {rates.map((rate) => (
          <li
            key={rate.id}
            className="flex flex-wrap items-baseline justify-between gap-x-group gap-y-inline-tight border-t border-[var(--nf-border-subtle)] py-row"
          >
            <span className="min-w-0">
              <span className="nf-body font-medium text-content">{describe(rate, locale)}</span>
              {rate.inForce && <span className="nf-badge nf-badge--brand ml-inline">In force</span>}
              {rate.scheduled && <span className="nf-badge ml-inline">Starts later</span>}
              {rate.note && (
                <span className="nf-caption mt-inline-tight block max-w-[68ch]">{rate.note}</span>
              )}
            </span>
            <span className="nf-caption shrink-0 text-right">
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
