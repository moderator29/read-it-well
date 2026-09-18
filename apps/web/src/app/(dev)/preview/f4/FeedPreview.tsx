import { getDictionary } from "@vallo/i18n";
import { Feed } from "@/components/social/feed/Feed";
import { FeedTabs } from "@/components/social/feed/FeedMasthead";
import { LocationChip } from "@/components/social/feed/LocationChip";
import { StoryRing } from "@/components/social/feed/StoryRing";
import { CreateBloom } from "@/components/social/bloom/CreateBloom";
import { FEED_PLACES, FEED_POSTS, FEED_STORIES, YOU } from "./fixtures";

/**
 * The feed as a signed-in person sees it, from fixtures. `bloomOpen` mounts
 * the plus already bloomed so the fan can be photographed against the
 * governing image.
 */
export function FeedPreview({ bloomOpen }: { bloomOpen: boolean }) {
  const t = getDictionary("en");
  return (
    <div
      className="mx-auto w-full max-w-3xl px-md pt-sm"
      style={{ paddingBottom: "var(--nf-tabbar-clearance)" }}
    >
      <h1 className="sr-only">{t.nav.around}</h1>
      <LocationChip
        place="Eti-Osa, Lagos"
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
      <StoryRing stories={FEED_STORIES} you={YOU} yourStoryLabel={t.social.yourStory} />
      <FeedTabs active="for-you" t={t} />
      <section>
        <Feed initial={FEED_POSTS} locale="en" signedIn canCompose emptyMessage="" />
      </section>
      <CreateBloom
        signedIn
        areas={FEED_PLACES.map((place, index) => ({
          id: `00000000-0000-4000-8000-00000000c00${index + 1}`,
          name: place.name,
          city: place.city,
        }))}
        reviewable={[]}
        initialOpen={bloomOpen}
      />
    </div>
  );
}
