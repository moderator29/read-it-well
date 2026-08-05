import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary, type Dictionary } from "@naijafinds/i18n";
import { PageHeader } from "@/components/app/PageHeader";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Chip, ChipRow } from "@/components/ui/Chip";
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
 * is the timeline and `/around/manage` is the directory.
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
  searchParams: Promise<{ place?: string | string[] }>;
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
  const feed = selected
    ? await getAreaFeed(selected.id)
    : viewerId && mine.length > 0
      ? await getJoinedFeed(viewerId)
      : await getOpenAreasFeed();

  /** True when the person is reading places they have not joined. */
  const browsingOpen = !selected && mine.length === 0;

  const emptyMessage = selected
    ? signedIn
      ? POST_COPY.emptyFeed
      : POST_COPY.emptyFeedSignedOut
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
      <PageHeader
        title={selected ? selected.name : t.nav.around}
        subtitle={selected ? selected.city : undefined}
        fallback="/home"
        actions={
          /* The one obvious way from the feed to everything that makes it
             deeper: the country, the directory, your places, your proposals. */
          <Link
            href="/around/manage"
            className="nf-btn nf-btn--ghost inline-flex h-10 items-center gap-2 px-4 text-sm"
          >
            <UiIcon name="sliders" size={16} />
            {t.social.manage}
          </Link>
        }
      />

      <PlaceSwitcher places={mine} activeSlug={selected?.slug ?? null} t={t} />

      {browsingOpen ? (
        <div className="nf-card mb-4 p-4">
          <p className="text-sm leading-relaxed text-[var(--nf-content-secondary)]">
            {signedIn ? t.social.browsingOpen : t.social.browsingOpenSignedOut}
          </p>
          <Link
            href="/around/manage"
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

/**
 * Which places this timeline is made of.
 *
 * `ChipRow` and `Chip` rather than a hand-rolled rail, so this row gets the
 * platform's 44px hit target, its snap behaviour, its hidden scrollbar and its
 * trailing fade for free, and so a change to any of those lands here too.
 *
 * Every chip is a link carrying `?place=`, which is what makes the choice
 * survive a reload and put a real entry in the history stack. `aria-current`
 * comes from `Chip` itself for a selected link, because nothing was toggled:
 * the row is describing where the reader already is.
 *
 * The last chip is always the way to the directory, even for somebody in forty
 * places, so this row is never a control with one dead option in it.
 */
function PlaceSwitcher({
  places,
  activeSlug,
  t,
}: {
  places: AreaSummary[];
  activeSlug: string | null;
  t: Dictionary;
}) {
  return (
    <nav aria-label={t.social.switcherLabel} className="mb-4" data-testid="around-switcher">
      <ChipRow label={t.social.switcherLabel}>
        <Chip
          behaviour="link"
          href="/around"
          size="sm"
          icon="grid"
          selected={activeSlug === null}
          data-testid="around-switcher-all"
        >
          {t.social.allPlaces}
        </Chip>
        {places.map((place) => (
          <Chip
            key={place.slug}
            behaviour="link"
            href={`/around?place=${encodeURIComponent(place.slug)}`}
            size="sm"
            selected={place.slug === activeSlug}
          >
            {place.name}
          </Chip>
        ))}
        <Chip behaviour="link" href="/around/manage" size="sm" icon="sliders">
          {t.social.pickPlaces}
        </Chip>
      </ChipRow>
    </nav>
  );
}
