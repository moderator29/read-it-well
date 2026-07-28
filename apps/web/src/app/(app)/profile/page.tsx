import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { ProfileIdentityCard } from "@/components/app/account/ProfileIdentityCard";
import { Icon, type IconName } from "@/design-system/icons/Icon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Reveal } from "@/components/site/Reveal";

export const metadata: Metadata = { title: "Profile" };

/**
 * Profile.
 *
 * Identity at the top (editable display name, kept on this device until real
 * accounts land), then every account surface reachable as a tappable row, so
 * this page works as the account hub the tab bar points at.
 */
export default async function ProfilePage() {
  const locale = await getLocale();
  const t = getDictionary(locale);

  const rows: { href: string; label: string; icon: IconName; sub: string }[] = [
    { href: "/bookings", label: t.nav.bookings, icon: "booking", sub: "Trips and reservations" },
    { href: "/saved", label: t.nav.saved, icon: "favorites", sub: "Places you have kept" },
    { href: "/wallet", label: t.nav.wallet, icon: "wallet", sub: "Balance and payments" },
    { href: "/messages", label: t.nav.messages, icon: "chat", sub: "Chats with hosts" },
    { href: "/notifications", label: "Notifications", icon: "notification", sub: "Activity and alerts" },
    { href: "/agents", label: t.landing.footer.becomeAgent, icon: "apartment", sub: "List your property" },
    { href: "/settings", label: t.nav.settings, icon: "settings", sub: "Preferences and account" },
  ];

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t.nav.profile} />

      <Reveal>
        <ProfileIdentityCard
          labels={{ bookings: t.nav.bookings, saved: t.nav.saved, reviews: "Reviews" }}
        />
      </Reveal>

      <Reveal delay={80}>
        <ul className="nf-card mt-4 divide-y divide-[var(--nf-border-subtle)] p-0">
          {rows.map((r) => (
            <li key={r.href}>
              <Link
                href={r.href}
                className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-[var(--nf-glass-fill)]"
              >
                <span className="h-7 w-7 shrink-0">
                  <Icon name={r.icon} fill />
                </span>
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block text-[0.9063rem] font-semibold">{r.label}</span>
                  <span className="block text-[0.75rem] text-[var(--nf-content-muted)]">{r.sub}</span>
                </span>
                <UiIcon name="arrow-right" size={15} className="text-[var(--nf-content-muted)]" />
              </Link>
            </li>
          ))}
        </ul>
      </Reveal>
    </div>
  );
}
