import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary } from "@naijafinds/i18n";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { getLocale } from "@/lib/locale";
import { resolveSession } from "@/lib/actions/session";
import { listMyAreas, type AreaSummary } from "@/lib/social/areas-queries";
import {
  getAreaFeed,
  getJoinedFeed,
  getOpenAreasFeed,
} from "@/lib/social/posts-queries";
import { POST_COPY } from "@/lib/social/posts-schema";
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
 * 1. Signed in with places joined: everything said in those places, newest
 *    first, through `getJoinedFeed`.
 * 2. Signed in with none joined, or signed out entirely: the busiest open
 *    places, through `getOpenAreasFeed`, under a line saying plainly that these
 *    are not yours yet and one control that goes and picks them. Real posts by
 *    real people in real places. Nothing on this screen is invented, and if
 *    those places have genuinely said nothing then the feed is empty and says
 *    so rather than filling itself.
 * 3. One of your places chosen in the switcher: that place's own timeline,
 *    which is the same read `/around/[slug]` makes.
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
   *   For you    your places if you have any, the busiest open ones if not.
   *              A first visit must never be an empty screen.
   *   Following  ONLY your places. It says nothing when you have joined
   *              nothing, because pretending otherwise would make the two tabs
   *              the same tab.
   *   New        the open places, whoever you are. This is the tab that works
   *              signed out, and it is why the feed is worth opening on day one.
   */
  const feed = selected
    ? await getAreaFeed(selected.id)
    : tab === "following"
      ? viewerId && mine.length > 0
        ? await getJoinedFeed(viewerId)
        : { posts: [], cursor: null, ended: true }
      : tab === "new"
        ? await getOpenAreasFeed()
        : viewerId && mine.length > 0
          ? await getJoinedFeed(viewerId)
          : await getOpenAreasFeed();

  /** True when the person is reading places they have not joined. */
  const browsingOpen = !selected && tab === "for-you" && mine.length === 0;

  const emptyMessage = selected
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

      {browsingOpen ? (
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

          The composer appears only when one place is chosen, because a post has
          to land somewhere. On the combined feed the dock carries the picker,
          which is what it was built for.
        */}
        <Feed
          initial={feed.posts}
          locale={locale}
          signedIn={signedIn}
          isMember={Boolean(selected)}
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
