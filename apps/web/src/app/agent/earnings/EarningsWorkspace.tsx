import { formatDate, formatMoney, type Dictionary, type Locale } from "@naijafinds/i18n";
import { fill } from "../_copy";
import type { AgentEarnings } from "@/lib/agent/earnings-queries";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import { ButtonLink } from "@/components/ui/Button";

/**
 * The host's earnings console: what has actually settled, read straight from
 * the ledger.
 *
 * A server component on purpose: nothing here mutates, so there is no reason
 * to ship it as client JavaScript. Every figure comes from AgentEarnings
 * exactly as earnings-queries.ts computed it. RentMe charges no listing fee
 * and this page never invents one; the only fee copy on the page is the
 * generic reconciliation note, which names the payment processor's cut, not
 * a platform cut.
 */

export type EarningsCopy = Dictionary["agentEarnings"];

function monthLabel(year: number, month: number, locale: Locale): string {
  const date = new Date(Date.UTC(year, Math.max(0, month - 1), 1));
  return formatDate(date, locale, { month: "long", year: "numeric" });
}

function Tile({
  icon,
  label,
  value,
}: {
  icon: BrandIconName;
  label: string;
  value: string;
}) {
  return (
    <div className="nf-card flex flex-col gap-2 p-3.5 sm:gap-2.5 sm:p-4">
      <span className="h-9 w-9 shrink-0 sm:h-10 sm:w-10">
        <BrandIcon name={icon} fill />
      </span>
      <div className="min-w-0">
        <p className="leading-snug text-[0.75rem] font-medium text-[var(--nf-content-muted)]">{label}</p>
        <p className="nf-numeric mt-0.5 truncate text-[1.0625rem] font-bold leading-tight text-[var(--nf-content-primary)] sm:text-[1.25rem]">
          {value}
        </p>
      </div>
    </div>
  );
}

export function EarningsWorkspace({
  t,
  earnings,
  locale,
}: {
  t: EarningsCopy;
  earnings: AgentEarnings;
  locale: Locale;
}) {
  if (!earnings.readable) {
    return (
      <p
        className="rounded-[var(--nf-radius-md)] p-4 text-[0.875rem] font-medium leading-relaxed"
        style={{ background: "var(--nf-state-warning-surface)", color: "var(--nf-state-warning)" }}
        role="alert"
      >
        {t.unavailable}
      </p>
    );
  }

  if (earnings.months.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-10 text-center sm:py-14">
        <span className="block h-20 w-20">
          <BrandIcon name="wallet-secure" fill />
        </span>
        <h2 className="nf-h3">{t.emptyTitle}</h2>
        <p className="mx-auto max-w-[40ch] text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
          {t.emptyBody}
        </p>
        <ButtonLink href="/agent/bookings" variant="primary">
          {t.emptyAction}
        </ButtonLink>
      </div>
    );
  }

  const thisMonthMinor = earnings.currentMonth?.agentShareMinor ?? 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Tile icon="wallet-secure" label={t.totals.yourShare} value={formatMoney(earnings.totalAgentShareMinor, locale)} />
        <Tile icon="naira-hand" label={t.totals.guestsPaid} value={formatMoney(earnings.totalGrossMinor, locale)} />
        <Tile icon="calendar-check" label={t.totals.settledStays} value={String(earnings.settledStays)} />
        <Tile icon="chart-growth" label={t.totals.thisMonth} value={formatMoney(thisMonthMinor, locale)} />
      </div>

      <section className="nf-card p-4 sm:p-5">
        <h2 className="nf-h3">{t.byMonth}</h2>

        {/* Phone: stacked cards, so nothing scrolls sideways. */}
        <ul className="mt-3 space-y-3 sm:hidden">
          {earnings.months.map((month) => (
            <li
              key={month.key}
              className="rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] bg-[var(--nf-surface-raised)] p-3"
            >
              <div className="flex items-baseline justify-between gap-4">
                <p className="text-[0.875rem] font-semibold">{monthLabel(month.year, month.month, locale)}</p>
                <p className="nf-numeric text-[0.875rem] font-bold">{formatMoney(month.agentShareMinor, locale)}</p>
              </div>
              <p className="mt-1 text-[0.75rem] text-[var(--nf-content-muted)]">
                {month.stays === 1 ? t.staysOne : fill(t.stays, { count: month.stays })}
                {" · "}
                {t.monthGross} {formatMoney(month.grossMinor, locale)}
              </p>
            </li>
          ))}
        </ul>

        {/* Tablet and up: the full table. */}
        <div className="nf-scroll-x mt-3 hidden sm:block">
          <table className="w-full min-w-[30rem] text-left text-[0.8125rem]">
            <thead>
              <tr className="text-[0.6875rem] uppercase tracking-wide text-[var(--nf-content-muted)]">
                <th className="pb-2 font-semibold">{t.byMonth}</th>
                <th className="pb-2 text-right font-semibold">{t.stays}</th>
                <th className="pb-2 text-right font-semibold">{t.monthGross}</th>
                <th className="pb-2 text-right font-semibold">{t.monthShare}</th>
              </tr>
            </thead>
            <tbody>
              {earnings.months.map((month) => (
                <tr key={month.key} className="border-t border-[var(--nf-border-subtle)]">
                  <td className="py-2.5 font-medium">{monthLabel(month.year, month.month, locale)}</td>
                  <td className="nf-numeric py-2.5 text-right">{month.stays}</td>
                  <td className="nf-numeric py-2.5 text-right">{formatMoney(month.grossMinor, locale)}</td>
                  <td className="nf-numeric py-2.5 text-right font-semibold">
                    {formatMoney(month.agentShareMinor, locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="nf-card p-4 sm:p-5">
        <h2 className="nf-h3">{t.howTitle}</h2>
        <p className="mt-2 text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]">
          {t.howBody}
        </p>
      </section>
    </div>
  );
}
