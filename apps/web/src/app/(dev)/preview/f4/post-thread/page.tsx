import { PageHeader } from "@/components/app/PageHeader";
import { getDictionary } from "@vallo/i18n";
import { sheetWordsOf } from "@/components/social/sheet-words";
import { ThreadView } from "@/app/(app)/post/[id]/ThreadView";
import { CreateBloom } from "@/components/social/bloom/CreateBloom";
import { FEED_PLACES, THREAD } from "../fixtures";

/**
 * A post thread, from fixtures: the real `ThreadView` under the real page
 * header, with the plus in the corner, exactly as `/post/[id]` composes it.
 * The thread inherits the feed register (`DESIGN_DIRECTION` section 3.7).
 */
export default function PostThreadPreview() {
  return (
    <div className="nf-shell mx-auto w-full max-w-2xl pb-4xl pt-md">
      <PageHeader title="Thread" subtitle="Around Lekki Phase 1" fallback="/around" />
      <ThreadView thread={THREAD} signedIn openReply={false} sheet={sheetWordsOf(getDictionary("en"))} />
      <CreateBloom
        signedIn
        areas={FEED_PLACES.map((place, index) => ({
          id: `00000000-0000-4000-8000-00000000c00${index + 1}`,
          name: place.name,
          city: place.city,
        }))}
        reviewable={[]}
      />
    </div>
  );
}
