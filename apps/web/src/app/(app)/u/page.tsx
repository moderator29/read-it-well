import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/app/PageHeader";
import { SocialPaused } from "@/components/social/SocialPaused";
import { ProfileNotice } from "@/components/social/profile/ProfileNotice";
import { FollowButton } from "@/components/social/profile/FollowButton";
import { AroundFab } from "@/components/social/AroundFab";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { isSocialEnabled } from "@/lib/social/flag";
import { findPeople } from "@/lib/social/people-queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "People" };

/**
 * `/u`: a way to find a person.
 *
 * **This route did not exist, and `/u/[handle]` answered for every handle under
 * it.** Somebody was reachable only if you already knew their name, which made
 * following a thing you could only do to people you had already met. A follow
 * graph with no discovery surface is the same criticism `SOCIAL_DESIGN.md`
 * levelled at the follow graph it originally cut, and it was recorded as a dead
 * end in `docs/SOCIAL_AUDIT.md` for two rounds before this.
 *
 * A plain form with a GET, not a client search box. The query lives in the
 * address, so a search is a page somebody can send to somebody else, go back to,
 * or reload, and it costs no JavaScript to type in. On a Nigerian mobile
 * connection that is the difference between a search that works and one that
 * waits for a bundle.
 *
 * Every row carries a real Follow, because a list you cannot act from is a list
 * you look at once. The viewer's own row carries none: a button that would
 * refuse itself is worse than no button.
 */
export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  if (!(await isSocialEnabled())) return <SocialPaused title="People" />;

  const params = await searchParams;
  const raw = Array.isArray(params.q) ? params.q[0] : params.q;
  const view = await findPeople(raw ?? "");

  if (view.state === "unconfigured") {
    return (
      <div className="mx-auto w-full max-w-2xl pb-24 pt-4">
        <PageHeader title="People" fallback="/around" />
        <ProfileNotice
          icon="user-check"
          title="People switch on shortly"
          body="The platform keys are not in place yet, so nobody's page can be read from here. Everything else in the app works as normal."
          primary={{ href: "/around", label: "Go to Around" }}
        />
      </div>
    );
  }

  const searching = view.query.length > 0;

  return (
    <div className="mx-auto w-full max-w-2xl pb-24 pt-4">
      <PageHeader title="People" fallback="/around" />

      <form action="/u" method="get" className="nf-people__search">
        <label htmlFor="q" className="sr-only">
          Search for somebody by name or handle
        </label>
        <UiIcon name="search" size={17} />
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={view.query}
          placeholder="A name, a handle, a job, a place"
          autoComplete="off"
          className="nf-people__field"
        />
        <button type="submit" className="nf-btn nf-btn--primary nf-people__go">
          Search
        </button>
      </form>

      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--nf-content-muted)]">
        {searching ? `People matching ${view.query}` : "People who just arrived"}
      </p>

      {/* Why these people, said plainly. A search for "Ikeja" that quietly also
          matched an occupation looks like a broken search unless it says so. */}
      {searching && view.people.length > 0 ? (
        <p className="mt-1 text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
          Searched by {matchLabel(view.matchedOn)}.
        </p>
      ) : null}

      {view.people.length === 0 ? (
        <div className="mt-4">
          <ProfileNotice
            icon="home-search"
            title={searching ? `Nobody here is called ${view.query}` : "Nobody has a page yet"}
            body={
              searching
                ? "Nobody matched that name, handle, occupation or place. Try a shorter piece of it, or the handle itself."
                : "The first person to claim a handle appears here. Claim yours and yours is the first name anybody arriving reads."
            }
            primary={{ href: "/around", label: "Go to Around" }}
            secondary={searching ? { href: "/u", label: "See everybody" } : undefined}
          />
        </div>
      ) : (
        <ul className="mt-3 flex flex-col gap-[var(--nf-social-gap)]">
          {view.people.map((person) => (
            <li key={person.userId} className="nf-card nf-social-card nf-people__row">
              <Link href={`/u/${person.handle}`} className="nf-people__who">
                <span className="nf-people__avatar">
                  {person.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={person.avatarUrl} alt="" />
                  ) : (
                    <span aria-hidden="true">
                      {person.displayLabel.charAt(0).toUpperCase()}
                    </span>
                  )}
                </span>
                <span className="min-w-0">
                  <span className="nf-people__name">
                    <span className="truncate-none">{person.displayLabel}</span>
                    {person.isAgent ? (
                      <span
                        className="nf-social-verified"
                        title="A verified RentMe agent"
                        aria-label="Verified agent"
                      >
                        <UiIcon name="verified" size={15} />
                      </span>
                    ) : null}
                  </span>
                  <span className="nf-people__handle">@{person.handle}</span>
                  {/* Bios are capped at 240 characters by the database, so there
                      is nothing here to truncate, and truncating the one
                      sentence somebody wrote about themselves to tidy a row is
                      the wrong trade. */}
                  {/* What they do and where, from columns a trigger projects
                      rather than columns a person types. Absent entirely when
                      unknown: a profile should never look like a form somebody
                      abandoned. */}
                  {person.occupation || person.place ? (
                    <span className="nf-people__facts">
                      {person.occupation ? (
                        <span>
                          <UiIcon name="user" size={12} />
                          {person.occupation}
                        </span>
                      ) : null}
                      {person.place ? (
                        <span>
                          <UiIcon name="location" size={12} />
                          {person.place}
                        </span>
                      ) : null}
                    </span>
                  ) : null}
                  {person.bio ? <span className="nf-people__bio">{person.bio}</span> : null}
                </span>
              </Link>

              {person.isViewer ? (
                <span className="nf-people__you">You</span>
              ) : (
                <FollowButton
                  handle={person.handle}
                  initialFollowing={person.viewerFollows}
                  signedIn={view.signedIn}
                  compact
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {!view.signedIn && view.people.length > 0 ? (
        <p className="mt-5 text-center text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
          <Link href="/sign-in" className="font-semibold text-[var(--nf-brand-secondary)]">
            Sign in
          </Link>{" "}
          to follow anybody here.
        </p>
      ) : null}

      <div className="mt-8 flex items-center gap-3 rounded-[var(--nf-radius-lg)] border border-[var(--nf-border-subtle)] p-4">
        <BrandIcon name="user-verified" size={34} />
        <p className="text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
          Somebody with no page yet has no handle to find. Claiming one takes a
          moment and it becomes their address on RentMe.
        </p>
      </div>

      <AroundFab />
    </div>
  );
}

/**
 * "name and handle", "name and handle, and what people do", and so on.
 *
 * Written out rather than printed as a list of three words, because the line
 * under a search result is a sentence somebody reads once and it should read
 * like one. Never truncated and never abbreviated: the label is the meaning of
 * the results below it.
 */
function matchLabel(matched: ("name" | "occupation" | "place")[]): string {
  const parts = matched.map((key) =>
    key === "name" ? "name and handle" : key === "occupation" ? "what people do" : "where they are",
  );
  if (parts.length === 0) return "name and handle";
  if (parts.length === 1) return parts[0] as string;
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}
