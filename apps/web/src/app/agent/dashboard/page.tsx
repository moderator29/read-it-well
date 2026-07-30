import type { Metadata } from "next";
import Link from "next/link";
import { formatMoney, getDictionary, formatNumber } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { getAgentRepository } from "@/lib/agent/repository";
import { AgentShell } from "@/components/agent/AgentShell";
import { StatCard } from "@/components/agent/StatCard";
import { AreaSparkline } from "@/components/agent/charts/AreaSparkline";
import { DonutChart } from "@/components/agent/charts/DonutChart";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import {
  agentProfileFrom,
  getAgentContext,
  readAgentNumbers,
} from "@/lib/agent/listings-queries";
import { RealDashboard } from "./RealDashboard";

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await getLocale());
  return { title: t.agent.dashboard.title, robots: { index: false, follow: false } };
}

export default async function AgentDashboardPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);

  // A signed-in approved agent sees their own numbers, read live under RLS.
  // Everyone else keeps the designed workspace on its seeded content, which is
  // labelled as such by the panel below.
  const context = await getAgentContext();
  if (context.state === "agent") {
    const numbers = await readAgentNumbers(context.supabase, context.agent.id, context.user.id);
    return (
      <AgentShell
        t={t}
        locale={locale}
        active="/agent/dashboard"
        profile={agentProfileFrom(context.agent)}
      >
        <RealDashboard
          t={t}
          locale={locale}
          displayName={context.agent.displayName}
          numbers={numbers}
        />
      </AgentShell>
    );
  }

  const repo = getAgentRepository();
  const [profile, d] = await Promise.all([repo.getProfile(), repo.getDashboard()]);

  const a = t.agent.dashboard;

  const quickActions: { icon: BrandIconName; label: string; href: string }[] = [
    { icon: "homes-sparkle", label: a.addListing, href: "/agent/list" },
    { icon: "calendar-check", label: a.viewBookings, href: "/agent/bookings" },
    { icon: "shield-check", label: a.manageListings, href: "/agent/listings" },
    { icon: "wallet-secure", label: a.earningsReport, href: "/agent/earnings" },
  ];

  return (
    <AgentShell t={t} locale={locale} active="/agent/dashboard" profile={profile}>
      {repo.isSeed && (
        <p className="nf-badge nf-badge--warning mb-5">{a.sampleNote}</p>
      )}

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="nf-h1">{a.title}</h1>
          <p className="mt-1 text-[var(--nf-content-secondary)]">{a.subtitle}</p>
        </div>
        <Link href="/agent/list" className="nf-btn nf-btn--primary">
          <BrandIcon name="homes-sparkle" size={22} />
          {a.addListing}
        </Link>
      </div>

      {/* Stat row: two-up on phones (the odd fifth tile going full width so no
          orphan hangs in a half-empty row), three-up on tablets, five across
          on desktop. */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          icon="wallet-secure"
          label={a.totalEarnings}
          value={formatMoney(d.totalEarningsMinor, locale, "NGN", { compact: true })}
          deltaPct={d.deltas.earnings}
          deltaLabel={a.lastMonth}
        />
        <StatCard
          icon="calendar-check"
          label={a.totalBookings}
          value={formatNumber(d.totalBookings, locale)}
          deltaPct={d.deltas.bookings}
          deltaLabel={a.lastMonth}
        />
        <StatCard
          icon="homes-sparkle"
          label={a.activeListings}
          value={formatNumber(d.activeListings, locale)}
          deltaPct={d.deltas.listings}
          deltaLabel={a.lastMonth}
        />
        <StatCard
          icon="house-sparkle"
          label={a.occupancyRate}
          value={`${d.occupancyPct}%`}
          deltaPct={d.deltas.occupancy}
          deltaLabel={a.lastMonth}
        />
        <StatCard
          icon="chat"
          label={a.responseRate}
          value={`${d.responsePct}%`}
          deltaPct={d.deltas.response}
          deltaLabel={a.lastMonth}
          className="col-span-2 sm:col-span-1"
        />
      </div>

      {/* Earnings + recent bookings */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <section className="nf-card p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="nf-h3">{a.earningsOverview}</h2>
            <span className="nf-chip">{a.thisMonth}</span>
          </div>
          <p className="nf-numeric text-[1.5rem] font-bold text-[var(--nf-content-primary)] sm:text-[1.75rem]">
            {formatMoney(d.totalEarningsMinor, locale)}
          </p>
          <p
            className="nf-numeric text-[0.8125rem] font-semibold"
            style={{ color: "var(--nf-state-success)" }}
          >
            +{d.deltas.earnings}% {a.lastMonth}
          </p>
          <AreaSparkline data={d.earningsSeries} label={a.earningsOverview} className="mt-3" />
        </section>

        <section className="nf-card p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="nf-h3">{a.recentBookings}</h2>
            <Link href="/agent/bookings" className="text-[0.8125rem] font-semibold text-[var(--nf-electric-300)] hover:underline">
              {t.common.viewAll}
            </Link>
          </div>
          <ul className="space-y-3">
            {d.recentBookings.map((b) => (
              <li key={b.id} className="flex items-center gap-4">
                <span
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--nf-radius-md)]"
                  style={{ background: "var(--nf-surface-raised)" }}
                >
                  <BrandIcon name="homes-sparkle" size={26} />
                </span>
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block truncate text-[0.8125rem] font-semibold">{b.title}</span>
                  <span className="block text-[0.75rem] text-[var(--nf-content-muted)]">{b.dates}</span>
                </span>
                <span className="shrink-0 text-right leading-tight">
                  <span className="nf-numeric block text-[0.8125rem] font-bold">
                    {formatMoney(b.amountMinor, locale, "NGN", { compact: true })}
                  </span>
                  <span
                    className="nf-badge mt-0.5"
                    style={
                      b.status === "confirmed"
                        ? { background: "var(--nf-state-success-surface)", color: "var(--nf-state-success)" }
                        : { background: "var(--nf-state-warning-surface)", color: "var(--nf-state-warning)" }
                    }
                  >
                    {b.status === "confirmed" ? a.confirmed : a.pending}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Listing performance + sources + messages */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <section className="nf-card overflow-hidden p-4 sm:p-5">
          <h2 className="nf-h3 mb-3">{a.listingPerformance}</h2>

          {/* Phone: each listing as a stacked card, so nothing scrolls sideways. */}
          <ul className="space-y-3 sm:hidden">
            {d.listingPerformance.map((l) => (
              <li
                key={l.id}
                className="rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] bg-[var(--nf-surface-raised)] p-3"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <p className="min-w-0 truncate text-[0.8125rem] font-semibold">{l.title}</p>
                  <p className="nf-numeric shrink-0 text-[0.8125rem] font-bold">
                    {formatMoney(l.revenueMinor, locale, "NGN", { compact: true })}
                  </p>
                </div>
                <dl className="mt-2 grid grid-cols-3 gap-2">
                  <div>
                    <dt className="text-[0.625rem] uppercase tracking-wide text-[var(--nf-content-muted)]">
                      {a.views}
                    </dt>
                    <dd className="nf-numeric text-[0.8125rem] font-semibold">
                      {formatNumber(l.views, locale)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[0.625rem] uppercase tracking-wide text-[var(--nf-content-muted)]">
                      {t.agent.nav.bookings}
                    </dt>
                    <dd className="nf-numeric text-[0.8125rem] font-semibold">{l.bookings}</dd>
                  </div>
                  <div>
                    <dt className="text-[0.625rem] uppercase tracking-wide text-[var(--nf-content-muted)]">
                      {a.occupancyRate}
                    </dt>
                    <dd className="nf-numeric text-[0.8125rem] font-semibold">{l.occupancyPct}%</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>

          {/* Tablet and up: the full comparison table. */}
          <div className="nf-scroll-x hidden sm:block">
            <table className="w-full min-w-[34rem] text-left text-[0.8125rem]">
              <thead>
                <tr className="text-[0.6875rem] uppercase tracking-wide text-[var(--nf-content-muted)]">
                  <th className="pb-2 font-semibold">{t.agent.nav.myListings}</th>
                  <th className="pb-2 text-right font-semibold">{a.views}</th>
                  <th className="pb-2 text-right font-semibold">{t.agent.nav.bookings}</th>
                  <th className="pb-2 text-right font-semibold">{a.occupancyRate}</th>
                  <th className="pb-2 text-right font-semibold">{a.revenue}</th>
                </tr>
              </thead>
              <tbody>
                {d.listingPerformance.map((l) => (
                  <tr key={l.id} className="border-t border-[var(--nf-border-subtle)]">
                    <td className="py-2.5 font-medium">{l.title}</td>
                    <td className="nf-numeric py-2.5 text-right">{formatNumber(l.views, locale)}</td>
                    <td className="nf-numeric py-2.5 text-right">{l.bookings}</td>
                    <td className="nf-numeric py-2.5 text-right">{l.occupancyPct}%</td>
                    <td className="nf-numeric py-2.5 text-right font-semibold">
                      {formatMoney(l.revenueMinor, locale, "NGN", { compact: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="space-y-4">
          <section className="nf-card p-4 sm:p-5">
            <h2 className="nf-h3 mb-4">{a.bookingSources}</h2>
            <DonutChart
              segments={d.bookingSources}
              centerLabel={a.totalBookings}
              centerValue={d.totalBookings}
            />
          </section>

          <section className="nf-card p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="nf-h3">{a.guestMessages}</h2>
              <Link href="/agent/messages" className="text-[0.8125rem] font-semibold text-[var(--nf-electric-300)] hover:underline">
                {t.common.viewAll}
              </Link>
            </div>
            <ul className="space-y-3">
              {d.guestMessages.map((m) => (
                <li key={m.id} className="flex items-center gap-4">
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[0.75rem] font-bold text-white"
                    style={{ background: "var(--nf-gradient-brand)" }}
                    aria-hidden="true"
                  >
                    {m.from.slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block truncate text-[0.8125rem] font-semibold">{m.from}</span>
                    <span className="block truncate text-[0.75rem] text-[var(--nf-content-muted)]">
                      {m.preview}
                    </span>
                  </span>
                  <span className="shrink-0 text-[0.6875rem] text-[var(--nf-content-muted)]">{m.ago}</span>
                  {m.unread && <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--nf-mode-agent)]" />}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      {/* Quick actions */}
      <section className="mt-4">
        <h2 className="nf-h3 mb-3">{a.quickActions}</h2>
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {quickActions.map((q) => (
            <li key={q.href}>
              <Link
                href={q.href}
                className="nf-card nf-card--interactive flex flex-col items-center gap-2 p-4 text-center sm:p-5"
              >
                <span className="h-13 w-13 sm:h-16 sm:w-16">
                  <BrandIcon name={q.icon} fill />
                </span>
                <span className="text-[0.8125rem] font-semibold">{q.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </AgentShell>
  );
}
