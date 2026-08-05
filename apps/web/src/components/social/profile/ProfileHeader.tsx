import Link from "next/link";
import { formatNumber, type Locale } from "@naijafinds/i18n";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import { BackChevron } from "./BackChevron";
import type { ModeratorOf, SocialProfileView } from "@/lib/social/profiles-queries";
import type { AgentTrust, Occupation, ProfilePlace, Standing } from "@/lib/social/profile-extras";
import { BIO_HELD_DETAIL, BIO_HELD_TITLE, linkLabel } from "@/lib/social/profiles-schema";

/**
 * The top of a person's page.
 *
 * Read top to bottom it is: the cover, the person, what they are, who follows
 * them, what they are good at if they sell property, what they say about
 * themselves, and where and since when. Every one of those is a different kind
 * of fact, so every one gets its own band and its own air. The owner asked for
 * neat and not jam-packed twice, and the way you get that is not smaller type,
 * it is fewer things per row.
 *
 * **The cover is the backdrop, never a card.** It runs edge to edge and up
 * behind the app's own translucent top bar, and the two controls that ride on
 * it float over a scrim rather than sitting in a strip, so the photograph is
 * the first thing the screen is made of. The avatar then overlaps its lower
 * edge from below, which is what makes the cover read as behind the person
 * instead of above them.
 *
 * **The two controls on the right are Share and the overflow, and neither is a
 * bookmark.** The reference board draws one in that corner. A bookmark on this
 * platform means keep this flat (`saved_items`) or keep this post
 * (`post_reactions` with the mark `SAVE`); a person is neither, and the thing
 * somebody actually wants when they reach for it is Follow, which is already on
 * this screen, writes a real row, has a list behind it and notifies the person.
 * The reasoning is set out in full in `ProfileShare`, and the position does not
 * get relitigated without a `saved_people` table and a screen that reads it
 * back.
 *
 * **The ring on the avatar is ADR-012 and not decoration.** A luminous gradient
 * on the border box with the fill on the padding box, brightest at the upper
 * left, lit from the same direction as the commissioned 3D icon family. It is
 * the one thing on this page a clone cannot copy by copying the layout.
 *
 * Three things are deliberately absent when there is nothing true to put in
 * them: an occupation chip nobody chose, a place nobody set, and the agent
 * band on somebody who is not an agent. None of them becomes a dash or a
 * placeholder. A profile should never look like a form somebody abandoned.
 */
export function ProfileHeader({
  profile,
  isOwner,
  homeArea,
  moderatorOf,
  locale,
  occupation,
  standing,
  place,
  trust,
  joinedLabel,
  follow,
  menu,
  share,
}: {
  profile: SocialProfileView;
  isOwner: boolean;
  homeArea: { slug: string; name: string; city: string } | null;
  moderatorOf: ModeratorOf[];
  locale: Locale;
  occupation: Occupation | null;
  standing: Standing[];
  place: ProfilePlace | null;
  /** Agents only. Null on everybody else, and the band is then absent. */
  trust: AgentTrust | null;
  joinedLabel: string;
  /** The follow control, supplied by the page so this stays a server component. */
  follow?: React.ReactNode;
  /** The overflow menu. */
  menu?: React.ReactNode;
  /** Share, floating on the cover. */
  share?: React.ReactNode;
}) {
  const name = profile.displayLabel || `@${profile.handle}`;
  const monogram = (profile.displayLabel || profile.handle).charAt(0).toUpperCase();

  return (
    <header>
      {/* ------------------------------------------------------- the cover */}
      <div className="nf-social-cover">
        {profile.coverUrl ? (
          /* The bucket is public, so the CDN URL renders without a signed
             request. next/image is skipped deliberately, exactly as the account
             avatar does: one image from a host that only exists once the
             platform keys land. */
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.coverUrl} alt="" className="nf-social-cover__photo" />
        ) : (
          <div className="nf-social-cover__art" aria-hidden="true" />
        )}
        <div className="nf-social-cover__scrim" aria-hidden="true" />

        <div className="nf-social-float nf-social-float--start">
          <BackChevron fallback="/around" />
        </div>
        <div className="nf-social-float nf-social-float--end">
          {share}
          {menu}
        </div>
      </div>

      {/* ---------------------------------------------------- the person */}
      <div className="nf-social-identity">
        <div className="nf-social-avatar nf-social-avatar--ring">
          <span className="nf-social-avatar__disc">
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatarUrl} alt={`${name}, profile photo`} />
            ) : (
              <span aria-hidden="true">{monogram}</span>
            )}
          </span>
          {/* The dot says the account is real and reachable. It sits on the
              avatar rather than beside the name because it is about the person,
              not about the words. */}
          <span
            className={`nf-social-avatar__dot${profile.isAgent ? " nf-social-avatar__dot--agent" : ""}`}
            aria-hidden="true"
          />
        </div>
      </div>

      <div className="nf-social-namerow">
        <div className="min-w-0">
          <h1 className="nf-social-name">
            <span className="truncate-none">{name}</span>
            {profile.isAgent ? (
              <span
                className="nf-social-verified"
                title="A verified RentMe agent"
                aria-label="Verified agent"
              >
                <UiIcon name="verified" size={17} />
              </span>
            ) : null}
          </h1>
          <p className="nf-social-handle">@{profile.handle}</p>
        </div>
        {follow ? <div className="shrink-0">{follow}</div> : null}
      </div>

      {/* ------------------------------------------------- what they are */}
      {(occupation || standing.length > 0 || moderatorOf.length > 0 || profile.pidginOk) && (
        <div className="nf-social-chips">
          {occupation ? (
            <span className="nf-social-chip">
              <UiIcon name="user" size={13} />
              {occupation.name}
            </span>
          ) : null}
          {standing.map((badge) => (
            <span key={badge.code} className="nf-social-chip nf-social-chip--brand">
              <BrandIcon name={objectFor(badge.objectName)} size={16} />
              {badge.name}
            </span>
          ))}
          {moderatorOf.map((area) => (
            <span key={area.slug} className="nf-social-chip">
              <UiIcon name="key" size={13} />
              Looks after {area.name}
            </span>
          ))}
          {profile.pidginOk ? (
            <span className="nf-social-chip">
              <UiIcon name="chat-bubble" size={13} />
              Pidgin welcome
            </span>
          ) : null}
        </div>
      )}

      {/* --------------------------------------- followers and following */}
      <div className="nf-social-counts">
        <Link href={`/u/${profile.handle}/followers`} className="nf-social-count">
          <span className="nf-social-count__value nf-numeric">
            {formatNumber(profile.followerCount, locale)}
          </span>
          <span className="nf-social-count__label">Followers</span>
        </Link>
        <span className="nf-social-count__rule" aria-hidden="true" />
        <Link href={`/u/${profile.handle}/following`} className="nf-social-count">
          <span className="nf-social-count__value nf-numeric">
            {formatNumber(profile.followingCount, locale)}
          </span>
          <span className="nf-social-count__label">Following</span>
        </Link>
      </div>

      {/* --------------------------------------------- agents only, ever */}
      {trust ? (
        <dl className="nf-social-trust">
          <div className="nf-social-trust__cell">
            <dt>Trust score</dt>
            <dd className="nf-numeric">{trust.score}</dd>
          </div>
          <div className="nf-social-trust__cell">
            <dt>Completed deals</dt>
            <dd className="nf-numeric">{formatNumber(trust.completedDeals, locale)}</dd>
          </div>
          <div className="nf-social-trust__cell">
            <dt>Response time</dt>
            <dd className="nf-numeric">{trust.responseTime}</dd>
          </div>
        </dl>
      ) : null}

      {/* --------------------------------------------------------- the bio */}
      {isOwner && profile.bioStatus === "HELD" && (
        <div role="status" className="nf-card nf-social-card mt-5 p-4">
          <p className="text-[0.875rem] font-semibold text-[var(--nf-state-warning)]">
            {BIO_HELD_TITLE}
          </p>
          <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]">
            {BIO_HELD_DETAIL}
          </p>
        </div>
      )}

      {profile.bio && <p className="nf-social-bio">{profile.bio}</p>}

      {profile.link && (
        <a
          href={profile.link}
          rel="nofollow noopener noreferrer ugc"
          target="_blank"
          className="mt-3 inline-flex items-center gap-1.5 text-[0.875rem] font-semibold text-[var(--nf-brand-secondary)]"
        >
          <UiIcon name="share" size={14} />
          {linkLabel(profile.link)}
        </a>
      )}

      {/* ------------------------------------------------------- the meta */}
      {(place || homeArea || joinedLabel) && (
        <div className="nf-social-meta">
          {place ? (
            <span>
              <UiIcon name="location" size={14} />
              {place.label}
            </span>
          ) : homeArea ? (
            <span>
              <UiIcon name="location" size={14} />
              {homeArea.name}, {homeArea.city}
            </span>
          ) : null}
          {joinedLabel ? (
            <span>
              <UiIcon name="calendar-booking" size={14} />
              Joined {joinedLabel}
            </span>
          ) : null}
        </div>
      )}

      {isOwner && (
        <Link
          href={`/u/${profile.handle}/edit`}
          className="nf-btn nf-btn--glass mt-5 w-full sm:w-auto"
        >
          Edit profile
        </Link>
      )}
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
