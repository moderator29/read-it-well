import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary } from "@naijafinds/i18n";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { getLocale } from "@/lib/locale";
import { resolveSession } from "@/lib/actions/session";
import { listMyAreas, type AreaSummary } from "@/lib/social/areas-queries";
import {
  getAreaFeed,
  getEverywhereFeed,
  getJoinedFeed,
} from "@/lib/social/posts-queries";
import { POST_COPY } from "@/lib/social/posts-schema";
import { PLACE_COPY } from "@/lib/social/places-schema";
import { Feed } from "@/components/social/feed/Feed";
import {
  FeedMasthead,
  FeedTabs,
  isFeedTab,
  type FeedTab,
} from "@/components/social/feed/FeedMasthead";
import { AroundFab } from "@/components/social/AroundFab";
import { SocialPaused } from "@/components/social/SocialPaused";
import { isSocialEnabled } from "@/lib/social/flag";

export const metadata: Metadata = { title: "Around" };

export const dynamic = "force-dynamic";

/**
 * Around: the feed.
 *
 * The bottom navigation says Around, and until now tapping it handed back a
 * directory of rooms rather than the conversation happening inside them. The
 * owner named it exactly: it should go straight to the feed, and everything
 * that makes the feed deeper belongs behind a control inside it. So this screen
 * is the timeline and `/around/settings` is the directory.
 *
 * Three states, and none of them is a blank screen with an invitation on it:
 *
 * 1. Signed in with places joined: everything said in those places plus
 *    everything addressed to the whole platform, newest first, through
 *    `getJoinedFeed`.
 * 2. Signed in with none joined, or signed out entirely: everything anybody may
 *    read, through `getEverywhereFeed`, under a line saying plainly that these
 *    places are not yours yet and one control that goes and picks them. Real
 *    posts by real people. Nothing on this screen is invented, and if the
 *    platform has genuinely said nothing then the feed is empty and says so
 *    rather than filling itself.
 * 3. One of your places chosen in the switcher: that place's own timeline,
 *    which is the same read `/around/[slug]` makes.
 *
 * There is a fourth state, and it is not a variant of the third: a build with
 * no platform keys cannot read anything at all. Every other door in this family
 * already says so in the person's own words. `/around/[slug]` and
 * `/around/settings` both carry the same sentence, and so do `/u/[handle]` and
 * both follow lists. This screen was the one that did not. It rendered the
 * ordinary empty feed, which on the combined timeline reads "Nothing has been
 * said in any open place yet. Nothing is hidden and nothing is missing", and
 * that is a claim about the country an unconfigured build has no standing to
 * make: nothing was read, so nothing is known.
 *
 * The same visit also loses its create dock, because `AroundFab` renders
 * nothing when there is genuinely nothing behind it, and that part is right.
 * What was wrong is that the screen then said nothing about it, so a control
 * vanished and a falsehood was asserted in the same paint. The dock stays gone
 * and the sentence below explains it, by letting the unconfigured line win over
 * every other empty state.
 *
 * The choice lives in `?place=`, not in state, so a reload lands where the
 * person was and the back button walks back through the places they looked at.
 */
export default async function AroundPage({
  searchParams,
}: {
  searchParams: Promise<{ place?: string | string[]; tab?: string | string[] }>;
}) {
  if (!(await isSocialEnabled())) return <SocialPaused />;

  const [params, locale, session, mine] = await Promise.all([
    searchParams,
    getLocale(),
    resolveSession(),
    listMyAreas(),
  ]);

  const t = getDictionary(locale);
  const signedIn = session.state === "signed-in";
  /* Not the same thing as signed out. Signed out is a person we know nothing
     about; unconfigured is a platform that cannot look anybody up, and the two
     deserve different sentences because only one of them is fixed by signing
     in. `AroundFab` already makes exactly this distinction one level down. */
  const unconfigured = session.state === "unconfigured";
  const viewerId = signedIn ? session.user.id : null;

  const rawPlace = Array.isArray(params.place) ? params.place[0] : params.place;
  /* Only a place this person is actually in can be chosen. A `?place=` naming
     anything else falls back to the combined feed rather than erroring: the
     switcher cannot produce such a link, so the only way to hold one is a stale
     bookmark from before somebody left a place, and the honest answer to that
     is their feed rather than a 404. */
  const selected: AreaSummary | null =
    typeof rawPlace === "string" ? (mine.find((area) => area.slug === rawPlace) ?? null) : null;

  /* One of three reads, never two. `getJoinedFeed` resolves the membership
     through the viewer's own RLS-bound client, so this passes an id rather than
     a list of places it read itself and the database stays the authority. */
  const rawTab = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const tab: FeedTab = isFeedTab(rawTab) ? rawTab : "for-you";

  /*
   * Three timelines, and each one is honest about what it is.
   *
   *   For you    your places and everything said to the platform at large. A
   *              first visit must never be an empty screen, so somebody who has
   *              joined nothing gets everywhere rather than nothing.
   *   Following  ONLY your places, plus the public posts, because a public post
   *              is addressed to everybody and that includes you. It says
   *              nothing when you have joined nothing, because pretending
   *              otherwise would make the two tabs the same tab.
   *   New        everything anybody may read, whoever you are. This is the tab
   *              that works signed out, and it is why the feed is worth opening
   *              on day one.
   */
  const feed = selected
    ? await getAreaFeed(selected.id)
    : tab === "following"
      ? viewerId && mine.length > 0
        ? await getJoinedFeed(viewerId)
        : { posts: [], cursor: null, ended: true }
      : tab === "new"
        ? await getEverywhereFeed()
        : viewerId && mine.length > 0
          ? await getJoinedFeed(viewerId)
          : await getEverywhereFeed();

  /** True when the person is reading places they have not joined. */
  const browsingOpen = !selected && tab === "for-you" && mine.length === 0;

  /* Unconfigured is tested first and beats every branch under it on purpose.
     Each of those branches is a statement of fact about what is out there, that
     nothing new has been said, that nobody has said anything anywhere, that
     your own places are quiet, and without keys not one of them was checked.
     Saying any of them would be inventing an answer, which is the one thing
     an empty state must never do. */
  const emptyMessage = unconfigured
    ? PLACE_COPY.unconfigured
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

  return (
    <div
      className="mx-auto w-full max-w-3xl pt-4"
      /* The dock floats over the bottom of the screen on a phone, and this is
         the one route in the social layer that keeps it. Padding rather than a
         fixed pb-24 so the clearance tracks the dock's real height and the home
         indicator's inset together. */
      style={{ paddingBottom: "var(--nf-tabbar-clearance)" }}
      data-testid="around-feed"
    >
      <FeedMasthead t={t} />
      <FeedTabs active={tab} t={t} />

      {/* One place, chosen from the directory. It is named here rather than in
          the masthead because the masthead is the product's identity and this
          is a filter on top of it. */}
      {selected ? (
        <p className="mb-3 flex items-center gap-2 text-sm text-[var(--nf-content-secondary)]">
          <UiIcon name="location" size={15} />
          <span className="font-semibold text-[var(--nf-content-primary)]">{selected.name}</span>
          <Link href="/around" className="ms-auto text-[var(--nf-brand-secondary)]">
            {t.social.allPlaces}
          </Link>
        </p>
      ) : null}

      {/* Suppressed without keys, and not merely because it would be a second
          card. Both of its sentences open "this is the busiest open places",
          which names something the page did not read and cannot show, and the
          control under them goes to a directory that is itself unconfigured, so
          the one action offered leads to the same apology in different words.
          The empty state below says the true thing once, and once is the count
          `/around/settings` settled on for this same fact: a screen that
          apologises twice for one thing reads as a screen nobody looked at. */}
      {browsingOpen && !unconfigured ? (
        <div className="nf-card mb-4 p-4">
          <p className="text-sm leading-relaxed text-[var(--nf-content-secondary)]">
            {signedIn ? t.social.browsingOpen : t.social.browsingOpenSignedOut}
          </p>
          <Link
            href="/around/settings"
            className="nf-btn nf-btn--primary mt-4 inline-flex h-10 items-center px-5 text-sm"
          >
            {t.social.pickPlaces}
          </Link>
        </div>
      ) : null}

      {selected ? (
        <Link
          href={`/around/${selected.slug}`}
          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--nf-brand-secondary)]"
        >
          <UiIcon name="compass" size={15} />
          {t.social.openPlacePage}
        </Link>
      ) : null}

      <section>
        {/*
          No `district` prop on purpose. That block draws the place header and
          the five-way chip row, both of which answer "which district am I in",
          and on a combined timeline there is no single answer. `/around/[slug]`
          is where a place gets its own head, and it still does.

          The composer used to appear only when one place was chosen, because a
          post had to land somewhere. It does not any more: with no place
          selected the post is addressed to the whole platform, which is what
          the composer now says under the box.
        */}
        <Feed
          initial={feed.posts}
          locale={locale}
          signedIn={signedIn}
          canCompose
          areaId={selected && selected.status === "ACTIVE" ? selected.id : undefined}
          areaName={selected?.name}
          emptyMessage={emptyMessage}
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

      <AroundFab
        currentAreaId={selected && selected.status === "ACTIVE" ? selected.id : undefined}
      />
    </div>
  );
}
