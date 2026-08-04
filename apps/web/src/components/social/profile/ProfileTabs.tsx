"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";

/**
 * Posts, Replies and Media.
 *
 * Three tabs and, for now, three designed empty states. `posts` is the next
 * table to land, and an empty tab is a state a real person will meet for a long
 * time after it does: the day somebody claims a handle, every one of these is
 * empty and stays empty until they say something. So each one says what belongs
 * there, in plain words, and offers the strongest action that genuinely exists
 * today rather than a control that would do nothing.
 *
 * The active mark under a tab is a short stroke rather than a full width
 * underline, the same stroke the reaction marks are drawn from, so the page
 * reads as one geometry.
 */

type TabKey = "posts" | "replies" | "media";

const TABS: { key: TabKey; label: string }[] = [
  { key: "posts", label: "Posts" },
  { key: "replies", label: "Replies" },
  { key: "media", label: "Media" },
];

export function ProfileTabs({
  handle,
  isOwner,
  hasBio,
}: {
  handle: string;
  isOwner: boolean;
  /** Drives the owner's first useful action while the tabs are empty. */
  hasBio: boolean;
}) {
  const [active, setActive] = useState<TabKey>("posts");
  const base = useId();

  return (
    <section className="mt-6">
      <div
        role="tablist"
        aria-label={`@${handle}`}
        className="flex border-b border-[var(--nf-border-subtle)]"
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            id={`${base}-${tab.key}`}
            type="button"
            role="tab"
            aria-selected={active === tab.key}
            aria-controls={`${base}-${tab.key}-panel`}
            onClick={() => setActive(tab.key)}
            className="nf-social-tab"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {TABS.map((tab) => (
        <div
          key={tab.key}
          id={`${base}-${tab.key}-panel`}
          role="tabpanel"
          aria-labelledby={`${base}-${tab.key}`}
          hidden={active !== tab.key}
          className="pt-3"
        >
          <EmptyTab tab={tab.key} handle={handle} isOwner={isOwner} hasBio={hasBio} />
        </div>
      ))}
    </section>
  );
}

/* --------------------------------------------------------------- the copy */

const EMPTY: Record<TabKey, { icon: BrandIconName; owner: string; visitor: string; body: string }> =
  {
    posts: {
      icon: "chat",
      owner: "Nothing here yet",
      visitor: "Nothing here yet",
      body: "Everything you write sits here, newest first. Replies and photos get their own tabs, so a page never becomes a pile.",
    },
    replies: {
      icon: "chat-duo",
      owner: "No replies yet",
      visitor: "No replies yet",
      body: "Answering somebody is worth as much as starting a conversation, so replies keep their own place here rather than disappearing into a thread.",
    },
    media: {
      icon: "camera",
      owner: "No photos yet",
      visitor: "No photos yet",
      body: "Photos from anything written here collect in one grid, which is the fastest way to see a place through somebody's eyes.",
    },
  };

function EmptyTab({
  tab,
  handle,
  isOwner,
  hasBio,
}: {
  tab: TabKey;
  handle: string;
  isOwner: boolean;
  hasBio: boolean;
}) {
  const copy = EMPTY[tab];
  const title = isOwner ? copy.owner : `@${handle} has not posted yet`;

  return (
    <div className="nf-card nf-social-card p-6 text-center sm:p-8">
      <div className="mx-auto w-fit">
        <BrandIcon name={copy.icon} size={56} />
      </div>
      <h3 className="nf-h3 mt-3.5 text-[1.05rem]">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
        {isOwner ? copy.body : `When they write something, it shows up here.`}
      </p>

      {isOwner && (
        <div className="mt-5">
          {hasBio ? (
            <Link href="/search" className="nf-btn nf-btn--glass">
              Find a place worth talking about
            </Link>
          ) : (
            <Link href={`/u/${handle}/edit`} className="nf-btn nf-btn--primary">
              Add your bio
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
