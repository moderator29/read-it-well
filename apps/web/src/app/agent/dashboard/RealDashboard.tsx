import Link from "next/link";
import { formatDate, formatMoney, formatNumber, type Dictionary, type Locale } from "@naijafinds/i18n";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import type { AgentNumbers, ListingStatus } from "@/lib/agent/listings-queries";
import { fill } from "../_copy";

/**
 * The signed-in agent's real dashboard.
 *
 * Same furniture as the workspace elsewhere (glass tiles, the agent gradient,
 * the quick action deck), reading live counts instead of seeded ones. There is
 * deliberately no month-over-month delta on these tiles: the platform has no
 * history to compare against yet, and an invented trend arrow would be a lie
 * dressed as a number.
 */

function Tile({
  icon,
  label,
  value,
  href,
  className,
}: {
  icon: BrandIconName;
  label: string;
  value: string;
  href: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={["nf-card nf-card--interactive flex items-start gap-3 p-3.5 sm:gap-4 sm:p-4", className ?? ""].join(" ")}
    >
      <span className="h-14 w-14 shrink-0 sm:h-[42px] sm:w-[42px]">
        <BrandIcon name={icon} fill />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[0.75rem] font-medium text-[var(--nf-content-muted)]">
          {label}
        </span>
        <span className="nf-numeric mt-0.5 block text-[1.25rem] font-bold leading-none sm:text-[1.375rem]">
          {value}
        </span>
      </span>
    </Link>
  );
}

const STATUS_ORDER: ListingStatus[] = [
  "PUBLISHED",
  "APPROVED",
  "SUBMITTED",
  "UNDER_REVIEW",
  "MORE_INFO_REQUIRED",
  "DRAFT",
  "REJECTED",
  "SUSPENDED",
];

export function RealDashboard({
  t,
  locale,
  displayName,
  numbers,
}: {
  t: Dictionary;
  locale: Locale;
  displayName: string;
  numbers: AgentNumbers;
}) {
  const a = t.agent.dashboard;
  const d = t.agentListings.dashboard;
  const quickActions: { icon: BrandIconName; label: string; href: string }[] = [
    { icon: "homes-sparkle", label: a.addListing, href: "/agent/list" },
    { icon: "calendar-check", label: a.viewBookings, href: "/agent/bookings" },
    { icon: "shield-check", label: a.manageListings, href: "/agent/listings" },
    { icon: "wallet-secure", label: a.earningsReport, href: "/agent/earnings" },
  ];

  const withCounts = STATUS_ORDER.filter((status) => numbers.byStatus[status] > 0);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="nf-h1">{a.title}</h1>
          <p className="mt-1 text-[var(--nf-content-secondary)]">
            {fill(d.standing, { name: displayName })}
          </p>
        </div>
        <Link href="/agent/list" className="nf-btn nf-btn--primary">
          <BrandIcon name="homes-sparkle" size={24} />
          {a.addListing}
        </Link>
      </div>

      <div className="nf-panel-sunken grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <Tile
          icon="homes-sparkle"
          label={d.liveListings}
          value={formatNumber(numbers.liveListings, locale)}
          href="/agent/listings"
        />
        <Tile
          icon="shield-check"
          label={d.withReview}
          value={formatNumber(numbers.inReview, locale)}
          href="/agent/listings"
        />
        <Tile
          icon="house-sparkle"
          label={d.drafts}
          value={formatNumber(numbers.drafts, locale)}
          href="/agent/listings"
        />
        <Tile
          icon="calendar-check"
          label={d.upcomingStays}
          value={formatNumber(numbers.upcomingBookingCount, locale)}
          href="/agent/bookings"
        />
        <Tile
          icon="chat"
          label={d.unreadMessages}
          value={formatNumber(numbers.unreadMessages, locale)}
          href="/agent/messages"
          className="col-span-2 sm:col-span-1"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <section className="nf-card p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <h2 className="nf-h3">{t.agent.nav.myListings}</h2>
              {numbers.totalListings > 0 && (
                <span className="nf-count-badge">{formatNumber(numbers.totalListings, locale)}</span>
              )}
            </span>
            <Link
              href="/agent/listings"
              className="text-[0.8125rem] font-semibold text-[var(--nf-electric-300)] hover:underline"
            >
              {t.common.viewAll}
            </Link>
          </div>

          {numbers.totalListings === 0 ? (
            <p className="text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
              {d.noListings}
            </p>
          ) : (
            <ul className="space-y-2.5">
              {withCounts.map((status) => (
                <li key={status} className="flex items-center justify-between gap-4">
                  <span className="text-[0.875rem] text-[var(--nf-content-secondary)]">
                    {t.agentListings.workspace.status[status]}
                  </span>
                  <span className="nf-numeric text-[0.9375rem] font-bold">
                    {formatNumber(numbers.byStatus[status], locale)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <Link href="/agent/list" className="nf-btn nf-btn--glass mt-4 w-full">
            {a.addListing}
          </Link>
        </section>

        <section className="nf-card p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="nf-h3">{d.upcomingStays}</h2>
            <Link
              href="/agent/bookings"
              className="text-[0.8125rem] font-semibold text-[var(--nf-electric-300)] hover:underline"
            >
              {t.common.viewAll}
            </Link>
          </div>

          {numbers.upcomingBookings.length === 0 ? (
            <p className="text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
              {d.noStays}
            </p>
          ) : (
            <ul className="space-y-3">
              {numbers.upcomingBookings.map((booking) => (
                <li key={booking.id} className="flex items-center gap-4">
                  <span
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--nf-radius-md)]"
                    style={{ background: "var(--nf-surface-raised)" }}
                  >
                    <UiIcon name="calendar-booking" size={20} />
                  </span>
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block truncate text-[0.8125rem] font-semibold">
                      {booking.listingTitle}
                    </span>
                    <span className="block text-[0.75rem] text-[var(--nf-content-muted)]">
                      {fill(d.stayDates, {
                        from: formatDate(new Date(`${booking.checkIn}T00:00:00Z`), locale, {
                          day: "numeric",
                          month: "short",
                        }),
                        to: formatDate(new Date(`${booking.checkOut}T00:00:00Z`), locale, {
                          day: "numeric",
                          month: "short",
                        }),
                      })}
                    </span>
                  </span>
                  <span className="shrink-0 text-right leading-tight">
                    <span className="nf-numeric block text-[0.8125rem] font-bold">
                      {formatMoney(booking.totalMinor, locale, "NGN", { compact: true })}
                    </span>
                    <span
                      className={`nf-badge mt-0.5 ${
                        booking.status === "CONFIRMED" ? "nf-badge--approved" : "nf-badge--pending"
                      }`}
                    >
                      {booking.status === "CONFIRMED" ? a.confirmed : a.pending}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-4">
        <h2 className="nf-h3 mb-3">{a.quickActions}</h2>
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {quickActions.map((action) => (
            <li key={action.href}>
              <Link
                href={action.href}
                className="nf-card nf-card--interactive flex flex-col items-center gap-2 p-4 text-center sm:p-5"
              >
                <span className="h-13 w-13 sm:h-16 sm:w-16">
                  <BrandIcon name={action.icon} fill />
                </span>
                <span className="text-[0.8125rem] font-semibold">{action.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
