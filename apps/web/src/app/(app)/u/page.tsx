import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/app/PageHeader";
import { SocialPaused } from "@/components/social/SocialPaused";
/* ONE empty-state anatomy across the whole product. See EmptyPanel. */
import { EmptyPanel } from "@/components/social/profile/EmptyPanel";
import { FollowButton } from "@/components/social/profile/FollowButton";
import { AroundFab } from "@/components/social/AroundFab";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { isSocialEnabled } from "@/lib/social/flag";
import { findPeople } from "@/lib/social/people-queries";
import { RemoteImage } from "@/components/ui/RemoteImage";

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
      <div className="mx-auto w-full max-w-2xl pb-4xl pt-md">
        <PageHeader title="People" fallback="/around" />
        <EmptyPanel
          icon="user-check"
          title="We cannot reach profiles right now"
          body="This is on our side, not yours. Nobody's page can be read from here at the moment. The rest of the app works as normal."
          action={{ href: "/around", label: "Go to Around" }}
        />
      </div>
    );
  }

  const searching = view.query.length > 0;

  return (
    <div className="mx-auto w-full max-w-2xl pb-4xl pt-md">
      <PageHeader title="People" fallback="/around" />

      {/*
        Still a plain GET form: the query lives in the address, so a search is a
        page somebody can send, reload or go back to, and typing it costs no
        JavaScript.

        What changed is the field. It was a bare `id="q"` - an unqualified,
        GLOBAL id on a page that also renders follow controls and a FAB, where
        anything else claiming `q` would silently steal the label. `TextField`
        derives its id with `useId`, so it is unique by construction, and
        `name="q"` - the only part the GET actually needs - is untouched.

        It also brings the clear affordance the pill never had: an uncontrolled
        field, so clearing writes the DOM directly and the form still posts
        empty, which is the "see everybody" case.
      */}
      <form action="/u" method="get" className="mt-2xs flex items-start gap-xs">
        <TextField
          className="min-w-0 flex-1"
          label="Search for somebody by name or handle"
          hideLabel
          leadingIcon="search"
          clearable="Clear the search"
          name="q"
          type="search"
          defaultValue={view.query}
          placeholder="A name or a handle"
          autoComplete="off"
        />
        <Button type="submit" variant="primary" className="h-12 shrink-0">
          Search
        </Button>
      </form>

      <p className="mt-md text-[length:var(--nf-text-overline)] font-semibold uppercase tracking-[0.14em] text-[var(--nf-content-muted)]">
        {searching ? `People matching ${view.query}` : "People who just arrived"}
      </p>

      {/* People are found by name and handle only (V-64): occupation and
          place are a member's own facts and are searched by nobody. */}
      {searching && view.people.length > 0 ? (
        <p className="mt-2xs text-[length:var(--nf-text-caption)] leading-relaxed text-[var(--nf-content-muted)]">
          Searched by name and handle.
        </p>
      ) : null}

      {view.people.length === 0 ? (
        <div className="mt-md">
          <EmptyPanel
            icon="home-search"
            title={searching ? `Nobody here is called ${view.query}` : "Nobody has a page yet"}
            body={
              searching
                ? "Nobody matched that name or handle. Try a shorter piece of it, or the handle itself."
                : "The first person to claim a handle appears here. Claim yours and yours is the first name anybody arriving reads."
            }
            action={{ href: "/around", label: "Go to Around" }}
            secondary={searching ? { href: "/u", label: "See everybody" } : undefined}
          />
        </div>
      ) : (
        <ul className="mt-sm flex flex-col gap-[var(--nf-social-gap)]">
          {view.people.map((person) => (
            <li key={person.userId} className="nf-panel nf-panel--card nf-people__row flex-row">
              <Link href={`/u/${person.handle}`} className="nf-people__who">
                <span className="nf-people__avatar">
                  {person.avatarUrl ? (
                    <RemoteImage
                      src={person.avatarUrl}
                      alt=""
                      width={96}
                      height={96}
                      sizes="48px"
                    />
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
                        title="A verified Vallo agent"
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
                  {/* What they do and where, ONLY where the member published
                      it in their settings (V-64). Absent entirely otherwise:
                      a profile should never look like a form somebody
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
        <p className="mt-md text-center text-[length:var(--nf-text-caption)] leading-relaxed text-[var(--nf-content-muted)]">
          <Link href="/sign-in" className="font-semibold text-[var(--nf-brand-secondary)]">
            Sign in
          </Link>{" "}
          to follow anybody here.
        </p>
      ) : null}

      <AroundFab />
    </div>
  );
}

