import { initial } from "@/lib/text/initial";
import Image from "next/image";
import Link from "next/link";
import { formatNumber, formatRating, type Dictionary, type Locale } from "@vallo/i18n/core";
import { Figure } from "@/components/ui/Amount";
import { BadgeRow, type BadgeRowCopy } from "../badges/BadgeRow";
import { BadgeEarnedHost } from "../badges/BadgeEarnedHost";
import type { ProfileBadge } from "../badges/badge-model";
import { TierBadge } from "@/components/trust/TierBadge";
import { ShareCardFrame } from "@/components/share/ShareCardFrame";
import { BADGE_TIER_LABEL } from "@/lib/trust/badge-tier";
import { ratingFill } from "@/lib/ui/meter";
import { UiIcon } from "@/design-system/icons/UiIcon";
import type { BrandIconName } from "@/design-system/icons/BrandIcon";
import { BackChevron } from "./BackChevron";
import { ButtonLink } from "@/components/ui/Button";
import type { ModeratorOf, SocialProfileView } from "@/lib/social/profiles-queries";
import type { AgentTrust, Occupation, ProfilePlace, Standing } from "@/lib/social/profile-extras";
import { BIO_HELD_DETAIL, BIO_HELD_TITLE, linkLabel } from "@/lib/social/profiles-schema";
import { ExternalLinkSheet } from "@/components/ui/ExternalLinkSheet";
import { RemoteImage } from "@/components/ui/RemoteImage";
import "./social-profile.css";
import { lineGlyphFor } from "@/design-system/icons/glass-to-line";

/**
 * The top of a person's page.
 *
 * Read top to bottom it is: a way back, the banner, the person, what to do
 * about them, who they are, what they say about themselves, where and since
 * when, and how many people are listening. Every one of those is a different
 * kind of fact, so every one gets its own band and its own air. The way you
 * make a dense page feel calm is fewer things per row, not smaller type.
 *
 * **The banner is the backdrop, never a card.** It runs edge to edge and up
 * behind the app's own translucent top bar, and the avatar overlaps its lower
 * edge from below, which is what makes the banner read as behind the person
 * instead of above them.
 *
 * **Back is a labelled pill, not a bare chevron.** A round glyph floating on a
 * photograph is the one control on this screen somebody has to guess at, and it
 * is also the one they reach for most, because a profile is nearly always
 * arrived at from a post they were halfway through reading. The word costs
 * twelve pixels of banner and removes the guess.
 *
 * **Follow and the overflow sit on the avatar's row, right aligned.** That row
 * is the first place the eye lands after the picture, and those two are the
 * only things on this page that act on the PERSON rather than on the page.
 * Share stays up on the banner beside nothing else, because sending somebody a
 * page acts on the page. On your own page the same slot carries Edit profile,
 * so the geometry does not change shape depending on whose page it is.
 *
 * **The role badge names a place, and only when the database says so.** It
 * reads MOD then the area, because a moderator is a moderator OF somewhere and
 * the abbreviation alone would be a rank with no jurisdiction. Nobody who is
 * not in `area_moderators` gets one, and there is no styling in here that could
 * produce one from an empty array.
 *
 * **Pronouns render only when the person set them.** They are optional in the
 * schema, optional in the editor, and absent from this line entirely when the
 * column is null. A default would be the platform guessing at something it has
 * no business guessing at, and "she/her" on somebody who never typed it is a
 * worse failure than a shorter line.
 *
 * **The ring on the avatar is ADR-012 and not decoration.** A luminous gradient
 * on the border box with the fill on the padding box, brightest at the upper
 * left, lit from the same direction as the commissioned 3D icon family.
 *
 * Four things are deliberately absent when there is nothing true to put in
 * them: an occupation chip nobody chose, a place nobody set, pronouns nobody
 * typed, and the agent band on somebody who is not an agent. None of them
 * becomes a dash or a placeholder. A profile should never look like a form
 * somebody abandoned.
 */
/** The cover for a page whose owner has set none: the founder's villa plate. */
const COVER_PLATE = "/brand/photos/villa-pool-skyline-01.jpg";

export function ProfileHeader({
  profile,
  isOwner,
  homeArea,
  moderatorOf,
  locale,
  t,
  occupation,
  standing,
  place,
  published = null,
  trust,
  joinedLabel,
  follow,
  menu,
  share,
  badges = null,
  badgeCopy,
  shareUrl,
}: {
  profile: SocialProfileView;
  isOwner: boolean;
  homeArea: { slug: string; name: string; city: string } | null;
  moderatorOf: ModeratorOf[];
  locale: Locale;
  /** The whole dictionary. This is a server component, so it costs nothing. */
  t: Dictionary;
  occupation: Occupation | null;
  standing: Standing[];
  place: ProfilePlace | null;
  /** V-64: for the owner, which of occupation and home town the page publishes. */
  published?: { occupation: boolean; homeTown: boolean } | null;
  /** Agents only. Null on everybody else, and the band is then absent. */
  trust: AgentTrust | null;
  /** Already formatted in the reader's language by the page. */
  joinedLabel: string;
  /** The follow control, supplied by the page so this stays a server component. */
  follow?: React.ReactNode;
  /** The overflow menu. */
  menu?: React.ReactNode;
  /** Share, floating on the banner. */
  share?: React.ReactNode;
  /**
   * This person's badges from `user_badges`, or null when the read failed.
   * Null falls back to the admin-granted chips (`standing`) so a failed read
   * never costs a badge somebody was given. An empty array draws nothing.
   */
  badges?: readonly ProfileBadge[] | null;
  badgeCopy?: BadgeRowCopy;
  /** The person's public address, for the Share on the earned moment. */
  shareUrl?: string;
}) {
  const copy = t.socialProfile;
  const visible = t.trustVisible.profile;
  const name = profile.displayLabel || `@${profile.handle}`;
  const monogram = initial(profile.displayLabel || profile.handle);
  /*
   * One badge, not a stack of them. Somebody who looks after four areas would
   * otherwise push the name off a 390px line, and the fifth badge tells a
   * stranger nothing the first one did not. The rest are still reachable: the
   * places themselves list who looks after them.
   */
  const mod = moderatorOf[0];

  return (
    <header data-testid="profile-header" data-theme="dark" className="nf-profile-top">
      {/* ------------------------------------------------------ the banner */}
      <div className="nf-social-cover nf-social-cover--profile">
        {profile.coverUrl ? (
          /* The bucket is public, so the CDN URL renders without a signed
             request. next/image is skipped for it: one image from a host that
             only exists once the platform keys land. The plate IS optimised. */
          /* The largest image on the page, into a band about 140px tall. It
             was shipping at whatever size the uploader stored. */
          <RemoteImage
            src={profile.coverUrl}
            alt=""
            width={1200}
            height={400}
            sizes="(max-width: 640px) 100vw, 640px"
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

        <div className="nf-social-float nf-social-float--start">
          <BackChevron fallback="/around" label={copy.back} labelled />
        </div>
        {share ? (
          <div className="nf-social-float nf-social-float--end">{share}</div>
        ) : null}
      </div>

      {/* --------------------------------- the person, beside the picture */}
      <div className="nf-profile-identity nf-island">
        <div className="nf-profile-avatar">
          <span className="nf-profile-avatar__disc">
            {profile.avatarUrl ? (
              <RemoteImage
                src={profile.avatarUrl}
                alt={`${name}, profile photo`}
                width={192}
                height={192}
                sizes="96px"
              />
            ) : (
              <span aria-hidden="true">{monogram}</span>
            )}
          </span>
          {/*
            NO MARK ON THE RING (the founder, 25 September 2026): the person's
            badge is shown once, beside the name, where it says whose it is.
            It stood at the foot of the ring as well, so a verified person
            wore it twice. The one beside the name is still
            `public.person_badge.tier` through the one renderer, and never
            `isAgent`, which is a role marker and not an earned badge.
          */}
        </div>

        <div className="nf-profile-text">
          <div className="nf-social-nameline">
            <h1 className="nf-social-name">
              <span className="truncate-none">{name}</span>
              {/* The same one mark beside the name, from the same one source. */}
              <TierBadge tier={profile.badgeTier} size={18} className="nf-social-verified" />
            </h1>
            {mod ? (
              <span
                className="nf-social-role"
                aria-label={copy.moderatorOf.replace("{place}", mod.name)}
                data-testid="profile-role-badge"
              >
                <span aria-hidden="true">{copy.moderatorShort}</span>
                <span className="nf-social-role__dot" aria-hidden="true">
                  ·
                </span>
                <span aria-hidden="true">{mod.name}</span>
              </span>
            ) : null}
          </div>

          <p className="nf-social-handle" data-testid="profile-handle-line">
            @{profile.handle}
            {/* Only when they typed it. Never inferred, never defaulted. */}
            {profile.pronouns ? (
              <>
                <span className="nf-social-handle__dot" aria-hidden="true">
                  ·
                </span>
                <span data-testid="profile-pronouns">{profile.pronouns}</span>
              </>
            ) : null}
          </p>

          {profile.bio && <p className="nf-social-bio">{profile.bio}</p>}

          {/* ------------------------------------------------------- the meta: where and since when, before the counts (the doc order above) */}
          {(place || homeArea || joinedLabel) && (
            <div className="nf-social-meta" data-testid="profile-meta">
              {place ? (
                <span>
                  <UiIcon name="location" size={16} />
                  {place.label}
                </span>
              ) : homeArea ? (
                <span>
                  <UiIcon name="location" size={16} />
                  {homeArea.name}, {homeArea.city}
                </span>
              ) : null}
              {joinedLabel ? (
                <span>
                  <UiIcon name="calendar-booking" size={16} />
                  {copy.joined.replace("{month}", joinedLabel)}
                </span>
              ) : null}
            </div>
          )}

          {/*
            Followers and Following, with a rule between them. Both lists exist
            as routes, so both are links. Posts is the tab below rather than a
            third number here, as the render draws it.
          */}
          <div className="nf-social-counts" data-testid="profile-counts">
            <Link href={`/u/${profile.handle}/followers`} className="nf-social-count">
              <span className="nf-social-count__value nf-numeric">
                <Figure value={profile.followerCount} locale={locale} count />
              </span>
              <span className="nf-social-count__label">{copy.followers}</span>
            </Link>
            <span className="nf-social-count__rule" aria-hidden="true" />
            <Link href={`/u/${profile.handle}/following`} className="nf-social-count">
              <span className="nf-social-count__value nf-numeric">
                <Figure value={profile.followingCount} locale={locale} count />
              </span>
              <span className="nf-social-count__label">{copy.following}</span>
            </Link>
            <span className="nf-social-count__rule" aria-hidden="true" />
            {/* Posts is a number, not a door: the Posts tab below is that
                list, so this is a span and keeps no 44px hit area it could
                not honour. Real counts only: the three are the database's. */}
            <span className="nf-social-count nf-social-count--static">
              <span className="nf-social-count__value nf-numeric">
                <Figure value={profile.postCount} locale={locale} count />
              </span>
              <span className="nf-social-count__label">{copy.posts}</span>
            </span>
          </div>
        </div>
      </div>

      {/* ----------------------------------- what to do about them */}
      <div className="nf-profile-actions">
        {isOwner ? (
          <ButtonLink href={`/u/${profile.handle}/edit`} size="sm" variant="secondary">
            {copy.editProfile}
          </ButtonLink>
        ) : (
          follow
        )}
        {menu}
      </div>

      {/* -------------------------------------------------- what they are */}
      {(occupation || (badges === null && standing.length > 0) || profile.pidginOk) && (
        <div className="nf-social-chips nf-profile-chips">
          {occupation ? (
            <span className="nf-social-chip">
              <UiIcon name="user" size={12} />
              {occupation.name}
            </span>
          ) : null}
          {(badges === null ? standing : []).map((badge) => (
            <span key={badge.code} className="nf-social-chip nf-social-chip--brand">
              <UiIcon name={lineGlyphFor(objectFor(badge.objectName))} size={16} />
              {badge.name}
            </span>
          ))}
          {profile.pidginOk ? (
            <span className="nf-social-chip">
              <UiIcon name="chat-bubble" size={12} />
              {copy.pidginWelcome}
            </span>
          ) : null}
        </div>
      )}

      {/* ----------------------------------------- what they have earned */}
      {badges && badges.length > 0 && badgeCopy ? (
        <>
          <BadgeRow badges={badges} isOwner={isOwner} copy={badgeCopy} shareUrl={shareUrl} />
          {isOwner ? <BadgeEarnedHost viewerId={profile.userId} badges={badges} copy={badgeCopy} shareUrl={shareUrl} /> : null}
        </>
      ) : null}

      {/* --------------------------------------------------------- the bio */}
      {isOwner && profile.bioStatus === "HELD" && (
        <div role="status" className="nf-panel nf-panel--card mt-md p-md">
          <p className="text-[length:var(--nf-text-body-sm)] font-semibold text-[var(--nf-state-warning)]">
            {BIO_HELD_TITLE}
          </p>
          <p className="mt-2xs text-[length:var(--nf-text-caption)] leading-relaxed text-[var(--nf-content-secondary)]">
            {BIO_HELD_DETAIL}
          </p>
        </div>
      )}

      {/* --------------------------------------------- the one link that leaves */}
      {/* This was a bare `target="_blank"` anchor to whatever the account
          holder typed: one tap out of a property marketplace, into an origin
          Vallo has never seen, with no warning. The feature has to leave, so
          the departure is announced and consented instead. */}
      {profile.link && (
        <ExternalLinkSheet
          href={profile.link}
          label={linkLabel(profile.link)}
          className="nf-social-link"
        >
          <UiIcon name="share" size={16} />
          {linkLabel(profile.link)}
        </ExternalLinkSheet>
      )}

      {/* V-64. The owner sees their occupation and home town; nobody else
          does unless the owner switched each one on. Say so, beside them, so
          "my page shows this" is never a guess. */}
      {isOwner && published && ((occupation && !published.occupation) || (place && !published.homeTown)) ? (
        <p className="nf-caption mt-xs text-[var(--nf-content-muted)]" data-testid="profile-private-note">
          {/* Per field: say only what is actually held back (review 9). */}
          {occupation && !published.occupation && place && !published.homeTown
            ? t.shape.profile.privateNote
            : occupation && !published.occupation
              ? t.shape.profile.privateNoteOccupation
              : t.shape.profile.privateNoteHomeTown}{" "}
          <Link href="/settings/privacy" className="nf-link-quiet text-[var(--nf-content-link)]">
            {t.shape.profile.privateNoteLink}
          </Link>
        </p>
      ) : null}

      {/* --------------------------------------------- agents only, ever */}
      {trust ? (
        /* V-21: NO SCORE. The "Trust score" cell was a number out of 100
           nobody could explain, and it is gone with its column. The card
           (spec section 10) prints plain facts, each only when there is one:
           the average review with its count, the stays hosted (never a zero,
           which told every rental agent their lets did not count), and the
           reply time. The meter is the average out of five on ten bars, and
           its word is the review count it came from. */
        <ShareCardFrame
          className="mt-md"
          testId="profile-agent-record"
          align="center"
          title={visible.cardTitle}
          chip={profile.badgeTier === "gold" ? { label: BADGE_TIER_LABEL.gold } : undefined}
          {...(trust.reviewCount > 0 && trust.averageRating !== null
            ? {
                eyebrow: visible.ratingLabel,
                figure: formatRating(trust.averageRating, locale),
                figureUnit: visible.ratingUnit,
                meter: {
                  filled: ratingFill(trust.averageRating),
                  word:
                    trust.reviewCount === 1
                      ? visible.reviewsWordOne
                      : visible.reviewsWord.replace("{count}", formatNumber(trust.reviewCount, locale)),
                },
                honest: visible.honest,
              }
            : {
                eyebrow: copy.responseTime,
                figure: trust.responseTime,
                figureSize: "lg" as const,
                honest: visible.noReviews,
              })}
          stats={[
            ...(trust.reviewCount > 0 && trust.averageRating !== null
              ? [{ label: visible.reviews, value: formatNumber(trust.reviewCount, locale) }]
              : []),
            ...(trust.completedDeals > 0
              ? [{ label: visible.staysHosted, value: formatNumber(trust.completedDeals, locale) }]
              : []),
            ...(trust.reviewCount > 0 ? [{ label: copy.responseTime, value: trust.responseTime }] : []),
          ]}
        />
      ) : null}
    </header>
  );
}

/**
 * A badge names its own 3D object, and the pack is a fixed set of 57. A code
 * that is not one of them falls back to the platform's own check mark rather
 * than rendering a broken tile, which is the failure mode a percentage-padded
 * icon produced here once and only a screenshot caught.
 */
function objectFor(name: string): BrandIconName {
  const known = new Set<string>([
    "shield-check",
    "user-verified",
    "user-check",
    "reviews",
    "gift-star",
    "chart-growth",
    "home-check",
    "keys-home",
    "bell-badge",
  ]);
  return (known.has(name) ? name : "shield-check") as BrandIconName;
}
