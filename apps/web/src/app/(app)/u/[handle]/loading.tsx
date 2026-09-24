/**
 * The wait, designed.
 *
 * `/u/[handle]` and `/u/[handle]/edit` are both force-dynamic and both make two
 * or three round trips to Postgres before they can render a single word. On a
 * slow connection Next holds the previous screen for that whole time, so a tap
 * on somebody's handle looks like a tap that did nothing. This is the answer to
 * that: the shape of the page arrives immediately, the content fills in.
 *
 * It is the real layout rather than a spinner, so nothing moves when the data
 * lands: the banner, the avatar sitting over it with the action row bottom
 * aligned beside it, the name block, the meta line, the counts and the tab
 * track are all exactly where they will be. Under reduced motion the shimmer
 * stops on its own, because `.nf-social-skeleton` collapses through the token
 * durations.
 *
 * Nothing here is a number or a word. A skeleton that renders "0 Followers"
 * while it waits has told the reader something false about the person, and
 * they will have read it before the truth arrives.
 */
import { Skeleton } from "@/components/ui/Skeleton";
import { State } from "@/components/ui/State";

export default function LoadingProfile() {
  return (
    <State kind="loading" title="Loading this page" className="mx-auto max-w-2xl">

      <div className="nf-social-cover">
        <div className="nf-social-cover__art" aria-hidden="true" />
      </div>

      <div className="nf-social-identity" aria-hidden="true">
        <div className="nf-social-avatar nf-social-avatar--ring" />
        <div className="nf-social-identity__actions">
          <Skeleton width="6rem" height="2.75rem" radius="md" />
          <Skeleton width="2.75rem" height="2.75rem" radius="pill" />
        </div>
      </div>

      <div className="mt-sm space-y-xs" aria-hidden="true">
        <Skeleton width="10rem" height="1.25rem" radius="xs" />
        <Skeleton width="8rem" height="0.75rem" radius="xs" />
        <Skeleton height="0.75rem" radius="xs" className="mt-md" />
        <Skeleton width="80%" height="0.75rem" radius="xs" />
        <div className="flex gap-md pt-xs">
          <Skeleton width="6rem" height="0.75rem" radius="xs" />
          <Skeleton width="6rem" height="0.75rem" radius="xs" />
        </div>
        <div className="flex gap-md pt-xs">
          <Skeleton width="5rem" height="1rem" radius="xs" />
          <Skeleton width="5rem" height="1rem" radius="xs" />
          <Skeleton width="3.5rem" height="1rem" radius="xs" />
        </div>
        <Skeleton height="2.75rem" radius="md" className="mt-lg" />
      </div>
    </State>
  );
}
