import type { Metadata } from "next";
import { formatNumber } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app/PageHeader";
import { UiIcon } from "@/design-system/icons/UiIcon";
import {
  getArea,
  getLgaDoor,
  listPlacesWithinLga,
} from "@/lib/social/areas-queries";
import { PLACE_COPY } from "@/lib/social/places-schema";
import { getAreaFeed } from "@/lib/social/posts-queries";
import { listStories } from "@/lib/social/stories-queries";
import { getPlaceReviews } from "@/lib/social/reviews-queries";
import { listMyAreas } from "@/lib/social/areas-queries";
import { POST_COPY } from "@/lib/social/posts-schema";
import { Feed } from "@/components/social/feed/Feed";
import { AroundFab } from "@/components/social/AroundFab";
import { AREA_COPY } from "@/lib/social/areas-schema";
import { JoinButton } from "../JoinButton";
import { ModeratorApply } from "./ModeratorApply";
import { SocialPaused } from "@/components/social/SocialPaused";
import { isSocialEnabled } from "@/lib/social/flag";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const detail = await getArea(slug);
  if (!detail || detail === "unconfigured") return { title: "Around" };
  return {
    title: `Around ${detail.area.name}`,
    description:
      detail.area.blurb ??
      `What is happening around ${detail.area.name}, ${detail.area.city}.`,
  };
}

/**
 * One place.
 *
 * A place that has just opened has no posts in it, and that is the state this
 * page is designed around rather than the state it apologises for. The first
 * thing a visitor sees is what the place is, who is looking after it, and the
 * two things they can do: join it, or offer to help keep it. Posts land in the
 * next slice and the feed section already holds the shape they will fill.
 *
 * A slug that does not resolve renders the same not found whether the place
 * does not exist or is somebody else's private proposal. Distinguishing them
 * would tell a stranger that a private proposal exists, which is a disclosure
 * dressed up as a helpful error.
 */
export default async function AreaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  /* The counts below were formatted with a hardcoded "en-NG". See the note in
     KNOWN_GAPS: it produces the same string in all four languages today, so
     this is correctness rather than a visible fix, and it is cheap here
     because the locale is one call away. */
  const locale = await getLocale();
  const { slug } = await params;
  if (!(await isSocialEnabled())) return <SocialPaused />;

  const detail = await getArea(slug);

  // Two different answers that used to look the same. No keys means the feature
  // is not switched on; null means this place genuinely is not there. A 404 for
  // the first one tells the owner we deleted their page.
  if (detail === "unconfigured") {
    return (
      <div className="mx-auto w-full max-w-3xl pb-24 pt-4">
        <PageHeader title="Around" fallback="/around" />
        <p className="nf-card p-5 text-sm leading-relaxed text-[var(--nf-content-secondary)]">
          Places switch on the moment the platform keys land. Nothing here is a
          mock up: there is simply nothing to read yet.
        </p>
      </div>
    );
  }
  if (!detail) notFound();

  const { area, viewer, moderators } = detail;
  const [feed, stories, reviews, mine, within, door] = await Promise.all([
    getAreaFeed(area.id),
    listStories({ areaId: area.id, limit: 12 }),
    /* Six reads that all start at once cost one round trip. The same six in
       sequence cost six, and on the connections this product is built for
       that is the whole difference between a page and a wait. */
    getPlaceReviews({ city: area.city, area: area.area, name: area.name }),
    listMyAreas(),
    /* Which way this place faces. A local government looks down at the finer
       places inside it; a finer place looks up at the local government it is
       in. Exactly one of these two reads ever returns anything. */
    area.lgaCode ? listPlacesWithinLga(area.lgaCode, area.id) : Promise.resolve([]),
    !area.lgaCode && area.withinLgaCode
      ? getLgaDoor(area.withinLgaCode)
      : Promise.resolve(null),
  ]);
  const isModerator = viewer.role === "MODERATOR";

  return (
    <div className="mx-auto w-full max-w-3xl pb-24 pt-4">
      {/* The way back up. A person who walked into Lekki Phase 1 from a search
          may not know Eti-Osa is above it, and this is the only line on the
          page that tells them. */}
      {door ? (
        <Link href={`/around/${door.slug}`} className="nf-enter__back mb-4">
          <UiIcon name="arrow-left" size={15} />
          Part of {door.name}
        </Link>
      ) : null}

      {area.status === "PROPOSED" ? (
        <p className="nf-card mb-5 border-[var(--nf-border-brand)] p-4 text-sm leading-relaxed text-[var(--nf-content-secondary)]">
          You suggested this place and it is still with us. {AREA_COPY.proposePending}
        </p>
      ) : null}

      {area.status === "PAUSED" ? (
        <p className="nf-card mb-5 p-4 text-sm leading-relaxed text-[var(--nf-content-secondary)]">
          {AREA_COPY.paused}
        </p>
      ) : null}

      {area.slowMode && area.status === "ACTIVE" ? (
        <p className="mb-5 rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] bg-[var(--nf-surface-inset)] px-4 py-3 text-xs leading-relaxed text-[var(--nf-content-muted)]">
          {AREA_COPY.slowMode}
        </p>
      ) : null}

      <section className="mb-6">
        <Feed
          initial={feed.posts}
          signedIn={viewer.signedIn}
          canCompose
          areaId={area.status === "ACTIVE" ? area.id : undefined}
          areaName={area.name}
          emptyMessage={
            viewer.signedIn ? POST_COPY.emptyFeed : POST_COPY.emptyFeedSignedOut
          }
          district={{
            city: area.city,
            slug: area.slug,
            places: mine
              .filter((place) => place.status === "ACTIVE")
              .map((place) => ({ slug: place.slug, name: place.name, city: place.city })),
            stories,
            reviews,
            join:
              area.status === "ACTIVE" ? (
                <JoinButton
                  areaId={area.id}
                  joined={viewer.member}
                  signedIn={viewer.signedIn}
                  size="sm"
                />
              ) : null,
          }}
        />
        {feed.ended && feed.posts.length > 0 ? (
          <p
            aria-live="polite"
            className="mt-5 text-center text-xs text-[var(--nf-content-muted)]"
          >
            {POST_COPY.endOfSession}
          </p>
        ) : null}
      </section>

      {/* What this place is, under the conversation rather than above it. The
          board's district feed goes header, chips, cards; the description is
          something people read once and the feed is what they came for. */}
      <section className="nf-card mb-5 p-5">
        {area.blurb ? (
          <p className="text-base leading-relaxed text-[var(--nf-content-primary)]">
            {area.blurb}
          </p>
        ) : null}

        <dl className="mt-4 flex flex-wrap gap-x-7 gap-y-3">
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--nf-content-muted)]">
              Members
            </dt>
            <dd className="nf-numeric mt-0.5 text-lg font-bold text-[var(--nf-content-primary)]">
              {formatNumber(area.memberCount, locale)}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--nf-content-muted)]">
              Posts
            </dt>
            <dd className="nf-numeric mt-0.5 text-lg font-bold text-[var(--nf-content-primary)]">
              {formatNumber(area.postCount, locale)}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--nf-content-muted)]">
              Looked after by
            </dt>
            <dd className="nf-numeric mt-0.5 text-lg font-bold text-[var(--nf-content-primary)]">
              {moderators.length}
            </dd>
          </div>
        </dl>

        {moderators.length > 0 ? (
          <p className="mt-4 text-xs leading-relaxed text-[var(--nf-content-muted)]">
            Kept by{" "}
            {moderators.map((mod, index) => (
              <span key={mod.userId}>
                {index > 0 ? ", " : ""}
                {mod.handle ? (
                  <Link
                    href={`/u/${mod.handle}`}
                    className="font-semibold text-[var(--nf-brand-secondary)]"
                  >
                    @{mod.handle}
                  </Link>
                ) : (
                  "a member"
                )}
              </span>
            ))}
            . They can hide a post while somebody reviews it, and they cannot
            delete anybody&rsquo;s post.
          </p>
        ) : (
          <p className="mt-4 text-xs leading-relaxed text-[var(--nf-content-muted)]">
            Nobody is looking after this place yet.
          </p>
        )}
      </section>


      {/* A local government is the coarse door. The room somebody actually
          lives in is usually finer than it, and `areas.within_lga_code` is set
          on every place, so offering them is one predicate rather than a join
          nobody can read. */}
      {within.length > 0 ? (
        <section className="nf-enter mb-5">
          <h2 className="nf-enter__title">{PLACE_COPY.withinTitle(area.name)}</h2>
          <p className="nf-enter__lede">{PLACE_COPY.withinBody}</p>
          <ul className="nf-enter__grid">
            {within.map((place) => (
              <li key={place.id}>
                <Link
                  href={`/around/${place.slug}`}
                  className="nf-enter__chip"
                  aria-label={`${place.name}, ${place.memberCount} ${place.memberCount === 1 ? "member" : "members"}`}
                >
                  <span className="nf-enter__chip-name">{place.name}</span>
                  <span className="nf-enter__chip-count nf-numeric">
                    {formatNumber(place.memberCount, locale)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {viewer.member && !isModerator && area.status === "ACTIVE" ? (
        <ModeratorApply
          areaId={area.id}
          areaName={area.name}
          pendingApplication={viewer.moderatorApplicationStatus === "PENDING"}
        />
      ) : null}

      {isModerator ? (
        <div className="nf-card border-[var(--nf-border-brand)] p-4">
          <p className="text-sm font-semibold text-[var(--nf-content-primary)]">
            You look after {area.name}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--nf-content-muted)]">
            Your name carries a moderator mark in this place and nowhere else.
            You can hide a post while somebody reviews it. You cannot delete one,
            and nobody expects you to be available at 2am.
          </p>
        </div>
      ) : null}

      {/* The dock travels with the social layer. Here it already knows the
          place, so Drop gist opens straight onto the composer. */}
      <AroundFab currentAreaId={area.status === "ACTIVE" ? area.id : undefined} />
    </div>
  );
}
