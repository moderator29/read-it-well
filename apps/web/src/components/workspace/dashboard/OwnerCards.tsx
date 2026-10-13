import Link from "next/link";
import { formatMoney, formatNumber, plural, type Dictionary, type Locale } from "@vallo/i18n/core";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { IconPlate } from "@/components/ui/IconPlate";
import { Progress } from "@/components/ui/Progress";
import { PeriodBars } from "@/components/ui/charts/PeriodBars";
import { monthPoint, moneyTicks } from "@/components/agent/charts/month-points";
import type { AgreementWait, Building, RentMonth, TenancyRef, Visit } from "@/lib/workspace/dashboard-model";
import { DashCard, EmptyNote, Unavailable } from "./DashCard";
import { dayLabel, fillWords, slotLabel } from "./dashboard-format";

type Base = { t: Dictionary; locale: Locale; area?: string };

const tenancyHref = (id: string) => `/tenancy/${id}`;

/** The highlight: a lease ends today. Not drawn when none does. */
export function LeaseTodayCard({ refs, t, area }: Base & { refs: readonly TenancyRef[] }) {
  if (refs.length === 0) return null;
  const w = t.workspaceDash.owner.leaseToday;
  return (
    <section className={["wsd-lease", area ? `wsd-area-${area}` : ""].filter(Boolean).join(" ")} aria-label={w.title} data-testid="wsd-lease-today">
      <h2 className="wsd-card__title">{w.title}</h2>
      {refs.map((ref) => (
        <Link key={ref.id} href={tenancyHref(ref.id)} className="wsd-lease__row nf-tap">
          <IconPlate size="sm" shape="round" tone="warning">
            <UiIcon name="calendar-clock" size={20} />
          </IconPlate>
          <span className="wsd-row__body">
            <span className="wsd-lease__title">{ref.place ?? w.unnamed}</span>
            <br />
            <span className="wsd-lease__sub">{w.endsToday}</span>
          </span>
          <span className="wsd-row__end">
            <span className="wsd-card__action wsd-lease__open">{w.open}</span>
            <UiIcon name="chevron-right" size={16} />
          </span>
        </Link>
      ))}
    </section>
  );
}

/** Rent due this month against what is paid, with a progress bar. */
export function RentMonthCard({ rent, t, locale, area }: Base & { rent: RentMonth | null }) {
  const w = t.workspaceDash.owner.rentMonth;
  if (rent === null) {
    return (
      <DashCard title={w.title} area={area} testId="wsd-rent-month">
        <Unavailable text={t.workspaceDash.common.unavailable} />
      </DashCard>
    );
  }
  if (rent.openedCount === 0) {
    return (
      <DashCard title={w.title} area={area} testId="wsd-rent-month">
        <EmptyNote title={w.empty} body={w.emptyBody} />
        <p className="wsd-note">{w.note}</p>
      </DashCard>
    );
  }
  const paid = formatMoney(rent.paidMinor, locale);
  const due = formatMoney(rent.billedMinor, locale);
  return (
    <DashCard title={w.title} action={{ href: "/agent/earnings", label: t.agent.nav.earnings }} area={area} testId="wsd-rent-month">
      <div>
        <p className="wsd-big" data-testid="wsd-rent-paid">{paid}</p>
        <p className="wsd-note">
          {w.paid} · {w.due} {due}
        </p>
      </div>
      <Progress
        value={rent.paidMinor}
        max={Math.max(rent.billedMinor, 1)}
        label={fillWords(w.progress, { paid, due })}
        valueText={fillWords(w.progress, { paid, due })}
        locale={locale}
        tone="brand"
      />
      <p className="wsd-note">
        {plural(rent.openedCount, w.opened, locale)}. {w.note}
      </p>
    </DashCard>
  );
}

/** Rent paid in through Vallo, by month, for the last six months. */
export function RentTrendCard({ trend, t, locale, area }: Base & { trend: { key: string; minor: number }[] | null }) {
  const w = t.workspaceDash.owner.trend;
  if (trend === null) {
    return (
      <DashCard title={w.title} area={area} testId="wsd-rent-trend">
        <Unavailable text={t.workspaceDash.common.unavailable} />
      </DashCard>
    );
  }
  if (trend.every((p) => p.minor === 0)) {
    return (
      <DashCard title={w.title} area={area} testId="wsd-rent-trend">
        <EmptyNote title={w.empty} />
      </DashCard>
    );
  }
  const points = trend.map((p) => {
    const [year, month] = p.key.split("-").map(Number) as [number, number];
    return monthPoint({ key: p.key, year, month, minor: p.minor }, locale);
  });
  return (
    <DashCard title={w.title} action={{ href: "/agent/earnings", label: t.agent.nav.earnings }} area={area} testId="wsd-rent-trend">
      <PeriodBars
        points={points}
        yTicks={moneyTicks(points, locale)}
        label={w.title}
        periodHead={w.periodHead}
        valueHead={w.valueHead}
        emphasis="last"
        height={152}
      />
    </DashCard>
  );
}

/** Payment due: the next rent that falls due on a running tenancy. */
export function PaymentDueCard({ next, t, locale, area }: Base & { next: TenancyRef | null | undefined }) {
  const w = t.workspaceDash.owner.paymentDue;
  if (next === undefined) {
    return (
      <DashCard title={w.title} area={area} testId="wsd-payment-due">
        <Unavailable text={t.workspaceDash.common.unavailable} />
      </DashCard>
    );
  }
  if (next === null) {
    return (
      <DashCard title={w.title} area={area} testId="wsd-payment-due">
        <EmptyNote title={w.empty} body={w.emptyBody} />
      </DashCard>
    );
  }
  return (
    <DashCard title={w.title} area={area} testId="wsd-payment-due">
      <div>
        <p className="wsd-big">{dayLabel(next.endsOn, locale, true)}</p>
        <p className="wsd-note">
          {next.days === 0 ? w.today : plural(next.days, w.inDays, locale)}
          {" · "}
          {next.place ?? t.workspaceDash.owner.upcoming.unnamed}
        </p>
      </div>
      <p className="wsd-note">{fillWords(w.current, { amount: formatMoney(next.rentMinor, locale) })}</p>
      <Link href={tenancyHref(next.id)} className="nf-btn nf-btn--glass nf-btn--sm">
        {w.open}
      </Link>
    </DashCard>
  );
}

function Row({ href, plate, title, sub, end }: { href: string; plate: "calendar-booking" | "calendar-clock" | "document"; title: string; sub: string; end?: string }) {
  return (
    <li>
      <Link href={href} className="wsd-row nf-tap">
        <IconPlate size="sm" shape="round" tone="brand">
          <UiIcon name={plate} size={20} />
        </IconPlate>
        <span className="wsd-row__body">
          <span className="wsd-row__title">{title}</span>
          <br />
          <span className="wsd-row__sub">{sub}</span>
        </span>
        <span className="wsd-row__end">
          {end ? <span className="wsd-row__sub">{end}</span> : null}
          <UiIcon name="chevron-right" size={16} />
        </span>
      </Link>
    </li>
  );
}

/** What is coming: visits this week, renewals in 90 days, agreements waiting. Each group has its own empty line. */
export function UpcomingCard({
  visits,
  renewals,
  agreements,
  places,
  t,
  locale,
  area,
}: Base & {
  visits: readonly Visit[] | null;
  renewals: readonly TenancyRef[] | null;
  agreements: readonly AgreementWait[] | null;
  places: ReadonlyMap<string, string>;
}) {
  const w = t.workspaceDash.owner.upcoming;
  const none = t.workspaceDash.common.unavailable;
  return (
    <DashCard title={w.title} area={area} testId="wsd-upcoming">
      <h3 className="wsd-subhead">{w.agreements}</h3>
      {agreements === null ? (
        <Unavailable text={none} />
      ) : agreements.length === 0 ? (
        <p className="wsd-note">{w.noAgreements}</p>
      ) : (
        <ul className="wsd-list">
          {agreements.slice(0, 3).map((a) => (
            <Row
              key={a.id}
              href={`/agreements/${a.id}`}
              plate="document"
              title={(a.listingId && places.get(a.listingId)) || w.agreement}
              sub={w.confirmTerms}
            />
          ))}
        </ul>
      )}

      <h3 className="wsd-subhead">{w.visits}</h3>
      {visits === null ? (
        <Unavailable text={none} />
      ) : visits.length === 0 ? (
        <p className="wsd-note">{w.noVisits}</p>
      ) : (
        <ul className="wsd-list">
          {visits.slice(0, 4).map((v) => (
            <Row key={v.id} href="/agent/inspections" plate="calendar-booking" title={v.listingTitle ?? w.unnamed} sub={slotLabel(v.slotAt, locale)} />
          ))}
        </ul>
      )}

      <h3 className="wsd-subhead">{w.renewals}</h3>
      {renewals === null ? (
        <Unavailable text={none} />
      ) : renewals.length === 0 ? (
        <p className="wsd-note">{w.noRenewals}</p>
      ) : (
        <ul className="wsd-list">
          {renewals.slice(0, 4).map((r) => (
            <Row
              key={r.id}
              href={tenancyHref(r.id)}
              plate="calendar-clock"
              title={r.place ?? w.unnamed}
              sub={fillWords(w.endsOn, { date: dayLabel(r.endsOn, locale) })}
              end={plural(r.days, t.workspaceDash.owner.paymentDue.inDays, locale)}
            />
          ))}
        </ul>
      )}
    </DashCard>
  );
}

/** The property card: one unit with its state and the doors an owner uses most. */
export function PropertyCard({
  property,
  tenancyId,
  t,
  locale,
  area,
}: Base & { property: Building | null; tenancyId: string | null }) {
  const w = t.workspaceDash.owner.property;
  if (property === null) return null;
  const live = property.status === "PUBLISHED" || property.status === "APPROVED";
  const state =
    property.letState === "let" && property.tenancyEndsOn
      ? fillWords(w.letUntil, { date: dayLabel(property.tenancyEndsOn, locale, true) })
      : live
        ? w.vacant
        : w.offMarket;
  const actions: { href: string; label: string; icon: "key" | "wallet" | "house" | "calendar-booking" }[] = [
    ...(tenancyId ? [{ href: tenancyHref(tenancyId), label: w.tenancy, icon: "key" as const }] : []),
    { href: "/agent/earnings", label: w.earnings, icon: "wallet" },
    { href: `/agent/listings/${property.listingId}`, label: w.listing, icon: "house" },
    { href: "/agent/inspections", label: w.visits, icon: "calendar-booking" },
  ];
  return (
    <DashCard title={w.title} action={{ href: "/agent/portfolio", label: t.workspaceDash.common.viewAll }} area={area} testId="wsd-property">
      <div className="wsd-row" style={{ borderBlockStart: 0 }}>
        <IconPlate size="sm" shape="round" tone="brand">
          <UiIcon name="building-apartment" size={20} />
        </IconPlate>
        <span className="wsd-row__body">
          <span className="wsd-row__title">{property.place || t.workspaceDash.owner.upcoming.unnamed}</span>
          <br />
          <span className="wsd-row__sub">
            {state}
            {property.rentMinor ? ` · ${formatMoney(property.rentMinor, locale)}` : ""}
            {property.bedrooms ? ` · ${fillWords(t.workspaceDash.agent.featured.bedrooms, { count: formatNumber(property.bedrooms, locale) })}` : ""}
          </span>
        </span>
      </div>
      <ul className="wsd-list">
        {actions.map((a) => (
          <li key={a.href + a.label}>
            <Link href={a.href} className="wsd-row nf-tap">
              <UiIcon name={a.icon} size={20} />
              <span className="wsd-row__body">
                <span className="wsd-row__title">{a.label}</span>
              </span>
              <span className="wsd-row__end">
                <UiIcon name="chevron-right" size={16} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </DashCard>
  );
}
