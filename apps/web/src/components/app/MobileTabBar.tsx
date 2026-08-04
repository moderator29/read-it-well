import Link from "next/link";
import type { Dictionary } from "@naijafinds/i18n";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";

/**
 * Mobile tab bar.
 *
 * Five destinations: District, Explore, Map, Inbox, Profile, with Map raised
 * in the middle where a thumb reaches easiest and where the platform's own
 * answer to "what is near me" belongs. This is deliberately NOT the twelve
 * item desktop rail; a phone tab bar tops out at five before targets get too
 * small, so the rail's remaining destinations live under Profile rather than
 * being crammed in here.
 *
 * A floating dock, lifted clear of every edge rather than an edge-to-edge bar:
 * same shape language as the desktop dock, just wide enough to carry primary
 * navigation instead of quick-access shortcuts. Labels are spoken, not printed
 * (`aria-label`), so the dock stays compact without losing accessibility, and
 * the raised tab is the one exception because a control that size with no word
 * on it is a guess.
 */
type Tab = { href: string; label: string; icon: UiIconName; raised?: boolean };

export function MobileTabBar({
  t,
  active = "/home",
  unreadNotifications = 0,
}: {
  t: Dictionary;
  active?: string;
  /**
   * Unread notifications for this caller. The dock carries no Notifications
   * destination of its own, because six targets is already the ceiling on a
   * phone, so the marker sits on Profile, which is where the rail's remaining
   * destinations live. A dot rather than a number: at this size a numeral is
   * unreadable, and the job here is only to say "something is in there".
   */
  unreadNotifications?: number;
}) {
  const tabs: Tab[] = [
    { href: "/around", label: t.nav.around, icon: "grid" },
    { href: "/search", label: t.nav.explore, icon: "compass" },
    /* The map is the centre and it is raised, because "what is near me right
       now" is the question a phone is actually being held to answer. Bookings
       and Saved moved under Profile, where the rail's other destinations
       already live: six targets on a phone was one too many and the two that
       went are the two people reach for least often. */
    { href: "/search?view=map", label: t.nav.map, icon: "map", raised: true },
    { href: "/messages", label: t.nav.messages, icon: "chat-bubble" },
    { href: "/profile", label: t.nav.profile, icon: "user" },
  ];

  return (
    <nav
      aria-label={t.nav.primaryLabel}
      className="nf-tabbar fixed inset-x-4 bottom-[max(0.9rem,env(safe-area-inset-bottom))] z-50 mx-auto w-fit lg:hidden"
    >
      <ul className="flex items-center gap-1 px-1.5 py-1.5">
        {tabs.map((tab) => {
          const isActive = tab.href === active;
          /* Profile is the way through to notifications on a phone. */
          const marked = tab.href === "/profile" && unreadNotifications > 0;

          if (tab.raised) {
            return (
              <li key={tab.href} className="-mt-6">
                <Link
                  href={tab.href}
                  aria-current={isActive ? "page" : undefined}
                  aria-label={tab.label}
                  /* The fill is an inline style, not a Tailwind arbitrary
                     value: `var(--nf-gradient-cta)` contains commas, and an
                     arbitrary value carrying a comma does not survive the
                     class parser. It rendered as a transparent pill, which
                     made the raised tab the quietest thing in the dock. */
                  style={{ background: "var(--nf-gradient-cta)" }}
                  className="flex h-14 w-14 flex-col items-center justify-center gap-0.5 rounded-full border border-[color-mix(in_oklab,var(--nf-brand-primary)_60%,transparent)] text-[var(--nf-content-on-brand)] shadow-[0_0_18px_rgb(12_57_239_/_0.5)] transition-transform active:translate-y-px"
                >
                  <UiIcon name={tab.icon} size={21} strokeWidth={2} />
                  <span className="text-[0.5625rem] font-bold uppercase tracking-[0.06em]">
                    {tab.label}
                  </span>
                </Link>
              </li>
            );
          }

          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                aria-label={
                  marked
                    ? `${tab.label}, ${unreadNotifications} unread notification${
                        unreadNotifications === 1 ? "" : "s"
                      }`
                    : tab.label
                }
                title={tab.label}
                className={[
                  "nf-tab-pop flex h-12 w-12 items-center justify-center rounded-full transition-colors",
                  isActive
                    ? "text-white"
                    : "text-[var(--nf-content-primary)] opacity-75 hover:opacity-100",
                ].join(" ")}
              >
                <span className="nf-tab-pop__pill" aria-hidden="true" />
                {/* Stroked glyph; the active tab draws a heavier line. */}
                <span className="nf-tab-pop__icon relative">
                  <UiIcon name={tab.icon} size={22} strokeWidth={isActive ? 2 : 1.8} />
                  {marked && (
                    <span
                      aria-hidden="true"
                      className="absolute -right-0.5 -top-0.5 block h-2.5 w-2.5 rounded-full border-2 border-[var(--nf-surface-primary)] bg-[var(--nf-brand-primary)]"
                    />
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
