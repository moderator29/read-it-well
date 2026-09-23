import { getDictionary } from "@vallo/i18n";
import { Feed } from "@/components/social/feed/Feed";
import { FeedTabs, isFeedTab } from "@/components/social/feed/FeedMasthead";
import { LocationChip } from "@/components/social/feed/LocationChip";
import { StoryRing } from "@/components/social/feed/StoryRing";
import { CreateBloom } from "@/components/social/bloom/CreateBloom";
import { BackButton } from "@/components/site/BackButton";
import { SettleFocus } from "../../f4/SettleFocus";
import { FEED_PLACES, FEED_POSTS, FEED_STORIES, REVIEWABLE } from "./fixtures";

/**
 * `/preview/session-b/feed`: the feed and the plus bloom, signed in, on the
 * real components with FIXTURE PROPS (ruling R-G). The live route is
 * `app/(app)/around/page.tsx`; this renders the same components in the same
 * order inside the same shell gutter, so a proof from here stands beside the
 * founder's `feed-plus-bloom-target.jpg`.
 *
 *   ?state=feed          the feed, bloom closed (default)
 *   ?state=bloom         the bloom open, born at rest (no frame of the throw)
 *   ?state=following     the Following half lit
 *   ?state=empty         For You with nothing in it
 *   ?state=following-empty  Following for somebody in no place
 *   ?reviewable=0        the Review picker's honest empty sheet
 *
 * The sheets, menus and the composer open from the page by a tap, which is
 * what `scripts/design/session-b-shots/feed.mjs` does.
 */
export default async function FeedHarness({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; reviewable?: string }>;
}) {
  const { state = "feed", reviewable } = await searchParams;
  const t = getDictionary("en");
  const tab = state.startsWith("following") ? "following" : "for-you";
  const empty = state === "empty" || state === "following-empty";
  const open = state === "bloom";

  return (
    <div className="nf-shell pt-md">
      <div
        className="nf-feed-page pt-sm"
        style={{ paddingBottom: "var(--nf-tabbar-clearance)" }}
        data-testid="around-feed"
      >
        <h1 className="sr-only">{t.nav.around}</h1>
        {/* The route draws its back control beside the bar (the nav law:
            `/around` declares `/home` as its parent; request FEED-4). */}
        <div className="flex items-center gap-inline">
          <BackButton fallback="/home" />
          <LocationChip
            place="Lekki, Lagos"
            places={FEED_PLACES}
            currentSlug={null}
            signedIn
            copy={{
              label: t.social.locationLabel,
              allPlaces: t.social.allPlaces,
              changePlace: t.social.changePlace,
              pickPlaces: t.social.pickPlaces,
              signIn: t.common.signIn,
            }}
          />
        </div>
        <StoryRing
          stories={FEED_STORIES}
          you={{ label: "Seyi Omojuni", avatarUrl: "" }}
          yourStoryLabel={t.social.yourStory}
        />
        <FeedTabs active={isFeedTab(tab) ? tab : "for-you"} t={t} />
        <section>
          <Feed
            initial={empty ? [] : FEED_POSTS}
            locale="en"
            signedIn
            canCompose
            emptyMessage={
              state === "following-empty"
                ? t.social.emptyFollowing
                : t.social.emptyAnywhere
            }
            emptyTitle="Nothing here yet"
            emptyAction={{
              href: "/around/settings",
              label: "Find places to join",
            }}
          />
        </section>
        <CreateBloom
          signedIn
          areas={FEED_PLACES.map((place, index) => ({
            id: `00000000-0000-4000-8000-0000000fa00${index + 1}`,
            name: place.name,
            city: place.city,
          }))}
          reviewable={reviewable === "0" ? [] : REVIEWABLE}
          initialOpen={open}
        />
        {open ? <SettleFocus /> : null}
      </div>
    </div>
  );
}
