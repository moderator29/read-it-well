import Link from "next/link";
import type { Dictionary } from "@naijafinds/i18n";
import { Logo } from "@/design-system/brand/Logo";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";

/**
 * Personal Mode navigation rail.
 *
 * Twelve destinations in two groups, frozen per Master Rule 17. This IA is
 * confirmed by three independent source-of-truth references, including the
 * brand sheet whose icon row lists exactly these twelve in this order. It must
 * not drift between screens.
 *
 * Navigation rows use the tier one stroked glyphs; the 3D family stays on
 * content surfaces and the promo card below.
 */
type RailItem = { href: string; label: string; icon: UiIconName; badge?: number };

export function AppRail({
  t,
  active = "/home",
  userName,
  variant = "rail",
}: {
  t: Dictionary;
  active?: string;
  userName: string;
  /**
   * `rail` is the sticky desktop column, hidden below lg. `drawer` renders the
   * same navigation unconditionally for the mobile slide-in, so the IA cannot
   * drift between the two presentations (Master Rule 17).
   */
  variant?: "rail" | "drawer";
}) {
  const discovery: RailItem[] = [
    { href: "/home", label: t.nav.home, icon: "home" },
    { href: "/rent", label: t.nav.rent, icon: "key" },
    { href: "/search?type=hotel", label: t.nav.hotels, icon: "building-hotel" },
    { href: "/search?type=property", label: t.nav.apartments, icon: "building-apartment" },
    { href: "/search?type=home", label: t.nav.homes, icon: "house" },
    { href: "/search?type=restaurant", label: t.nav.restaurants, icon: "utensils" },
    { href: "/search?type=experience", label: t.nav.experiences, icon: "ticket" },
  ];

  const account: RailItem[] = [
    { href: "/bookings", label: t.nav.bookings, icon: "calendar-booking" },
    { href: "/messages", label: t.nav.messages, icon: "chat-bubble" },
    { href: "/notifications", label: "Notifications", icon: "bell" },
    { href: "/wallet", label: t.nav.wallet, icon: "wallet" },
    { href: "/assistant", label: t.nav.aiAssistant, icon: "sparkle" },
    { href: "/profile", label: t.nav.profile, icon: "user" },
    { href: "/settings", label: t.nav.settings, icon: "settings-gear" },
  ];

  const row = (item: RailItem) => {
    const isActive = item.href === active;
    return (
      <li key={item.href}>
        <Link
          href={item.href}
          aria-current={isActive ? "page" : undefined}
          className={[
            "group flex items-center gap-3 rounded-[var(--nf-radius-md)] px-3 py-2.5 text-[0.9rem] font-medium transition-colors",
            isActive
              ? "bg-[color-mix(in_oklab,var(--nf-brand-primary)_22%,transparent)] text-[var(--nf-content-primary)]"
              : "text-[var(--nf-content-primary)] hover:bg-[var(--nf-glass-fill)] hover:text-[var(--nf-content-primary)]",
          ].join(" ")}
        >
          {/* Stroked glyph, 22px in the drawer and 24px on the desktop rail.
              It follows the row text: muted at rest, full strength active. */}
          <UiIcon
            name={item.icon}
            size={24}
            className={[
              "h-[22px] w-[22px] shrink-0 transition-colors lg:h-6 lg:w-6",
              isActive
                ? ""
                : "text-[var(--nf-content-primary)] group-hover:text-[var(--nf-content-primary)]",
            ].join(" ")}
          />
          <span className="flex-1">{item.label}</span>
          {item.badge ? (
            <span className="nf-numeric nf-badge nf-badge--brand">{item.badge}</span>
          ) : null}
        </Link>
      </li>
    );
  };

  return (
    <aside
      className={
        variant === "rail"
          ? "sticky top-0 hidden h-dvh w-[var(--nf-rail-width)] shrink-0 flex-col border-r border-[var(--nf-border-subtle)] bg-[var(--nf-surface-primary)] px-4 py-5 lg:flex"
          : "flex h-full w-full flex-col px-4 py-5"
      }
      aria-label={t.nav.primaryLabel}
    >
      <Link href="/" aria-label={t.a11y.logoHome} className="mb-6 px-1">
        <Logo size={46} wordSize={21} responsive />
      </Link>

      <nav aria-label={t.nav.primaryLabel} className="flex-1 overflow-y-auto">
        <ul className="space-y-0.5">{discovery.map(row)}</ul>
        <hr className="my-4 border-[var(--nf-border-subtle)]" />
        <h2 className="nf-overline mb-2 px-3">{t.nav.accountLabel}</h2>
        <ul className="space-y-0.5">{account.map(row)}</ul>
      </nav>

      {/* Become an Agent, the entry point into Agent Mode from Personal Mode.
          Reached from the rail per the design direction, so a normal user can
          discover it without leaving the workspace (Master Rule 18). */}
      <Link
        href="/agents"
        className="mt-4 flex items-center gap-3 rounded-[var(--nf-radius-lg)] border border-[color-mix(in_oklab,var(--nf-mode-agent)_40%,transparent)] p-3 transition-colors hover:bg-[color-mix(in_oklab,var(--nf-mode-agent)_10%,transparent)]"
      >
        <span className="h-7 w-7 shrink-0 lg:h-8 lg:w-8">
          <BrandIcon name="homes-sparkle" fill />
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block text-[0.8125rem] font-semibold">{t.home.agentCard.action}</span>
          <span className="block text-[0.6875rem] text-[var(--nf-content-muted)]">
            {t.agent.mode.manageSub}
          </span>
        </span>
      </Link>

      <div className="nf-card mt-2 flex items-center gap-3 p-3">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[0.8125rem] font-bold text-white"
          style={{ background: "var(--nf-gradient-brand)" }}
          aria-hidden="true"
        >
          {userName.slice(0, 1).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-[0.875rem] font-semibold">{userName}</span>
          <span className="nf-badge nf-badge--brand mt-1">{t.agent.mode.personal}</span>
        </span>
      </div>
    </aside>
  );
}
