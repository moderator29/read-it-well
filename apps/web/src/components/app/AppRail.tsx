import Link from "next/link";
import type { Dictionary } from "@naijafinds/i18n";
import { Logo } from "@/design-system/brand/Logo";
import { Icon3D } from "@/design-system/icons/Icon3D";
import type { GlyphName } from "@/design-system/icons/glyphs";

/**
 * Personal Mode navigation rail.
 *
 * Twelve destinations in two groups, frozen per Master Rule 17. This IA is
 * confirmed by three independent source-of-truth references, including the
 * brand sheet whose icon row lists exactly these twelve in this order. It must
 * not drift between screens.
 */
type RailItem = { href: string; label: string; icon: GlyphName; badge?: number };

export function AppRail({
  t,
  active = "/home",
  userName,
}: {
  t: Dictionary;
  active?: string;
  userName: string;
}) {
  const discovery: RailItem[] = [
    { href: "/home", label: t.nav.home, icon: "home" },
    { href: "/search?type=hotel", label: t.nav.hotels, icon: "hotel" },
    { href: "/search?type=property", label: t.nav.apartments, icon: "apartment" },
    { href: "/search?type=home", label: t.nav.homes, icon: "homes" },
    { href: "/search?type=restaurant", label: t.nav.restaurants, icon: "restaurants" },
    { href: "/search?type=experience", label: t.nav.experiences, icon: "experiences" },
  ];

  const account: RailItem[] = [
    { href: "/bookings", label: t.nav.bookings, icon: "bookings" },
    { href: "/messages", label: t.nav.messages, icon: "messages" },
    { href: "/wallet", label: t.nav.wallet, icon: "wallet" },
    { href: "/assistant", label: t.nav.aiAssistant, icon: "ai-assistant" },
    { href: "/profile", label: t.nav.profile, icon: "profile" },
    { href: "/settings", label: t.nav.settings, icon: "settings" },
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
              : "text-[var(--nf-content-secondary)] hover:bg-[var(--nf-glass-fill)] hover:text-[var(--nf-content-primary)]",
          ].join(" ")}
        >
          <Icon3D name={item.icon} size={30} variant={isActive ? "tile" : "bare"} />
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
      className="sticky top-0 hidden h-dvh w-[var(--nf-rail-width)] shrink-0 flex-col border-r border-[var(--nf-border-subtle)] bg-[var(--nf-surface-primary)] px-4 py-5 lg:flex"
      aria-label={t.nav.primaryLabel}
    >
      <Link href="/" aria-label={t.a11y.logoHome} className="mb-6 px-1">
        <Logo size={38} wordSize={19} />
      </Link>

      <nav aria-label={t.nav.primaryLabel} className="flex-1 overflow-y-auto">
        <ul className="space-y-0.5">{discovery.map(row)}</ul>
        <hr className="my-4 border-[var(--nf-border-subtle)]" />
        <h2 className="nf-overline mb-2 px-3">{t.nav.accountLabel}</h2>
        <ul className="space-y-0.5">{account.map(row)}</ul>
      </nav>

      <div className="nf-card mt-4 flex items-center gap-3 p-3">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[0.8125rem] font-bold text-white"
          style={{ background: "var(--nf-gradient-brand)" }}
          aria-hidden="true"
        >
          {userName.slice(0, 1).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-[0.875rem] font-semibold">{userName}</span>
          <span className="nf-badge nf-badge--brand mt-1">Personal Mode</span>
        </span>
      </div>
    </aside>
  );
}
