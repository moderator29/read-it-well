import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatNumber, type Locale } from "@vallo/i18n/core";
import { initial } from "@/lib/text/initial";
import { Figure } from "@/components/ui/Amount";
import { RemoteImage } from "@/components/ui/RemoteImage";
import { TierBadge } from "@/components/trust/TierBadge";
import { UiIcon } from "@/design-system/icons/UiIcon";
import type { BadgeTier } from "@/lib/trust/badge-tier";
import "./identity.css";

/**
 * ONE IDENTITY HEADER, TWO STATES (handoff A.7 and ONE-PRODUCT-DECISIONS,
 * "How does an identity appear?").
 *
 * The founder: "in viewing users profiles it's different and looks stupid
 * ugly and anyhow not clean". It was different because it was two designs:
 * `/profile` drew `AccountHero` on the `nf-pf-*` band and `/u/[handle]` drew
 * `ProfileHeader` on the `nf-profile-*` island, with two cover heights, two
 * avatar sizes, two count formats and two sets of controls. Both now render
 * this, so a person looks the same wherever they are shown:
 *
 *   cover band   the photograph, or the villa plate; one control each corner
 *   the island   face, name with its one tier mark, handle, bio, place and
 *                joined, then the three counts as figures
 *   one row      MINE: the edit controls. THEIRS: follow and message.
 *   below        whatever the page adds: trust, badges, chips (children)
 *
 * It is a server-safe component (no hooks), so the client account page and
 * the server public page can both render it. The parts that differ by state
 * arrive as slots, which is why it owns the layout and nothing else.
 */
export type IdentityState = "mine" | "theirs";

export type IdentityCounts = {
  followers: number;
  following: number;
  posts: number;
  labels: { followers: string; following: string; posts: string };
};

const COVER_PLATE = "/brand/photos/villa-pool-skyline-01.jpg";
const COMPACT: Intl.NumberFormatOptions = { notation: "compact", maximumFractionDigits: 1 };

export function IdentityHeader({
  state,
  name,
  handle,
  handleLine,
  pronouns,
  bio,
  badgeTier = null,
  role,
  coverUrl,
  avatarUrl,
  avatar,
  place,
  joined,
  counts,
  locale,
  topStart,
  topEnd,
  actions,
  testId,
  children,
}: {
  state: IdentityState;
  name: string;
  /** The claimed handle, without the @. Null when the account has none yet. */
  handle: string | null;
  /** What the handle line says when there is no handle (an account's email). */
  handleLine?: string;
  pronouns?: string;
  bio?: string;
  badgeTier?: BadgeTier | null;
  /** A role mark beside the name (a moderator's place). */
  role?: ReactNode;
  coverUrl?: string;
  avatarUrl?: string;
  /** Replaces the static face: the account page passes its photo picker. */
  avatar?: ReactNode;
  place?: string;
  joined?: string;
  counts: IdentityCounts | null;
  locale: Locale;
  topStart?: ReactNode;
  topEnd?: ReactNode;
  /** MINE: the edit controls. THEIRS: follow, message, the menu. */
  actions?: ReactNode;
  testId?: string;
  children?: ReactNode;
}) {
  const monogram = initial(name || handle || "");

  /* One count format for both states: tabular, counting up once on first
     view below ten thousand, and a compact 12.4K above it (a figure that is
     already abbreviated has no digits to roll). */
  const figure = (value: number) => (
    <Figure value={value >= 10_000 ? formatNumber(value, locale, COMPACT) : value} locale={locale} count={value < 10_000} />
  );

  return (
    <header
      className="nf-profile-top nf-identity"
      data-theme="dark"
      data-identity-state={state}
      data-testid={testId ?? "identity-header"}
    >
      <div className="nf-social-cover nf-social-cover--profile">
        {coverUrl ? (
          <RemoteImage
            src={coverUrl}
            alt=""
            width={1200}
            height={400}
            sizes="(max-width: 768px) 100vw, 768px"
            priority
            className="nf-social-cover__photo"
          />
        ) : (
          <Image
            src={COVER_PLATE}
            alt=""
            fill
            priority
            sizes="(max-width: 768px) 100vw, 768px"
            className="nf-social-cover__plate"
          />
        )}
        <div className="nf-social-cover__scrim" aria-hidden="true" />
        {topStart ? <div className="nf-social-float nf-social-float--start">{topStart}</div> : null}
        {topEnd ? <div className="nf-social-float nf-social-float--end">{topEnd}</div> : null}
      </div>

      <div className="nf-profile-identity nf-island">
        {avatar ?? (
          <div className="nf-profile-avatar">
            <span className="nf-profile-avatar__disc">
              {avatarUrl ? (
                <RemoteImage src={avatarUrl} alt={`${name}, profile photo`} width={192} height={192} sizes="96px" />
              ) : (
                <span aria-hidden="true">{monogram}</span>
              )}
            </span>
          </div>
        )}

        <div className="nf-profile-text">
          <div className="nf-social-nameline">
            <h1 className="nf-social-name" data-badge-tier={badgeTier ?? "none"}>
              <span className="truncate-none">{name}</span>
              {badgeTier && badgeTier !== "none" ? <TierBadge tier={badgeTier} size={18} className="nf-social-verified" /> : null}
            </h1>
            {role}
          </div>
          <p className="nf-social-handle" data-testid="profile-handle-line">
            {handle ? `@${handle}` : handleLine}
            {pronouns ? (
              <>
                <span className="nf-social-handle__dot" aria-hidden="true">
                  ·
                </span>
                <span data-testid="profile-pronouns">{pronouns}</span>
              </>
            ) : null}
          </p>
          {bio ? <p className="nf-social-bio">{bio}</p> : null}
          {place || joined ? (
            <div className="nf-social-meta" data-testid="profile-meta">
              {place ? (
                <span>
                  <UiIcon name="location" size={16} />
                  {place}
                </span>
              ) : null}
              {joined ? (
                <span>
                  <UiIcon name="calendar-booking" size={16} />
                  {joined}
                </span>
              ) : null}
            </div>
          ) : null}
          {counts && handle ? (
            <div className="nf-social-counts" data-testid="profile-counts">
              <Link href={`/u/${handle}/followers`} className="nf-social-count">
                <span className="nf-social-count__value nf-numeric">{figure(counts.followers)}</span>
                <span className="nf-social-count__label">{counts.labels.followers}</span>
              </Link>
              <span className="nf-social-count__rule" aria-hidden="true" />
              <Link href={`/u/${handle}/following`} className="nf-social-count">
                <span className="nf-social-count__value nf-numeric">{figure(counts.following)}</span>
                <span className="nf-social-count__label">{counts.labels.following}</span>
              </Link>
              <span className="nf-social-count__rule" aria-hidden="true" />
              {/* Posts is a number, not a door: the Posts tab below is that
                  list, so this is a span with no hit area it cannot honour. */}
              <span className="nf-social-count nf-social-count--static">
                <span className="nf-social-count__value nf-numeric">{figure(counts.posts)}</span>
                <span className="nf-social-count__label">{counts.labels.posts}</span>
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {actions ? (
        <div className="nf-identity__actions" data-testid="identity-actions">
          {actions}
        </div>
      ) : null}

      {children}
    </header>
  );
}
