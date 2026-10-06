import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { resolveSession } from "@/lib/actions/session";
import { loadProfileState } from "@/lib/profile/queries";
import { listMyAreas, type AreaSummary } from "@/lib/social/areas-queries";
import {
  getAreaFeed,
  getEverywhereFeed,
  getJoinedFeed,
} from "@/lib/social/posts-queries";
import { listStories } from "@/lib/social/stories-queries";
import { stampAuthorTiers } from "@/lib/social/author-badges";
import { POST_COPY } from "@/lib/social/posts-schema";
import { AROUND_UNCONFIGURED } from "./copy";
import { loadMoreAround } from "./feed-actions";
import type { FeedMode } from "@/lib/social/posts-actions";
import { Feed } from "@/components/social/feed/Feed";
import { FeedTabs, isFeedTab, type FeedTab } from "@/components/social/feed/FeedMasthead";
import { LocationChip } from "@/components/social/feed/LocationChip";
import { StoryRing } from "@/components/social/feed/StoryRing";
import { AroundFab } from "@/components/social/AroundFab";
import { SocialPaused } from "@/components/social/SocialPaused";
import { BackButton } from "@/components/site/BackButton";
import { isSocialEnabled } from "@/lib/social/flag";

export const metadata: Metadata = { title: "Around" };

export const dynamic = "force-dynamic";

/**
 * Around: the feed, to `GOVERNING-feed-plus-bloom.png`.
 *
 * Top to bottom: the location chip (the person's own place, the chevron
 * opening the real choices), the story rings, the For you / Following capsule,
 * the cards, and the plus that blooms. The app's own header sits above all of
 * it and the dock below; both are the shell's.
 *
 * Three timelines, and each one is honest about what it is:
 *
 *   For you    your places and everything said to the platform at large. A
 *              first visit must never be an empty screen, so somebody who has
 *              joined nothing gets everywhere rather than nothing.
 *   Following  ONLY your places, plus the public posts, because a public post
 *              is addressed to everybody and that includes you. It says
 *              nothing when you have joined nothing, because pretending
 *              otherwise would make the two segments the same segment.
 *   One place  chosen from the chip: that place's own timeline, the same read
 *              `/around/[slug]` makes. It lives in `?place=` so a reload lands
 *              where the person was.
 *
 * Unconfigured is not signed out. Signed out is a person we know nothing
 * about; unconfigured is a platform that cannot look anybody up, and only one
 * of them is fixed by signing in. Without keys the page reads nothing, so it
 * says nothing about the country, and the bloom stays away because there is
 * nothing behind it.
 */
export default async function AroundPage({
  searchParams,
}: {
  searchParams: Promise<{ place?: string | string[]; tab?: string | string[]; compose?: string | string[] }>;
}) {
  if (!(await isSocialEnabled())) return <SocialPaused />;

  const [params, locale, session, mine, account, stories] = await Promise.all([
    searchParams,
    getLocale(),
    resolveSession(),
    listMyAreas(),
    loadProfileState(),
    listStories({ limit: 16 }),
  ]);

  const t = getDictionary(locale);
  const signedIn = session.state === "signed-in";
  const unconfigured = session.state === "unconfigured";
  const viewerId = signedIn ? session.user.id : null;

  const rawPlace = Array.isArray(params.place) ? params.place[0] : params.place;
  /* Only a place this person is actually in can be chosen. A `?place=` naming
     anything else falls back to the combined feed rather than erroring: the
     only way to hold one is a stale bookmark, and the honest answer to that is
     their feed rather than a 404. */
  const selected: AreaSummary | null =
    typeof rawPlace === "string" ? (mine.find((area) => area.slug === rawPlace) ?? null) : null;

  const rawTab = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const tab: FeedTab = isFeedTab(rawTab) ? rawTab : "for-you";
  const joined = viewerId !== null && mine.length > 0;

  const read = selected
    ? await getAreaFeed(selected.id)
    : tab === "following"
      ? joined
        ? await getJoinedFeed(viewerId)
        : { posts: [], cursor: null, ended: true }
      : tab === "new"
        ? await getEverywhereFeed()
        : joined
          ? await getJoinedFeed(viewerId)
          : await getEverywhereFeed();
  /* Each author's published badge, the tick the image draws beside a name. */
  const feed = { ...read, posts: await stampAuthorTiers(read.posts) };

  const browsingOpen = !selected && tab === "for-you" && mine.length === 0;

  /* The timeline the next page continues, named for BB's `loadMoreFeed`: the
     same three reads as above, so page two is read exactly as page one was. */
  const activeArea = selected && selected.status === "ACTIVE" ? selected.id : undefined;
  const feedMode: FeedMode = activeArea
    ? { kind: "area", areaId: activeArea }
    : tab === "following"
      ? { kind: "joined" }
      : tab === "new"
        ? { kind: "everywhere" }
        : joined
          ? { kind: "joined" }
          : { kind: "everywhere" };

  /* Unconfigured beats every branch under it. Each of those is a statement of
     fact about what is out there, and without keys not one of them was
     checked. */
  const emptyMessage = unconfigured
    ? AROUND_UNCONFIGURED.feedBody
    : selected
      ? signedIn
        ? POST_COPY.emptyFeed
        : POST_COPY.emptyFeedSignedOut
      : tab === "following"
        ? signedIn
          ? t.social.emptyFollowing
          : t.social.emptyFollowingSignedOut
        : tab === "new"
          ? t.social.emptyNew
          : browsingOpen
            ? t.social.emptyAnywhere
            : t.social.emptyJoined;

  /* The chip's words: the person's own place, never a guess. `lgaName,
     stateName` reads "Eti-Osa, Lagos", which is the shape the render draws. */
  const profile = account.state === "signed-in" ? account.profile : null;
  const placeLabel = profile
    ? [profile.place.lgaName, profile.place.stateName].filter(Boolean).join(", ")
    : "";
  const you =
    profile
      ? {
          label:
            profile.displayName ||
            [profile.firstName, profile.surname].filter(Boolean).join(" ") ||
            profile.email,
          avatarUrl: profile.avatarUrl,
        }
      : null;

  const activePlaces = mine
    .filter((area) => area.status === "ACTIVE")
    .map((area) => ({ slug: area.slug, name: area.name, city: area.city }));

  return (
    <div
      /* `nf-feed-page`: the 3xl column, and on a phone the image's 16px
         gutter in place of the shell's 24 (social-feed.css). */
      className="nf-feed-page pt-sm"
      /* The dock floats over the bottom of the screen on a phone. Padding
         rather than a fixed value so the clearance tracks the dock's real
         height and the home indicator's inset together. */
      style={{ paddingBottom: "var(--nf-tabbar-clearance)" }}
      data-testid="around-feed"
    >
      {/* The screen's name for a screen reader; the chip is the visual head. */}
      <h1 className="sr-only">{t.nav.around}</h1>

      {/*
        THE WAY BACK, BESIDE THE PLACE.

        `/around` declares `/home` above it and drew nothing. The paused branch
        above renders `SocialPaused`, which DOES carry a `PageHeader`, and that
        is exactly the trap: a static read of this file found a back control in
        the import graph and the running feed had none, because the only screen
        that drew one was the kill-switch notice nobody sees.

        It sits on the chip's row rather than above it because the chip IS this
        screen's head, the same way the search field is `/search`'s. A
        `PageHeader` here would put the word "Around" over a screen whose first
        object already says where you are.
      */}
      <div className="flex items-center gap-inline">
        <BackButton fallback="/" surface="round" />
        <LocationChip
          place={placeLabel || t.social.locationEverywhere}
          places={activePlaces}
          currentSlug={selected?.slug ?? null}
          signedIn={signedIn}
          copy={{
            label: t.social.locationLabel,
            allPlaces: t.social.allPlaces,
            changePlace: t.social.changePlace,
            pickPlaces: t.social.pickPlaces,
            signIn: t.common.signIn,
          }}
        />
      </div>

      {/* No rings without keys: an empty row would claim nobody has a story,
          and nothing was read. */}
      {unconfigured ? null : (
        <StoryRing
          stories={stories}
          you={you}
          yourStoryLabel={t.social.yourStory}
          seenWord={t.experienceSocial.feed.storySeen}
        />
      )}

      <FeedTabs active={tab} t={t} />

      <section>
        <Feed
          initial={feed.posts}
          pageCursor={feed.cursor}
          /* The next page, through BB's `loadMoreFeed` with the mode bound
             here, so the client supplies a cursor and nothing else. */
          loadMore={loadMoreAround.bind(null, feedMode)}
          locale={locale}
          signedIn={signedIn}
          canCompose
          areaId={activeArea}
          areaName={selected?.name}
          emptyMessage={emptyMessage}
          {...(unconfigured
            ? { emptyTitle: AROUND_UNCONFIGURED.feedTitle, emptyIcon: "home-search" as const }
            : {
                emptyTitle: selected ? `Nothing in ${selected.name} yet` : "Nothing here yet",
                emptyAction: { href: "/around/settings", label: "Find places to join" },
              })}
        />
      </section>

      {/* `?compose=1` is the dock's "Post to the feed" (`CreateDock`): the
          bloom opens on arrival. */}
      <AroundFab currentAreaId={activeArea} initialOpen={params.compose === "1"} />
    </div>
  );
}
