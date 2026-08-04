"use client";

import { useCallback, useRef, useState } from "react";
import type { PostView } from "@/components/social/feed/PostCard";
import { ProfilePosts, type ProfileTabKey } from "./ProfilePosts";

/**
 * Posts, Replies, Media.
 *
 * This bar was deliberately deleted once, because `getProfileFeed` reads roots
 * only and a Replies tab that can never fill is a convincing lie. It is back
 * because `getProfileReplies` and `getProfileMedia` now exist and each answers
 * for itself. Nothing here fakes a list.
 *
 * Three decisions worth stating, because each had an obvious wrong answer.
 *
 * **All three lists arrive with the page.** They are read in parallel on the
 * server, so the whole set costs one round trip rather than three, and moving
 * between tabs is instant on a connection where a round trip is 400ms. The
 * alternative, fetching a tab when it is opened, spends that 400ms every single
 * time somebody looks at their own replies.
 *
 * **The tab lives in the address bar, and switching does not navigate.**
 * `history.replaceState` writes `?tab=replies` without asking Next for a new
 * render, so a reload lands back where the person was and a share is a link to
 * the thing they were looking at, while the switch itself costs nothing. A real
 * navigation here would re-run the route and flash the profile skeleton
 * `loading.tsx` renders, which is a page rebuilding itself to change one word.
 *
 * **Arrow keys move between tabs**, because a tab list that only answers to a
 * pointer is a tab list half the people using it cannot reach.
 */

const TABS: { key: ProfileTabKey; label: string }[] = [
  { key: "posts", label: "Posts" },
  { key: "replies", label: "Replies" },
  { key: "media", label: "Media" },
];

export function ProfileTabs({
  handle,
  posts,
  replies,
  media,
  isOwner,
  signedIn,
  hasBio,
  initialTab = "posts",
}: {
  handle: string;
  posts: PostView[];
  replies: PostView[];
  media: PostView[];
  isOwner: boolean;
  signedIn: boolean;
  hasBio: boolean;
  initialTab?: ProfileTabKey;
}) {
  const [tab, setTab] = useState<ProfileTabKey>(initialTab);
  const listRef = useRef<HTMLDivElement>(null);

  const select = useCallback((next: ProfileTabKey) => {
    setTab(next);
    /* Next.js supports writing the browser's own history entry directly for
       exactly this case: state the page already holds, reflected in the URL,
       with no server round trip. Wrapped because a sandboxed frame can refuse
       it, and a tab bar must not throw when it does. */
    try {
      const url = new URL(window.location.href);
      if (next === "posts") url.searchParams.delete("tab");
      else url.searchParams.set("tab", next);
      window.history.replaceState(null, "", url.toString());
    } catch {
      /* The tab still changed. The address bar simply did not follow. */
    }
  }, []);

  const onKeyDown = (event: React.KeyboardEvent) => {
    const index = TABS.findIndex((t) => t.key === tab);
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % TABS.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + TABS.length) % TABS.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = TABS.length - 1;
    else return;

    event.preventDefault();
    const target = TABS[next];
    if (!target) return;
    select(target.key);
    listRef.current
      ?.querySelector<HTMLButtonElement>(`#nf-profile-tab-${target.key}`)
      ?.focus();
  };

  const shown = tab === "replies" ? replies : tab === "media" ? media : posts;

  return (
    <>
      <div
        ref={listRef}
        role="tablist"
        aria-label={`What @${handle} has written`}
        onKeyDown={onKeyDown}
        className="mt-5 flex border-b border-[var(--nf-border-subtle)]"
      >
        {TABS.map((entry) => {
          const selected = entry.key === tab;
          return (
            <button
              key={entry.key}
              id={`nf-profile-tab-${entry.key}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`nf-profile-panel-${entry.key}`}
              tabIndex={selected ? 0 : -1}
              className="nf-social-tab"
              onClick={() => select(entry.key)}
            >
              {entry.label}
            </button>
          );
        })}
      </div>

      <div id={`nf-profile-panel-${tab}`}>
        <ProfilePosts
          tab={tab}
          handle={handle}
          posts={shown}
          isOwner={isOwner}
          signedIn={signedIn}
          hasBio={hasBio}
          labelledBy={`nf-profile-tab-${tab}`}
        />
      </div>
    </>
  );
}
