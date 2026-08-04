"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
 */
export function FollowButton({
  handle,
  initialFollowing,
  signedIn,
  compact = false,
}: {
  handle: string;
  initialFollowing: boolean;
  signedIn: boolean;
  /** Small and pill shaped, for a row floating over a photograph. */
  compact?: boolean;
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const shape = compact
    ? "nf-btn nf-btn--primary h-9 shrink-0 px-4 text-[0.8rem]"
    : "nf-btn min-w-[6.5rem]";

  if (!signedIn) {
    return (
      <Link href="/sign-in" className={compact ? shape : "nf-btn nf-btn--primary"}>
        Follow
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
        aria-label={following ? `Following @${handle}. Tap to unfollow.` : `Follow @${handle}`}
        className={
          compact
            ? `${shape}${following ? " nf-btn--glass" : ""}`
            : `nf-btn ${following ? "nf-btn--glass" : "nf-btn--primary"} min-w-[6.5rem]`
        }
      >
        {following ? "Following" : "Follow"}
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
