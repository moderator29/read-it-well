import Link from "next/link";
import type { AgentProfile } from "@/lib/agent/types";
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
/*
 * `buildAgentNav` and `AgentNavList` used to live here. They moved to
 * `agent-nav-model.ts` and `components/app/NavTree.tsx`, because the two modes
 * were rendering two navigations that looked like two products: this one drew
 * ten 26px 3D BrandIcons in a column, which is the content family doing a
 * navigation's job, and a flat list of ten in which "List a property" sat at
 * the same level as "Settings".
 *
 * What is left here is what is genuinely Agent Mode's own: the mode pill and
 * the identity card.
 */

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
          {/* "Not signed in as an agent" is a sentence and it was ending at "Not
              signed in as an ag" in the rail. It wraps. */}
          <span className="block text-[0.875rem] font-semibold leading-snug text-[var(--nf-content-secondary)]">
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
