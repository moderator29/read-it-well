"use client";

import Link from "next/link";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { Feed } from "@/components/social/feed/Feed";
import type { PostView } from "@/components/social/feed/PostCard";

/**
 * What somebody has said, on their own page.
 *
 * The cards are the platform's own `Feed` and `PostCard`, not a second set
 * built for this surface. A post has to look and behave the same wherever it is
 * read, and the marks, the overflow menu and the optimistic like all already
 * live there.
 *
 * There is no tab bar here yet, and that is a deliberate choice rather than an
 * unfinished one. Replies and Media each need their own read, and a tab that
 * can never fill would tell somebody with forty replies that they have none.
 * The bar goes back the moment those two reads exist; until then this surface
 * says exactly what it can prove.
 */
export function ProfilePosts({
  handle,
  posts,
  isOwner,
  signedIn,
  hasBio,
}: {
  handle: string;
  posts: PostView[];
  isOwner: boolean;
  signedIn: boolean;
  /** Drives the owner's first useful action while the page is empty. */
  hasBio: boolean;
}) {
  if (posts.length === 0) {
    return (
      <section className="mt-6">
        <h2 className="nf-overline mb-3">Posts</h2>
        <div className="nf-card nf-social-card p-6 text-center sm:p-8">
          <div className="mx-auto w-fit">
            <BrandIcon name="chat" size={56} />
          </div>
          <h3 className="nf-h3 mt-3.5 text-[1.05rem]">
            {isOwner ? "Nothing here yet" : `@${handle} has not posted yet`}
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
            {isOwner
              ? "Everything you write around a place sits here, newest first, so anybody who follows you can find it later."
              : "When they write something around a place, it shows up here."}
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

  return (
    <section className="mt-6">
      <h2 className="nf-overline mb-3">Posts</h2>
      <Feed
        initial={posts}
        signedIn={signedIn}
        isMember={false}
        emptyMessage={
          isOwner
            ? "Everything you write around a place sits here."
            : `When @${handle} writes something, it shows up here.`
        }
      />
    </section>
  );
}
