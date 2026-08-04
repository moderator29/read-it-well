import Link from "next/link";
import type { Dictionary } from "@naijafinds/i18n";
import type { AgentProfile } from "@/lib/agent/types";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * Shared Agent Mode navigation pieces.
 *
 * The desktop rail and the mobile drawer must present the exact same ten
 * destinations with the exact same styling (Master Rule 17: one IA, one
 * chrome). Extracting the list, the mode pill and the identity card here means
 * neither surface can drift from the other. These components carry no hooks,
 * so they render on the server inside AgentRail and in the client bundle
 * inside the drawer without any boundary friction.
 */
export type AgentNavItem = { href: string; label: string; icon: BrandIconName; badge?: number };

/**
 * The ten frozen destinations, in reference order.
 *
 * `unreadMessages` is a real count of unread messages across the caller's own
 * conversations, resolved by the shell. It used to be a hardcoded 3, so every
 * agent saw three unread messages permanently, on a route that was a
 * placeholder, and no amount of reading could ever clear it. Zero means the
 * badge is not rendered at all.
 */
export function buildAgentNav(t: Dictionary, unreadMessages = 0): AgentNavItem[] {
  return [
    { href: "/agent/dashboard", label: t.agent.nav.dashboard, icon: "house-sparkle" },
    { href: "/agent/listings", label: t.agent.nav.myListings, icon: "homes-sparkle" },
    { href: "/agent/list", label: t.agent.nav.listApartment, icon: "calendar-check" },
    { href: "/agent/bookings", label: t.agent.nav.bookings, icon: "calendar-check" },
    {
      href: "/agent/messages",
      label: t.agent.nav.messages,
      icon: "chat",
      ...(unreadMessages > 0 ? { badge: unreadMessages } : {}),
    },
    { href: "/agent/reviews", label: t.agent.nav.reviews, icon: "heart-home" },
    { href: "/agent/earnings", label: t.agent.nav.earnings, icon: "wallet-secure" },
    { href: "/agent/analytics", label: t.agent.nav.analytics, icon: "map-route" },
    { href: "/agent/verification", label: t.agent.nav.verification, icon: "shield-check" },
    { href: "/agent/settings", label: t.agent.nav.settings, icon: "doc-shield" },
  ];
}

/** The "Agent Mode" marker pill. Brand blue, like every other accent. */
export function AgentModePill({ label, className }: { label: string; className?: string }) {
  return (
    <span
      className={[
        "inline-flex w-fit items-center gap-1.5 rounded-[var(--nf-radius-pill)] px-2.5 py-1 text-[0.6875rem] font-bold",
        className ?? "",
      ].join(" ")}
      style={{
        background: "color-mix(in oklab, var(--nf-mode-agent) 20%, transparent)",
        color: "color-mix(in oklab, var(--nf-mode-agent) 55%, white)",
      }}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--nf-mode-agent)]" />
      {label}
    </span>
  );
}

/**
 * The destination list itself. `onNavigate` lets the mobile drawer close as
 * soon as a link is chosen; the desktop rail simply omits it.
 */
export function AgentNavList({
  items,
  active,
  label,
  onNavigate,
}: {
  items: AgentNavItem[];
  active: string;
  label: string;
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label={label} className="flex-1 overflow-y-auto">
      <ul className="space-y-0.5">
        {items.map((item) => {
          const isActive = item.href === active;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
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
                <span className="h-[26px] w-[26px] shrink-0">
                  <BrandIcon name={item.icon} fill />
                </span>
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
  );
}

/**
 * Agent identity card: avatar initial, display name, verified marker.
 *
 * A null profile is a real state, not a missing one. The workspace chrome is
 * reachable signed out, and it used to fill this card from a seed object
 * called "Demo Agent", status APPROVED, verified true, so a stranger opening
 * an agent route was addressed as an approved verified agent by name. The card
 * now says what is true instead, and offers the way in.
 */
export function AgentIdentityCard({
  profile,
  verifiedLabel,
  visitorLabel,
  signInLabel,
}: {
  profile: AgentProfile | null;
  verifiedLabel: string;
  /** What the card says when nobody is signed in as an agent. */
  visitorLabel: string;
  signInLabel: string;
}) {
  if (!profile) {
    return (
      <div className="nf-card flex items-center gap-4 p-3">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--nf-border-subtle)] text-[var(--nf-content-muted)]"
          aria-hidden="true"
        >
          <UiIcon name="user" size={16} />
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-[0.875rem] font-semibold text-[var(--nf-content-secondary)]">
            {visitorLabel}
          </span>
          <Link
            href="/sign-in"
            className="mt-0.5 inline-block text-[0.75rem] font-semibold text-[var(--nf-electric-300)] underline-offset-4 hover:underline"
          >
            {signInLabel}
          </Link>
        </span>
      </div>
    );
  }

  return (
    <div className="nf-card flex items-center gap-4 p-3">
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
            <UiIcon name="verified" size={12} />
            {verifiedLabel}
          </span>
        )}
      </span>
    </div>
  );
}
