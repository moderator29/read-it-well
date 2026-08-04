import Link from "next/link";
import { formatNumber, type Locale } from "@naijafinds/i18n";
import { PageHeader } from "@/components/app/PageHeader";
import { UiIcon } from "@/design-system/icons/UiIcon";
import type { ModeratorOf, SocialProfileView } from "@/lib/social/profiles-queries";
import {
  BIO_HELD_DETAIL,
  BIO_HELD_TITLE,
  linkLabel,
} from "@/lib/social/profiles-schema";

/**
 * The top of a person's page.
 *
 * The cover is a background rather than a card: it runs edge to edge and up
 * behind the app's own translucent top bar, and the avatar and the name block
 * overlap it from below. That single decision is what stops a profile reading
 * as a picture pasted onto a page.
 *
 * The name lives on the cover, because the cover is the person. The address,
 * the pronouns, the marks and the counts live underneath it on the canvas,
 * where they are read rather than looked at.
 *
 * A held bio is rendered only to its owner, and only with the honest banner
 * saying so. Everybody else is handed a profile with no bio at all, never a
 * blurred teaser, and that decision is made in the query rather than here.
 */
export function ProfileHeader({
  profile,
  isOwner,
  homeArea,
  moderatorOf,
  locale,
  actions,
}: {
  profile: SocialProfileView;
  isOwner: boolean;
  homeArea: { slug: string; name: string; city: string } | null;
  moderatorOf: ModeratorOf[];
  locale: Locale;
  /** Follow, message and the overflow menu, supplied by the page. */
  actions?: React.ReactNode;
}) {
  const name = profile.displayLabel || `@${profile.handle}`;
  const monogram = (profile.displayLabel || profile.handle).charAt(0).toUpperCase();

  const stats = [
    { key: "followers", label: "Followers", value: profile.followerCount },
    { key: "following", label: "Following", value: profile.followingCount },
    { key: "posts", label: "Posts", value: profile.postCount },
  ];

  return (
    <header>
      <div className="nf-social-cover">
        {profile.coverUrl ? (
          /* The bucket is public, so the CDN URL renders without a signed
             request. next/image is skipped deliberately, exactly as the account
             avatar does: this is one image from a host that only exists once
             the platform keys land. */
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.coverUrl} alt="" className="nf-social-cover__photo" />
        ) : (
          <div className="nf-social-cover__art" aria-hidden="true" />
        )}
        <div className="nf-social-cover__scrim" aria-hidden="true" />
        <div className="nf-social-cover__bar">
          <PageHeader title={name} fallback="/home" backLabel="Back" />
        </div>
      </div>

      <div className="nf-social-identity flex items-end justify-between gap-3">
        <div className="nf-social-avatar" aria-hidden={profile.avatarUrl ? undefined : true}>
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatarUrl} alt={`${name}, profile photo`} />
          ) : (
            monogram
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2 pb-1">{actions}</div>}
      </div>

      <div className="mt-3">
        <p className="text-[1.0625rem] font-semibold leading-tight">@{profile.handle}</p>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.8125rem] text-[var(--nf-content-muted)]">
          {profile.pronouns && <span>{profile.pronouns}</span>}
          {profile.pronouns && homeArea && <span aria-hidden="true">·</span>}
          {homeArea && (
            <span className="inline-flex items-center gap-1">
              <UiIcon name="location" size={14} />
              {homeArea.name}, {homeArea.city}
            </span>
          )}
        </div>

        {(profile.isAgent || moderatorOf.length > 0 || profile.pidginOk) && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {profile.isAgent && (
              <span className="nf-chip gap-1.5 text-[0.75rem]">
                <UiIcon name="verified" size={14} />
                Agent
              </span>
            )}
            {moderatorOf.map((area) => (
              <span key={area.slug} className="nf-chip gap-1.5 text-[0.75rem]">
                <UiIcon name="key" size={14} />
                Looks after {area.name}
              </span>
            ))}
            {profile.pidginOk && <span className="nf-chip text-[0.75rem]">Pidgin welcome</span>}
          </div>
        )}

        {isOwner && profile.bioStatus === "HELD" && (
          <div
            role="status"
            className="nf-card nf-social-card mt-3 p-4"
            style={{ borderColor: "color-mix(in oklab, var(--nf-state-warning) 45%, transparent)" }}
          >
            <p className="text-[0.875rem] font-semibold text-[var(--nf-state-warning)]">
              {BIO_HELD_TITLE}
            </p>
            <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]">
              {BIO_HELD_DETAIL}
            </p>
          </div>
        )}

        {profile.bio && (
          <p
            className="mt-3 whitespace-pre-line leading-relaxed text-[var(--nf-content-secondary)]"
            style={{ fontSize: "var(--nf-text-body-lg)" }}
          >
            {profile.bio}
          </p>
        )}

        {profile.link && (
          <a
            href={profile.link}
            rel="nofollow noopener noreferrer ugc"
            target="_blank"
            className="mt-2.5 inline-flex items-center gap-1.5 text-[0.875rem] font-semibold text-[var(--nf-brand-secondary)]"
          >
            <UiIcon name="share" size={14} />
            {linkLabel(profile.link)}
          </a>
        )}

        <div className="mt-3.5 flex flex-wrap items-center gap-x-5 gap-y-1.5">
          {stats.map((stat) => (
            <span key={stat.key} className="nf-social-stat">
              <span className="nf-social-stat__value nf-numeric">
                {formatNumber(stat.value, locale)}
              </span>
              <span className="nf-social-stat__label">{stat.label}</span>
            </span>
          ))}
        </div>

        {isOwner && (
          <Link
            href={`/u/${profile.handle}/edit`}
            className="nf-btn nf-btn--glass mt-4 w-full sm:w-auto"
          >
            Edit profile
          </Link>
        )}
      </div>
    </header>
  );
}
