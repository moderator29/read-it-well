import Link from "next/link";
import { formatNumber, type Dictionary, type Locale } from "@vallo/i18n";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import { BackChevron } from "./BackChevron";
import type { ModeratorOf, SocialProfileView } from "@/lib/social/profiles-queries";
import type { AgentTrust, Occupation, ProfilePlace, Standing } from "@/lib/social/profile-extras";
import { BIO_HELD_DETAIL, BIO_HELD_TITLE, linkLabel } from "@/lib/social/profiles-schema";

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
  /** The whole dictionary. This is a server component, so it costs nothing. */
  t: Dictionary;
  occupation: Occupation | null;
  standing: Standing[];
  place: ProfilePlace | null;
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
}) {
  const copy = t.socialProfile;
  const name = profile.displayLabel || `@${profile.handle}`;
  const monogram = (profile.displayLabel || profile.handle).charAt(0).toUpperCase();
  /*
   * One badge, not a stack of them. Somebody who looks after four areas would
   * otherwise push the name off a 390px line, and the fifth badge tells a
   * stranger nothing the first one did not. The rest are still reachable: the
   * places themselves list who looks after them.
   */
  const mod = moderatorOf[0];

  return (
    <header data-testid="profile-header">
      {/* ------------------------------------------------------ the banner */}
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
          <BackChevron fallback="/around" label={copy.back} labelled />
        </div>
        {share ? (
          <div className="nf-social-float nf-social-float--end">{share}</div>
        ) : null}
      </div>

      {/* --------------------------------- the person, and what to do next */}
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

        <div className="nf-social-identity__actions">
          {isOwner ? (
            <Link href={`/u/${profile.handle}/edit`} className="nf-btn nf-btn--glass">
              {copy.editProfile}
            </Link>
          ) : (
            follow
          )}
          {menu}
        </div>
      </div>

      {/* -------------------------------------------------------- the name */}
      <div className="nf-social-namerow">
        <div className="min-w-0">
          <div className="nf-social-nameline">
            <h1 className="nf-social-name">
              <span className="truncate-none">{name}</span>
              {profile.isAgent ? (
                <span
                  className="nf-social-verified"
                  title={copy.verifiedTitle}
                  aria-label={copy.verified}
                >
                  <UiIcon name="verified" size={20} />
                </span>
              ) : null}
            </h1>
            {/*
              The visible text is the abbreviation and the place; the accessible
              name is the whole sentence. An abbreviation a screen reader spells
              out letter by letter is not a badge, it is noise.
            */}
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
        </div>
      </div>

      {/* -------------------------------------------------- what they are */}
      {(occupation || standing.length > 0 || profile.pidginOk) && (
        <div className="nf-social-chips">
          {occupation ? (
            <span className="nf-social-chip">
              <UiIcon name="user" size={12} />
              {occupation.name}
            </span>
          ) : null}
          {standing.map((badge) => (
            <span key={badge.code} className="nf-social-chip nf-social-chip--brand">
              <BrandIcon name={objectFor(badge.objectName)} size={16} />
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
          className="nf-social-link"
        >
          <UiIcon name="share" size={16} />
          {linkLabel(profile.link)}
        </a>
      )}

      {/* ------------------------------------------------------- the meta */}
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

      {/* ------------------------------------------------------ the counts */}
      {/*
        Three numbers the database maintains with triggers, not three numbers
        this component added up. Followers and Following are links because both
        lists exist as routes; Posts is plain text because there is no
        `/u/[handle]/posts` list to point at. A number wearing an underline that
        goes nowhere is a dead end, and this platform has a written rule against
        those. The Posts TAB below is where that list lives.
      */}
      <div className="nf-social-counts" data-testid="profile-counts">
        <Link href={`/u/${profile.handle}/followers`} className="nf-social-count">
          <span className="nf-social-count__value nf-numeric">
            {formatNumber(profile.followerCount, locale)}
          </span>
          <span className="nf-social-count__label">{copy.followers}</span>
        </Link>
        <span className="nf-social-count__rule" aria-hidden="true" />
        <Link href={`/u/${profile.handle}/following`} className="nf-social-count">
          <span className="nf-social-count__value nf-numeric">
            {formatNumber(profile.followingCount, locale)}
          </span>
          <span className="nf-social-count__label">{copy.following}</span>
        </Link>
        <span className="nf-social-count__rule" aria-hidden="true" />
        <span className="nf-social-count nf-social-count--static">
          <span className="nf-social-count__value nf-numeric">
            {formatNumber(profile.postCount, locale)}
          </span>
          <span className="nf-social-count__label">{copy.posts}</span>
        </span>
      </div>

      {/* --------------------------------------------- agents only, ever */}
      {trust ? (
        <dl className="nf-social-trust">
          <div className="nf-social-trust__cell">
            <dt>{copy.trustScore}</dt>
            <dd className="nf-numeric">{trust.score}</dd>
          </div>
          <div className="nf-social-trust__cell">
            <dt>{copy.completedDeals}</dt>
            <dd className="nf-numeric">{formatNumber(trust.completedDeals, locale)}</dd>
          </div>
          <div className="nf-social-trust__cell">
            <dt>{copy.responseTime}</dt>
            <dd className="nf-numeric">{trust.responseTime}</dd>
          </div>
        </dl>
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
