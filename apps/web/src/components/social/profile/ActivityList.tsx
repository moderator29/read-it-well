"use client";

import { PostGlyph } from "@/components/social/feed/PostGlyph";
import { Feed } from "@/components/social/feed/Feed";
import type { ActivityEntry } from "@/lib/social/posts-queries";
import { EmptyPanel } from "./EmptyPanel";

/**
 * What somebody has been doing, rather than what they wrote.
 *
 * Likes and reposts, newest first. Each entry says which of the two it was in
 * one line above the card, because a post appearing on somebody's page with no
 * explanation reads as theirs, and it is not.
 *
 * Saves are absent, permanently. `post_reactions_select` publishes `LIKE` rows
 * and keeps every other mark private to its author, so a save is between a
 * person and the database, and an Activity tab is not the place to break that.
 * That is a rule in the policy, not a filter in this file.
 *
 * The cards are the platform's own, so a post read here behaves exactly as it
 * does in a feed: the same marks, the same overflow menu, the same optimistic
 * like. One card, everywhere.
 */
export function ActivityList({
  entries,
  handle,
  isOwner,
  signedIn,
}: {
  entries: ActivityEntry[];
  handle: string;
  isOwner: boolean;
  signedIn: boolean;
}) {
  if (entries.length === 0) {
    return (
      <EmptyPanel
        icon="chart-growth"
        title={isOwner ? "Nothing here yet" : `@${handle} has not marked anything yet`}
        body={
          isOwner
            ? "Anything you like or repost shows up here, so you can find your way back to it. What you save stays private and never appears."
            : "Anything they like or repost shows up here. What somebody saves is private and never appears."
        }
        action={isOwner ? { href: "/around", label: "Find something to read" } : undefined}
      />
    );
  }

  return (
    <div className="flex flex-col gap-[var(--nf-social-gap)]">
      {entries.map((entry, index) => (
        <div key={`${entry.kind}-${entry.post.id}-${index}`}>
          <p className="mb-1.5 inline-flex items-center gap-2 text-[0.72rem] font-semibold text-[var(--nf-content-muted)]">
            <PostGlyph name={entry.kind === "LIKE" ? "like" : "repost"} size={14} active />
            {entry.kind === "LIKE"
              ? isOwner
                ? "You liked this"
                : `@${handle} liked this`
              : isOwner
                ? "You reposted this"
                : `@${handle} reposted this`}
          </p>
          {/* One card per entry rather than one Feed for all of them, so the
              line above each card belongs to that card and cannot drift onto
              the next one when the list re-renders. */}
          <Feed
            initial={[entry.post]}
            signedIn={signedIn}
            isMember={false}
            emptyMessage="That post is no longer there."
          />
        </div>
      ))}
    </div>
  );
}
