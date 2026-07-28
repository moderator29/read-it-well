import Link from "next/link";
import type { Dictionary } from "@naijafinds/i18n";
import type { AgentProfile } from "@/lib/agent/types";
import { Logo } from "@/design-system/brand/Logo";
import { Icon, type IconName } from "@/design-system/icons/Icon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { ModeSwitcher } from "./ModeSwitcher";

/**
 * Agent Mode navigation rail.
 *
 * Ten destinations, frozen (Master Rule 17). This IA is identical across the
 * three source-of-truth references that show the agent workspace, so it is
 * settled and must not drift. The amber "Agent Mode" pill under the logo, the
 * identity card and the "Switch to Personal Mode" control are all part of the
 * established chrome, not decoration.
 */
type RailItem = { href: string; label: string; icon: IconName; badge?: number };

export function AgentRail({
  t,
  active,
  profile,
}: {
  t: Dictionary;
  active: string;
  profile: AgentProfile;
}) {
  const items: RailItem[] = [
    { href: "/agent/dashboard", label: t.agent.nav.dashboard, icon: "home" },
    { href: "/agent/listings", label: t.agent.nav.myListings, icon: "apartment" },
    { href: "/agent/list", label: t.agent.nav.listApartment, icon: "booking" },
    { href: "/agent/bookings", label: t.agent.nav.bookings, icon: "booking" },
    { href: "/agent/messages", label: t.agent.nav.messages, icon: "chat", badge: 3 },
    { href: "/agent/reviews", label: t.agent.nav.reviews, icon: "favorites" },
    { href: "/agent/earnings", label: t.agent.nav.earnings, icon: "wallet" },
    { href: "/agent/analytics", label: t.agent.nav.analytics, icon: "map" },
    { href: "/agent/verification", label: t.agent.nav.verification, icon: "verified" },
    { href: "/agent/settings", label: t.agent.nav.settings, icon: "settings" },
  ];

  return (
    <aside
      className="sticky top-0 hidden h-dvh w-[var(--nf-rail-width)] shrink-0 flex-col border-r border-[var(--nf-border-subtle)] bg-[var(--nf-surface-primary)] px-4 py-5 lg:flex"
      aria-label={t.agent.mode.workspaceLabel}
    >
      <Link href="/" aria-label={t.a11y.logoHome} className="mb-2 px-1">
        <Logo size={38} wordSize={19} />
      </Link>

      {/* Agent Mode marker, the amber pill from the reference. */}
      <span
        className="mb-5 ml-1 inline-flex w-fit items-center gap-1.5 rounded-[var(--nf-radius-pill)] px-2.5 py-1 text-[0.6875rem] font-bold"
        style={{
          background: "color-mix(in oklab, var(--nf-mode-agent) 20%, transparent)",
          color: "#FDBA74",
        }}
      >
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--nf-mode-agent)]" />
        {t.agent.mode.agent}
      </span>

      <nav aria-label={t.agent.mode.workspaceLabel} className="flex-1 overflow-y-auto">
        <ul className="space-y-0.5">
          {items.map((item) => {
            const isActive = item.href === active;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={[
                    "group flex items-center gap-3 rounded-[var(--nf-radius-md)] px-3 py-2.5 text-[0.9rem] font-medium transition-colors",
                    isActive
                      ? "text-[var(--nf-content-primary)]"
                      : "text-[var(--nf-content-secondary)] hover:bg-[var(--nf-glass-fill)] hover:text-[var(--nf-content-primary)]",
                  ].join(" ")}
                  style={
                    isActive
                      ? { background: "color-mix(in oklab, var(--nf-mode-agent) 18%, transparent)" }
                      : undefined
                  }
                >
                  <Icon name={item.icon} size={26} />
                  <span className="flex-1">{item.label}</span>
                  {item.badge ? (
                    <span
                      className="nf-numeric inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[0.6875rem] font-bold text-white"
                      style={{ background: "var(--nf-mode-agent)" }}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Identity card plus switch back to Personal Mode. */}
      <div className="mt-4 space-y-2">
        <div className="nf-card flex items-center gap-3 p-3">
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[0.8125rem] font-bold text-white"
            style={{ background: "var(--nf-gradient-agent)" }}
            aria-hidden="true"
          >
            {profile.displayName.slice(0, 1).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-[0.875rem] font-semibold">{profile.displayName}</span>
            {profile.verified && (
              <span className="mt-0.5 inline-flex items-center gap-1 text-[0.75rem] text-[var(--nf-state-success)]">
                <UiIcon name="verified" size={12} strokeWidth={2.2} />
                {t.agent.mode.verifiedAgent}
              </span>
            )}
          </span>
        </div>
        {/* This rail only renders inside Agent Mode, so the switch always
            offers Personal, independent of the cookie's current value. */}
        <ModeSwitcher t={t} current="agent" variant="menu" />
      </div>
    </aside>
  );
}
