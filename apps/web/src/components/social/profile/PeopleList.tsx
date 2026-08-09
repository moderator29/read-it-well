"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { FollowButton } from "./FollowButton";
import { moreFollows } from "@/lib/social/follows-actions";
import type { FollowDirection, FollowRow } from "@/lib/social/follows-queries";

/**
 * A list of people.
 *
 * One component for followers and for following, because the two differ in
 * exactly two things a person can see: the words when it is empty, and which
 * side of the follow each row is. Two components would be two places to get a
 * row wrong.
 *
 * Every row carries a Follow control, because a list you cannot act from is a
 * list you look at once. The viewer's own row does not, and neither does the
 * page owner's when they are reading their own followers: a button that would
 * refuse itself is worse than no button.
 *
 * Bios are shown whole. They are capped at 240 characters by the database, so
 * there is nothing here to truncate, and truncating the one sentence somebody
 * wrote about themselves to make a row tidier is the wrong trade.
 */

const EMPTY: Record<
  FollowDirection,
  { mineTitle: string; mineBody: string; theirsTitle: string; theirsBody: string }
> = {
  followers: {
    mineTitle: "Nobody follows you yet",
    mineBody:
      "Followers arrive from what you write. Say something useful in a place you know and the people who live there will find you.",
    theirsTitle: "Nobody follows @{handle} yet",
    theirsBody: "When somebody follows them, they show up here.",
  },
  following: {
    mineTitle: "You are not following anybody yet",
    mineBody:
      "Open a place, read what people there are saying, and follow the ones worth hearing from again.",
    theirsTitle: "@{handle} is not following anybody yet",
    theirsBody: "When they follow somebody, that person shows up here.",
  },
};

export function PeopleList({
  handle,
  direction,
  isOwner,
  signedIn,
  total,
  initial,
  initialCursor,
}: {
  handle: string;
  direction: FollowDirection;
  isOwner: boolean;
  signedIn: boolean;
  /** The count the profile itself reports. Not always the length of the list. */
  total: number;
  initial: FollowRow[];
  initialCursor: string | null;
}) {
  const [people, setPeople] = useState(initial);
  const [cursor, setCursor] = useState(initialCursor);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const loadMore = () => {
    if (!cursor) return;
    setError(null);
    startTransition(async () => {
      const result = await moreFollows({ handle, direction, before: cursor });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      /* Appended rather than replaced, and de-duplicated on the way in, so a
         follow arriving between two pages cannot put the same person on the
         screen twice. */
      setPeople((current) => {
        const seen = new Set(current.map((person) => person.userId));
        return [...current, ...result.data.people.filter((p) => !seen.has(p.userId))];
      });
      setCursor(result.data.cursor);
    });
  };

  /*
   * An empty list is not always an empty count, and saying so would be a lie.
   *
   * Proven on the live database: two people follow an account, one of them has
   * blocked it, `follows_select` returns both edges and `social_profiles_select`
   * returns one row, because it carries `not private.blocked_with(user_id)`. So
   * the count says two and the list can show one, or none. The copy below never
   * asserts that nobody is there when the count says somebody is, and it never
   * explains which person is missing either, because naming them is exactly the
   * disclosure the block exists to prevent.
   */
  if (people.length === 0 && total > 0) {
    return (
      <div className="nf-card nf-social-card mt-5 p-6 text-center sm:p-8">
        <div className="mx-auto w-fit">
          <BrandIcon name="user-check" size={44} />
        </div>
        <h2 className="nf-h3 mt-3.5 text-[1.05rem]">Nobody here you can see</h2>
        <p className="mx-auto mt-2 max-w-sm text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
          The count is real, and none of these accounts is reachable from your
          own. That happens when a block sits between you.
        </p>
        <div className="mt-5">
          <Link href={`/u/${handle}`} className="nf-btn nf-btn--primary">
            Back to @{handle}
          </Link>
        </div>
      </div>
    );
  }

  if (people.length === 0) {
    const copy = EMPTY[direction];
    return (
      <div className="nf-card nf-social-card mt-5 p-6 text-center sm:p-8">
        <div className="mx-auto w-fit">
          <BrandIcon name="user-check" size={44} />
        </div>
        <h2 className="nf-h3 mt-3.5 text-[1.05rem]">
          {isOwner ? copy.mineTitle : copy.theirsTitle.replace("{handle}", handle)}
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
          {isOwner ? copy.mineBody : copy.theirsBody.replace("{handle}", handle)}
        </p>
        <div className="mt-5">
          <Link
            href={isOwner ? "/around" : `/u/${handle}`}
            className="nf-btn nf-btn--primary"
          >
            {isOwner ? "Find a place to talk in" : `Back to @${handle}`}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <ul className="mt-5 flex flex-col gap-[var(--nf-social-gap)]">
        {people.map((person) => {
          const name = person.displayLabel || `@${person.handle}`;
          const monogram = (person.displayLabel || person.handle)
            .charAt(0)
            .toUpperCase();
          return (
            <li key={person.userId} className="nf-card nf-social-card nf-social-person">
              <Link
                href={`/u/${person.handle}`}
                className="nf-social-person__face"
                aria-label={`Open ${name}`}
              >
                {person.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={person.avatarUrl} alt="" />
                ) : (
                  <span aria-hidden="true">{monogram}</span>
                )}
              </Link>

              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Link
                    href={`/u/${person.handle}`}
                    className="text-[0.9375rem] font-bold tracking-[-0.015em] text-[var(--nf-content-primary)]"
                  >
                    {name}
                  </Link>
                  {person.isAgent ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-[var(--nf-radius-pill)] border border-[var(--nf-border-brand)] px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.08em] text-[var(--nf-brand-secondary)]">
                      <UiIcon name="verified" size={11} />
                      Agent
                    </span>
                  ) : null}
                </p>
                <p className="text-[0.8125rem] text-[var(--nf-content-muted)]">
                  @{person.handle}
                </p>
                {person.bio ? (
                  <p className="mt-1.5 whitespace-pre-line text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]">
                    {person.bio}
                  </p>
                ) : null}
              </div>

              {person.isViewer ? (
                <span className="shrink-0 self-start text-[0.75rem] font-semibold text-[var(--nf-content-muted)]">
                  You
                </span>
              ) : (
                <div className="shrink-0 self-start">
                  <FollowButton
                    handle={person.handle}
                    initialFollowing={person.viewerFollows}
                    signedIn={signedIn}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {error ? (
        <p
          role="alert"
          className="mt-4 text-center text-[0.8125rem] leading-relaxed text-[var(--nf-state-error)]"
        >
          {error}
        </p>
      ) : null}

      {cursor ? (
        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={pending}
            className="nf-btn nf-btn--glass"
          >
            {pending ? "Loading" : "Show more people"}
          </button>
        </div>
      ) : (
        <p aria-live="polite" className="mt-5 text-center text-xs text-[var(--nf-content-muted)]">
          That is everybody.
        </p>
      )}
    </>
  );
}
