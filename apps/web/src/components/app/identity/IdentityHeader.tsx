import { Children, type ReactNode } from "react";
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
 * this, so a person looks the same wherever they are shown, whoever they are
 * (a renter, a landlord, an agent, a hotel):
 *
 *   cover band   the photograph, or the villa plate; Back in the top left
 *                corner and one control in the top right
 *   the card     the face beside the name with its one tier mark, the ONE
 *                role line (`lib/profile/role-line.ts`) and the handle; then,
 *                across the card, the short bio, place and joined, and the
 *                three counts as figures
 *   one row      MINE: the edit controls. THEIRS: follow and message.
 *   below        whatever the page adds: chips, then the credentials section
 *                (children)
 *
 * THE COVER IS THE ONLY NIGHT IN IT. The photograph carries
 * `data-theme="dark"`, so the corner glyphs and the scrim keep their night
 * inks over any picture. The card, the actions and everything under them
 * take the page's own palette: a white card on the warm paper by day, the
 * navy glass at night. The whole header used to be a night island in both
 * themes, which painted a navy block the length of the screen on a light
 * page (the founder, October 2026: the blue on white was too heavy).
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
  roleLine,
  role,
  coverUrl,
  coverPlate = COVER_PLATE,
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
  /** What the handle line says when there is no handle. Omitted, there is no line. */
  handleLine?: string;
  pronouns?: string;
  bio?: string;
  badgeTier?: BadgeTier | null;
  /** The one line under the name: what the person is on Vallo, already worded. */
  roleLine?: string;
  /** A role mark on the role line (a moderator's place). */
  role?: ReactNode;
  coverUrl?: string;
  /** The photograph shown when nobody has set a cover. */
  coverPlate?: string;
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
  const handleText = handle ? `@${handle}` : handleLine;

  /* One count format for both states: tabular, counting up once on first
     view below ten thousand, and a compact 12.4K above it (a figure that is
     already abbreviated has no digits to roll). */
  const figure = (value: number) => (
    <Figure value={value >= 10_000 ? formatNumber(value, locale, COMPACT) : value} locale={locale} count={value < 10_000} />
  );
  const showCounts = Boolean(counts && handle);
  const showAbout = Boolean(bio || place || joined || showCounts);

  return (
    <header
      className="nf-profile-top nf-identity"
      data-identity-state={state}
      data-testid={testId ?? "identity-header"}
    >
      <div className="nf-social-cover nf-social-cover--profile" data-theme="dark">
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
            src={coverPlate}
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
          {/* THE BADGE BESIDE THE NAME: `TierBadge`, the one renderer, fed
              the published `person_badge` tier; it draws nothing for none. */}
          <h1 className="nf-social-name" data-badge-tier={badgeTier ?? "none"}>
            <span className="truncate-none">{name}</span>
            {badgeTier && badgeTier !== "none" ? <TierBadge tier={badgeTier} size={18} className="nf-social-verified" /> : null}
          </h1>
          {roleLine || role ? (
            <div className="nf-identity__roles">
              {roleLine ? (
                <p className="nf-identity__role" data-testid="profile-role-line">
                  {roleLine}
                </p>
              ) : null}
              {role}
            </div>
          ) : null}
          {handleText || pronouns ? (
            <p className="nf-social-handle" data-testid="profile-handle-line">
              {handleText}
              {pronouns ? (
                <>
                  {handleText ? (
                    <span className="nf-social-handle__dot" aria-hidden="true">
                      ·
                    </span>
                  ) : null}
                  <span data-testid="profile-pronouns">{pronouns}</span>
                </>
              ) : null}
            </p>
          ) : null}
        </div>

        {showAbout ? (
          /* Across the whole card, under the face: a bio beside an 80px
             face at 390 wrapped to eight lines in a 220px column. It keeps
             the text column's own type (`.nf-profile-text`) for the bio, the
             meta line and the counts. */
          <div className="nf-profile-text nf-identity__about">
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
        ) : null}
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

/**
 * THE CREDENTIALS SECTION under a person's header, on both profiles: what
 * vouches for them (their badges, their Vallo Record, an agent's reviews, and
 * on your own page your Vallo passport), under one quiet label. A section
 * with nothing in it draws nothing, label included, so a person with no
 * credentials yet is not shown an empty box.
 */
export function IdentityCredentials({
  label,
  testId = "profile-credentials",
  children,
}: {
  label: string;
  testId?: string;
  children: ReactNode;
}) {
  /* `toArray` drops null, undefined and booleans, so a caller passes `null`
     for a part it has nothing for (the house rule `SettingsGroup` keeps). */
  if (Children.toArray(children).length === 0) return null;
  return (
    <section className="nf-identity__cred" aria-label={label} data-testid={testId}>
      <h2 className="nf-sgroup__label" aria-hidden="true">
        {label}
      </h2>
      <div className="nf-identity__cred-body">{children}</div>
    </section>
  );
}
