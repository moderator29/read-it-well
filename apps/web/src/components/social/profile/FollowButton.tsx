"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/components/auth/AuthGate";
import { toggleFollow } from "@/lib/social/follows-actions";

/**
 * Follow, and unfollow.
 *
 * Optimistic where it is safe to be and truthful the moment it is not. The
 * label flips on the tap, because the person already knows what they did and
 * waiting for a round trip to admit it feels broken. If the database refuses,
 * the label goes straight back to what the database says and the reason is
 * shown in full underneath, never swallowed.
 *
 * The counts are not guessed here. They are maintained by a trigger, so the
 * page is refreshed after a successful write and the Followers figure comes
 * back from the row rather than from arithmetic this component did. A number
 * that is right a beat later beats a number that is confidently wrong.
 *
 * Signed out, this is a link to sign in rather than a button that fails. A
 * control that cannot work should say so before it is pressed.
 *
 * **The words are a prop, and they are optional for one honest reason.** This
 * button appears in four places. On `/u/[handle]` a server component resolves
 * the reader's dictionary and hands the four strings down, so a Hausa reader
 * gets a Hausa button. The other three - the people list, the story viewer and
 * the people directory - sit under client components that hold no dictionary,
 * and threading one to each of them means translating three screens of prose
 * that are not this task. Until that happens they get the English below, which
 * is the same wording `en.socialProfile` carries, kept here as literals rather
 * than by importing `getDictionary` so a client bundle does not have to carry
 * all four languages to render one word.
 */

export type FollowLabels = {
  follow: string;
  following: string;
  followAria: string;
  unfollowAria: string;
};

const ENGLISH: FollowLabels = {
  follow: "Follow",
  following: "Following",
  followAria: "Follow @{handle}",
  unfollowAria: "Following @{handle}. Tap to unfollow.",
};

export function FollowButton({
  handle,
  initialFollowing,
  signedIn,
  compact = false,
  labels = ENGLISH,
}: {
  handle: string;
  initialFollowing: boolean;
  signedIn: boolean;
  /** Small and pill shaped, for a row floating over a photograph. */
  compact?: boolean;
  /** From `t.socialProfile` where a server component has one in hand. */
  labels?: FollowLabels;
}) {
  const router = useRouter();
  const { gateHref } = useRequireAuth();
  const [following, setFollowing] = useState(initialFollowing);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const shape = compact
    ? "nf-btn nf-btn--primary h-9 shrink-0 px-4 text-[0.8rem]"
    : "nf-btn min-w-[6.5rem]";

  /*
   * SIGNED OUT IT IS STILL A LINK, and it now remembers what it was for.
   *
   * This pointed at a bare `/sign-in`, so a guest who tapped Follow on a
   * profile signed in and landed on the home shelf, with no way back to the
   * person they had been looking at short of searching for them again. The
   * shared gate builds the href instead: `/sign-up?next=/u/ada?do=follow`.
   *
   * It stays an anchor rather than becoming an `<AuthGate>` wrapper because an
   * anchor is the honest element here - it navigates, it can be opened in a new
   * tab, and it needs no JavaScript to work.
   */
  if (!signedIn) {
    return (
      <Link href={gateHref("follow")} className={compact ? shape : "nf-btn nf-btn--primary"}>
        {labels.follow}
      </Link>
    );
  }

  const onClick = () => {
    const next = !following;
    setFollowing(next);
    setError(null);

    startTransition(async () => {
      const result = await toggleFollow({ handle });
      if (!result.ok) {
        setFollowing(!next);
        setError(result.error);
        return;
      }
      /* The database is the authority even when it agrees with us: a second tab
         may already have done this. */
      setFollowing(result.data.following);
      router.refresh();
    });
  };

  return (
    <div className={compact ? "shrink-0" : "flex flex-col items-end gap-1.5"}>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        aria-pressed={following}
        aria-label={(following ? labels.unfollowAria : labels.followAria).replace(
          "{handle}",
          handle,
        )}
        className={
          compact
            ? `${shape}${following ? " nf-btn--glass" : ""}`
            : `nf-btn ${following ? "nf-btn--glass" : "nf-btn--primary"} min-w-[6.5rem]`
        }
      >
        {following ? labels.following : labels.follow}
      </button>
      {error && (
        <p
          role="alert"
          className="max-w-[14rem] text-right text-[0.75rem] leading-snug text-[var(--nf-state-error)]"
        >
          {error}
        </p>
      )}
    </div>
  );
}
