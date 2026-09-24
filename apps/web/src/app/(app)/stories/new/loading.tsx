/**
 * The wait, before the story composer.
 *
 * The page cannot draw the form until it knows which places this person has
 * actually joined, because only an ACTIVE place may be offered: `stories_insert_self`
 * refuses anything else, and a place in the picker that the database will refuse
 * is a refusal wearing a control. That is a session read and a membership read
 * before the first field, and it is reached from the create ring, where the tap
 * is deliberate and the wait is felt.
 */
import { Skeleton } from "@/components/ui/Skeleton";
import { State } from "@/components/ui/State";

export default function LoadingNewStory() {
  return (
    <State kind="loading" title="Opening the story composer" className="mx-auto w-full max-w-2xl pb-4xl pt-md">

      <div className="mb-lg space-y-sm" aria-hidden="true">
        <Skeleton width="10rem" height="1.75rem" radius="xs" />
        <Skeleton width="16rem" height="0.75rem" radius="xs" />
      </div>

      <div className="nf-panel nf-panel--card block space-y-md p-lg" aria-hidden="true">
        {/* The picture comes first in the real composer, and it is the tallest
            thing on the page, so the skeleton keeps its proportion. */}
        <Skeleton radius="sm" className="aspect-[4/5]" />
        <Skeleton height="2.75rem" radius="md" />
        <Skeleton height="2.75rem" radius="md" />
        <Skeleton height="6rem" radius="md" />
        <Skeleton width="10rem" height="2.75rem" radius="md" />
      </div>
    </State>
  );
}
