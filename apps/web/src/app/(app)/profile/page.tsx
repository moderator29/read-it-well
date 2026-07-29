import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { ProfileIdentityCard } from "@/components/app/account/ProfileIdentityCard";
import { Icon, type IconName } from "@/design-system/icons/Icon";
import { Reveal } from "@/components/site/Reveal";
import { loadProfileState } from "@/lib/profile/queries";
import { AccountProfile } from "./AccountProfile";

export const metadata: Metadata = { title: "Profile" };

/**
 * Profile.
 *
 * The account hub the tab bar points at: identity hero up top (gradient-ring
 * avatar, editable name and email, member-since, level and verification
 * badges, activity strip), then a compact quick-action grid to every account
 * surface. Grid tiles instead of a long list so the whole page fits one
 * phone screen without scrolling past the fold twice.
 *
 * Signed in, the hero is the real profiles row: avatar from the avatars
 * bucket, name and member-since from the database, counters from the person's
 * own bookings, saves and reviews, and an edit form that writes the row back
 * under row level security. Signed out, or before the platform keys land, the
 * hero is exactly the on-device card it has always been, so nothing anyone
 * typed on this phone is lost.
 */
export default async function ProfilePage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const account = await loadProfileState();

  const labels = { trips: "Trips", saved: t.nav.saved, reviews: "Reviews" };

  const actions: { href: string; label: string; icon: IconName; sub: string }[] = [
    { href: "/bookings", label: t.nav.bookings, icon: "booking", sub: "Trips and reservations" },
    { href: "/saved", label: t.nav.saved, icon: "favorites", sub: "Places you have kept" },
    { href: "/wallet", label: t.nav.wallet, icon: "wallet", sub: "Balance and payments" },
    { href: "/messages", label: t.nav.messages, icon: "chat", sub: "Chats with hosts" },
    { href: "/notifications", label: "Notifications", icon: "notification", sub: "Activity and alerts" },
    { href: "/settings", label: t.nav.settings, icon: "settings", sub: "Preferences and account" },
    { href: "/agents", label: t.landing.footer.becomeAgent, icon: "apartment", sub: "List your property" },
  ];

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t.nav.profile} />

      <Reveal>
        {account.state === "signed-in" ? (
          <AccountProfile
            profile={account.profile}
            memberSinceLabel={monthAndYear(account.profile.memberSince)}
            labels={labels}
          />
        ) : (
          <ProfileIdentityCard labels={labels} />
        )}
      </Reveal>

      {account.state === "no-row" && (
        <p
          role="status"
          className="nf-card mt-3 p-4 text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]"
        >
          We could not load your account profile just now, so this card is
          showing what is held on this device. Sign out and back in, then open
          this page again.
        </p>
      )}

      <Reveal delay={80}>
        <nav aria-label="Account shortcuts" className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {actions.map((a, i) => (
            <Link
              key={a.href}
              href={a.href}
              className={`nf-card nf-card--interactive flex flex-col gap-2.5 p-4 ${
                i === actions.length - 1 ? "col-span-2 sm:col-span-1" : ""
              }`}
            >
              <span className="block h-8 w-8">
                <Icon name={a.icon} fill />
              </span>
              <span className="leading-tight">
                <span className="block text-[0.875rem] font-semibold">{a.label}</span>
                <span className="mt-0.5 block text-[0.75rem] text-[var(--nf-content-muted)]">
                  {a.sub}
                </span>
              </span>
            </Link>
          ))}
        </nav>
      </Reveal>
    </div>
  );
}

/** Member-since reads as a month and a year, in Lagos time. */
function monthAndYear(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "today";
  return new Intl.DateTimeFormat("en-NG", {
    month: "long",
    year: "numeric",
    timeZone: "Africa/Lagos",
  }).format(date);
}
