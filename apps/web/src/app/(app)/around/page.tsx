import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/app/PageHeader";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { resolveSession } from "@/lib/actions/session";
import {
  listMyAreas,
  listMyProposals,
  listOpenAreas,
  listOpenLgaPlaces,
  type AreaSummary,
} from "@/lib/social/areas-queries";
import { AREA_COPY, AREA_KIND_LABEL, type AreaStatus } from "@/lib/social/areas-schema";
import { getPlaceTree } from "@/lib/social/place-tree";
import { PLACE_COPY } from "@/lib/social/places-schema";
import { PlacePicker } from "@/components/social/PlacePicker";
import { AroundFab } from "@/components/social/AroundFab";
import { JoinButton } from "./JoinButton";
import { SocialPaused } from "@/components/social/SocialPaused";
import { isSocialEnabled } from "@/lib/social/flag";

export const metadata: Metadata = { title: "Around" };

/**
 * Around: the way into the social layer, then the directory of places.
 *
 * The country comes first. Every one of Nigeria's 36 states and the FCT is a
 * container, every one of the 774 local governments is a container behind it,
 * and tapping one puts you inside it whether or not anybody has been there
 * before. That is the front door, so it is the first thing on the page rather
 * than something under a list of the six places that happen to exist today.
 *
 * Underneath it, the directory: places you are in first, then everything open,
 * busiest first, because a directory sorted by newest sends the first visitor
 * to the emptiest room.
 *
 * Signed out this renders in full rather than behind a wall: the gate belongs
 * in front of value, not in front of the front door. Opening a place nobody has
 * been in is a write and asks for an account at the moment it matters; walking
 * into one that is already open never does.
 */
export default async function AroundPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string | string[] }>;
}) {
  if (!(await isSocialEnabled())) return <SocialPaused />;

  const [params, session, open, mine, proposals, tree, openLgas] = await Promise.all([
    searchParams,
    resolveSession(),
    listOpenAreas(),
    listMyAreas(),
    listMyProposals(),
    getPlaceTree(),
    listOpenLgaPlaces(),
  ]);

  const rawState = Array.isArray(params.state) ? params.state[0] : params.state;
  const initialStateCode =
    typeof rawState === "string" && /^[A-Za-z]{2}$/.test(rawState)
      ? rawState.toUpperCase()
      : null;

  const signedIn = session.state === "signed-in";
  const unconfigured = session.state === "unconfigured";
  const mineIds = new Set(mine.map((area) => area.id));
  const others = open.filter((area) => !mineIds.has(area.id));
  const openProposals = proposals.filter((p) => p.status === "PROPOSED");
  const answered = proposals.filter((p) => p.status === "REJECTED");

  return (
    <div className="mx-auto w-full max-w-3xl pb-24 pt-4">
      <PageHeader
        title="Around"
        fallback="/home"
        actions={
          <Link
            href="/around/new"
            className="nf-btn nf-btn--ghost inline-flex h-10 items-center gap-2 px-4 text-sm"
          >
            <UiIcon name="sparkle" size={16} />
            Suggest a place
          </Link>
        }
      />

      <p className="mb-4 text-sm leading-relaxed text-[var(--nf-content-muted)]">
        {AREA_COPY.what}
      </p>

      {/* Places are one half of Around and people are the other, and until this
          line existed the second half had no front door at all: a handle was
          reachable only if you already knew it. */}
      <Link
        href="/u"
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[var(--nf-brand-secondary)]"
      >
        <UiIcon name="user" size={15} />
        Find people
      </Link>

      {/* One sentence, not two. Without keys the country cannot be read at all,
          so the picker would say the same thing in different words directly
          underneath this card, and a screen that apologises twice for one fact
          reads as a screen nobody looked at. */}
      {unconfigured ? (
        <p className="nf-card mb-6 p-4 text-sm leading-relaxed text-[var(--nf-content-secondary)]">
          {PLACE_COPY.unconfigured}
        </p>
      ) : (
        <PlacePicker
          tree={tree}
          open={openLgas}
          signedIn={signedIn}
          initialStateCode={initialStateCode}
        />
      )}

      {openProposals.length > 0 ? (
        <section className="mb-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--nf-content-muted)]">
            Waiting on us
          </h2>
          <ul className="flex flex-col gap-2">
            {openProposals.map((proposal) => (
              <li
                key={proposal.id}
                className="nf-card flex items-center gap-3 p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[var(--nf-content-primary)]">
                    {proposal.name}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--nf-content-muted)]">
                    {proposal.city} &middot; you suggested this
                  </p>
                </div>
                <span className="shrink-0 rounded-[var(--nf-radius-pill)] border border-[var(--nf-border-default)] px-3 py-1 text-xs font-semibold text-[var(--nf-content-muted)]">
                  With us
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs leading-relaxed text-[var(--nf-content-muted)]">
            {AREA_COPY.proposePending}
          </p>
        </section>
      ) : null}

      {answered.length > 0 ? (
        <section className="mb-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--nf-content-muted)]">
            We came back to you
          </h2>
          <ul className="flex flex-col gap-2">
            {answered.map((proposal) => (
              <li key={proposal.id} className="nf-card p-4">
                <p className="text-sm font-semibold text-[var(--nf-content-primary)]">
                  {proposal.name}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--nf-content-muted)]">
                  {proposal.decisionNote ??
                    "We could not open this one. You can suggest another at any time."}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mb-9">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--nf-content-muted)]">
          Your places
        </h2>
        {mine.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {mine.map((area) => (
              <AreaRow key={area.id} area={area} joined signedIn={signedIn} />
            ))}
          </ul>
        ) : (
          <p className="nf-card p-4 text-sm leading-relaxed text-[var(--nf-content-muted)]">
            {signedIn ? AREA_COPY.joinedNone : "Sign in to keep your places here."}
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--nf-content-muted)]">
          Open places
        </h2>
        {others.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {others.map((area) => (
              <AreaRow key={area.id} area={area} joined={false} signedIn={signedIn} />
            ))}
          </ul>
        ) : (
          <div className="nf-card p-5 text-center">
            <p className="text-sm leading-relaxed text-[var(--nf-content-muted)]">
              {open.length > 0
                ? "You are in every place that is open so far."
                : AREA_COPY.noneOpenYet}
            </p>
            <Link href="/around/new" className="nf-btn nf-btn--primary mt-4 inline-flex h-10 items-center px-5 text-sm">
              Suggest a place
            </Link>
          </div>
        )}
      </section>

      {/* No place is known from here, so Drop gist opens with the picker. */}
      <AroundFab />
    </div>
  );
}

function AreaRow({
  area,
  joined,
  signedIn,
}: {
  area: AreaSummary;
  joined: boolean;
  signedIn: boolean;
}) {
  return (
    <li className="nf-card flex items-start gap-3 p-4">
      {/*
        Nothing in this row truncates, and that is deliberate rather than
        untidy. A place name is a proper noun, and "Magodo Phase 2 Es..." is not
        a place anybody can recognise. The line under it carries a count and the
        word that gives the count its meaning, which is the one thing the house
        rules say never to cut. The blurb is capped at 200 characters by the
        schema, so showing it whole is three lines at 390px, and three honest
        lines beat one line ending in a full stop somebody else did not write.
        The row wraps instead.
      */}
      <Link href={`/around/${area.slug}`} className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-base font-semibold text-[var(--nf-content-primary)]">
            {area.name}
          </p>
          {area.status === "PAUSED" ? (
            <span className="shrink-0 rounded-[var(--nf-radius-pill)] border border-[var(--nf-border-default)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--nf-content-muted)]">
              Paused
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 text-xs leading-relaxed text-[var(--nf-content-muted)]">
          {AREA_KIND_LABEL[area.kind]} &middot; {area.city} &middot;{" "}
          <span className="nf-numeric">{area.memberCount.toLocaleString("en-NG")}</span>{" "}
          {area.memberCount === 1 ? "member" : "members"}
        </p>
        {area.blurb ? (
          <p className="mt-1 text-xs leading-relaxed text-[var(--nf-content-secondary)]">
            {area.blurb}
          </p>
        ) : null}
      </Link>
      {area.status === "ACTIVE" ? (
        <JoinButton areaId={area.id} joined={joined} signedIn={signedIn} size="sm" />
      ) : null}
    </li>
  );
}

export const dynamic: "force-dynamic" = "force-dynamic";

// Kept so a future reader does not have to work out why the list is not cached:
// membership is per viewer and the whole page changes shape when you join, so
// caching it would show one person another person's shelf.
export type { AreaStatus };
