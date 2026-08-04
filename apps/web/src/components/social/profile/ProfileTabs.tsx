"use client";

import { useCallback, useRef, useState } from "react";
import { Feed } from "@/components/social/feed/Feed";
import type { PostView } from "@/components/social/feed/PostCard";
import type { ActivityEntry } from "@/lib/social/posts-queries";
import type { MediaTile, PropertyCard, ReviewCard } from "@/lib/social/profile-tabs-queries";
import type { StoryCard } from "@/lib/social/stories-queries";
import { MediaGrid } from "./MediaGrid";
import { PropertyList } from "./PropertyList";
import { ReviewList } from "./ReviewList";
import { ActivityList } from "./ActivityList";
import { StoryGrid } from "../story/StoryGrid";
import { EmptyPanel } from "./EmptyPanel";
import { TAB_LABEL as LABEL, type TabKey } from "@/lib/social/profile-tabs-schema";

/**
 * The tabs, and what is under them.
 *
 * **Two sets, because two kinds of person are asked different questions about
 * themselves.** Somebody renting gets Posts, Replies, Media and Activity.
 * An agent gets Properties, Stories, Reviews and Activity, because what a
 * stranger wants from an agent's page is the flats, the writing, and what
 * other guests said, in that order.
 *
 * A normal person never sees a Properties tab. That is not a filter, it is the
 * whole point: an empty Properties tab on somebody who does not sell property
 * is a worse lie than an absent one, and it is the exact reason this bar was
 * deleted once before when Replies could not fill.
 *
 * Three decisions worth stating, because each had an obvious wrong answer.
 *
 * **Everything arrives with the page.** The four reads run in parallel on the
 * server, so the whole set costs one round trip and moving between tabs is
 * instant on a connection where a round trip is 400ms. Fetching a tab when it
 * is opened spends that 400ms every single time somebody looks.
 *
 * **The tab lives in the address bar and switching does not navigate.**
 * `history.replaceState` writes `?tab=` without asking Next for a new render,
 * so a reload lands back where the person was and a share is a link to the
 * thing they were looking at, while the switch itself costs nothing. A real
 * navigation would re-run the route and flash the profile skeleton.
 *
 * **Arrow keys move between tabs**, because a tab list that only answers to a
 * pointer is a tab list half the people using it cannot reach.
 */

export type ProfileTabData = {
  posts: PostView[];
  replies: PostView[];
  media: MediaTile[];
  activity: ActivityEntry[];
  properties: PropertyCard[];
  stories: StoryCard[];
  reviews: ReviewCard[];
};

export function ProfileTabs({
  handle,
  isOwner,
  signedIn,
  hasBio,
  tabs,
  data,
  storyCount,
  initialTab,
}: {
  handle: string;
  isOwner: boolean;
  signedIn: boolean;
  hasBio: boolean;
  tabs: TabKey[];
  data: ProfileTabData;
  /** Printed beside Stories. Only an agent's bar carries it. */
  storyCount: number;
  initialTab?: TabKey;
}) {
  const first = tabs[0] ?? "posts";
  const [tab, setTab] = useState<TabKey>(
    initialTab && tabs.includes(initialTab) ? initialTab : first,
  );
  const listRef = useRef<HTMLDivElement>(null);

  const select = useCallback(
    (next: TabKey) => {
      setTab(next);
      /* Next.js supports writing the browser's own history entry directly for
         exactly this case: state the page already holds, reflected in the URL,
         with no server round trip. Wrapped because a sandboxed frame can refuse
         it, and a tab bar must not throw when it does. */
      try {
        const url = new URL(window.location.href);
        if (next === first) url.searchParams.delete("tab");
        else url.searchParams.set("tab", next);
        window.history.replaceState(null, "", url.toString());
      } catch {
        /* The tab still changed. The address bar simply did not follow. */
      }
    },
    [first],
  );

  const onKeyDown = (event: React.KeyboardEvent) => {
    const index = tabs.indexOf(tab);
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;

    event.preventDefault();
    const target = tabs[next];
    if (!target) return;
    select(target);
    listRef.current?.querySelector<HTMLButtonElement>(`#nf-tab-${target}`)?.focus();
  };

  return (
    <>
      <div
        ref={listRef}
        role="tablist"
        aria-label={`What @${handle} has on their page`}
        onKeyDown={onKeyDown}
        className="nf-social-tabs"
      >
        {tabs.map((key) => {
          const selected = key === tab;
          return (
            <button
              key={key}
              id={`nf-tab-${key}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`nf-panel-${key}`}
              tabIndex={selected ? 0 : -1}
              className="nf-social-tab"
              onClick={() => select(key)}
            >
              {LABEL[key]}
              {key === "stories" && storyCount > 0 ? (
                <span className="nf-social-tab__count nf-numeric">{storyCount}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div
        id={`nf-panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`nf-tab-${tab}`}
        tabIndex={-1}
        className="mt-5"
      >
        <Panel
          tab={tab}
          handle={handle}
          isOwner={isOwner}
          signedIn={signedIn}
          hasBio={hasBio}
          data={data}
        />
      </div>
    </>
  );
}

function Panel({
  tab,
  handle,
  isOwner,
  signedIn,
  hasBio,
  data,
}: {
  tab: TabKey;
  handle: string;
  isOwner: boolean;
  signedIn: boolean;
  hasBio: boolean;
  data: ProfileTabData;
}) {
  if (tab === "posts" || tab === "replies") {
    const posts = tab === "posts" ? data.posts : data.replies;
    if (posts.length === 0) {
      return (
        <EmptyPanel
          icon={tab === "posts" ? "chat" : "chat-duo"}
          title={
            isOwner
              ? tab === "posts"
                ? "Nothing here yet"
                : "You have not replied to anything yet"
              : tab === "posts"
                ? `@${handle} has not posted yet`
                : `@${handle} has not replied to anything yet`
          }
          body={
            isOwner
              ? tab === "posts"
                ? "Everything you write around a place sits here, newest first, so anybody who follows you can find it later."
                : "Answering somebody is the fastest way into a place. Every reply you write shows up here with the person it answers."
              : tab === "posts"
                ? "When they write something around a place, it shows up here."
                : "Replies they write in a conversation show up here, alongside the person each one answers."
          }
          action={
            isOwner
              ? hasBio
                ? { href: "/around", label: "Find a place to talk in" }
                : { href: `/u/${handle}/edit`, label: "Add your bio" }
              : undefined
          }
        />
      );
    }
    return (
      <Feed
        key={tab}
        initial={posts}
        signedIn={signedIn}
        isMember={false}
        emptyMessage={
          isOwner
            ? "Everything you write around a place sits here."
            : `When @${handle} writes something, it shows up here.`
        }
      />
    );
  }

  if (tab === "media") {
    return <MediaGrid tiles={data.media} handle={handle} isOwner={isOwner} />;
  }

  if (tab === "activity") {
    return <ActivityList entries={data.activity} handle={handle} isOwner={isOwner} signedIn={signedIn} />;
  }

  if (tab === "properties") {
    if (data.properties.length === 0) {
      return (
        <EmptyPanel
          icon="homes-sparkle"
          title={isOwner ? "No live listings yet" : `@${handle} has nothing live right now`}
          body={
            isOwner
              ? "Every listing of yours that is live shows up here, so somebody reading your page can go straight to it."
              : "When they publish a place, it shows up here."
          }
          action={isOwner ? { href: "/agent/listings", label: "Go to your listings" } : undefined}
        />
      );
    }
    return <PropertyList properties={data.properties} />;
  }

  if (tab === "stories") {
    return <StoryGrid stories={data.stories} handle={handle} isOwner={isOwner} />;
  }

  if (data.reviews.length === 0) {
    return (
      <EmptyPanel
        icon="reviews"
        title={isOwner ? "No reviews yet" : `Nobody has reviewed @${handle} yet`}
        body={
          isOwner
            ? "A guest can write a review after they have stayed. They show up here as they arrive."
            : "Reviews from guests who have stayed show up here."
        }
      />
    );
  }
  return <ReviewList reviews={data.reviews} />;
}
