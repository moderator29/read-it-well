"use client";

import Link from "next/link";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import type { BrandIconName } from "@/design-system/icons/BrandIcon";
import { Feed } from "@/components/social/feed/Feed";
import type { PostView } from "@/components/social/feed/PostCard";

/**
 * One tab's worth of somebody's page.
 *
 * The cards are the platform's own `Feed` and `PostCard`, not a second set
 * built for this surface. A post has to look and behave the same wherever it is
 * read, and the marks, the overflow menu and the optimistic like all already
 * live there.
 *
 * The tab bar above this used to be absent, deliberately, because a Replies tab
 * that could never fill would tell somebody with forty replies that they had
 * none. `getProfileReplies` and `getProfileMedia` now exist, so the bar is back
 * and this component renders whichever of the three it is handed. The only
 * thing that changes between them is the words on an empty one, which is the
 * whole reason they are three tabs and not one list.
 */

export type ProfileTabKey = "posts" | "replies" | "media";

type EmptyCopy = {
  icon: BrandIconName;
  /** Shown to the person whose page it is. */
  mineTitle: string;
  mineBody: string;
  /** Shown to everybody else. `{handle}` is substituted. */
  theirsTitle: string;
  theirsBody: string;
};

const EMPTY: Record<ProfileTabKey, EmptyCopy> = {
  posts: {
    icon: "chat",
    mineTitle: "Nothing here yet",
    mineBody:
      "Everything you write around a place sits here, newest first, so anybody who follows you can find it later.",
    theirsTitle: "@{handle} has not posted yet",
    theirsBody: "When they write something around a place, it shows up here.",
  },
  replies: {
    icon: "chat-duo",
    mineTitle: "You have not replied to anything yet",
    mineBody:
      "Answering somebody is the fastest way into a place. Every reply you write shows up here with the person it answers.",
    theirsTitle: "@{handle} has not replied to anything yet",
    theirsBody:
      "Replies they write in a conversation show up here, alongside the person each one answers.",
  },
  media: {
    icon: "camera",
    mineTitle: "No pictures yet",
    mineBody:
      "A photograph of a street, a generator, a queue or a view says more about a place than a paragraph does. Anything you post with a picture lands here.",
    theirsTitle: "@{handle} has not posted a picture yet",
    theirsBody: "Anything they post with a picture in it shows up here.",
  },
};

/** The line under a tab that has posts in it, when the feed itself is empty. */
const FEED_EMPTY: Record<ProfileTabKey, { mine: string; theirs: string }> = {
  posts: {
    mine: "Everything you write around a place sits here.",
    theirs: "When @{handle} writes something, it shows up here.",
  },
  replies: {
    mine: "Every reply you write shows up here.",
    theirs: "When @{handle} replies to somebody, it shows up here.",
  },
  media: {
    mine: "Anything you post with a picture lands here.",
    theirs: "When @{handle} posts a picture, it shows up here.",
  },
};

export function ProfilePosts({
  tab,
  handle,
  posts,
  isOwner,
  signedIn,
  hasBio,
  labelledBy,
}: {
  tab: ProfileTabKey;
  handle: string;
  posts: PostView[];
  isOwner: boolean;
  signedIn: boolean;
  /** Drives the owner's first useful action while the page is empty. */
  hasBio: boolean;
  /** The id of the tab this panel belongs to. */
  labelledBy?: string;
}) {
  const copy = EMPTY[tab];

  if (posts.length === 0) {
    return (
      <section
        className="mt-5"
        role="tabpanel"
        aria-labelledby={labelledBy}
        tabIndex={-1}
      >
        <div className="nf-card nf-social-card p-6 text-center sm:p-8">
          <div className="mx-auto w-fit">
            <BrandIcon name={copy.icon} size={56} />
          </div>
          <h3 className="nf-h3 mt-3.5 text-[1.05rem]">
            {isOwner ? copy.mineTitle : copy.theirsTitle.replace("{handle}", handle)}
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
            {isOwner ? copy.mineBody : copy.theirsBody.replace("{handle}", handle)}
          </p>
          {isOwner && (
            <div className="mt-5">
              {hasBio ? (
                <Link href="/around" className="nf-btn nf-btn--primary">
                  Find a place to talk in
                </Link>
              ) : (
                <Link href={`/u/${handle}/edit`} className="nf-btn nf-btn--primary">
                  Add your bio
                </Link>
              )}
            </div>
          )}
        </div>
      </section>
    );
  }

  const feedEmpty = FEED_EMPTY[tab];

  return (
    <section className="mt-5" role="tabpanel" aria-labelledby={labelledBy} tabIndex={-1}>
      <Feed
        key={tab}
        initial={posts}
        signedIn={signedIn}
        emptyMessage={
          isOwner ? feedEmpty.mine : feedEmpty.theirs.replace("{handle}", handle)
        }
      />
    </section>
  );
}
