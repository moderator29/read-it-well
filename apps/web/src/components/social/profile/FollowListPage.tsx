import Link from "next/link";
import { PageHeader } from "@/components/app/PageHeader";
import { ProfileNotice } from "./ProfileNotice";
import { PeopleList } from "./PeopleList";
import { AroundFab } from "@/components/social/AroundFab";
import { getFollowList, type FollowDirection } from "@/lib/social/follows-queries";
import { normaliseHandle } from "@/lib/social/profiles-queries";

/**
 * The shell both follow lists wear.
 *
 * One component rather than two nearly identical pages, because the only things
 * that differ are a word in the title and which side of the follow is read, and
 * the `/followers` and `/following` routes are thin enough to stay honest about
 * that.
 *
 * Every state is a designed page. A handle nobody holds, a handle a block hides
 * in either direction, and the platform having no keys at all each land
 * somewhere with a way onward, because arriving at a list of people and finding
 * a raw 404 is how somebody concludes the person they were looking for has been
 * deleted.
 */
export async function FollowListPage({
  handle: raw,
  direction,
}: {
  handle: string;
  direction: FollowDirection;
}) {
  const handle = normaliseHandle(raw);
  const view = await getFollowList(raw, direction);
  const heading = direction === "followers" ? "Followers" : "Following";

  if (view.state === "unconfigured") {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title={heading} fallback={`/u/${handle}`} />
        <ProfileNotice
          icon="user-check"
          title="Profiles switch on shortly"
          body="The platform keys are not in place yet, so nobody's followers can be read from here. Everything else in the app works as normal."
          primary={{ href: "/home", label: "Back to home" }}
        />
      </div>
    );
  }

  if (view.state === "missing") {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title={heading} fallback="/around" />
        {/*
          The same one screen covers "nobody holds this handle" and "a block in
          one direction or the other hides whoever does", because
          `social_profiles_select` carries `not private.blocked_with(user_id)`
          and nothing in an exposed schema can tell those two apart. The copy is
          written so it does not have to.
        */}
        <ProfileNotice
          icon="home-search"
          title={`Nothing to show for @${handle}`}
          body="Either nobody holds this handle, or its owner is not reachable from your account. Either way there is no list of people here."
          primary={{ href: "/around", label: "Go to Around" }}
          secondary={{ href: "/home", label: "Back to home" }}
        />
      </div>
    );
  }

  const name = view.displayLabel || `@${view.handle}`;
  const subtitle =
    direction === "followers"
      ? view.isOwner
        ? "People who follow you"
        : `People who follow ${name}`
      : view.isOwner
        ? "People you follow"
        : `People ${name} follows`;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={heading} subtitle={subtitle} fallback={`/u/${view.handle}`} />

      {/* The other side of the same person, one tap away, so somebody who
          opened the wrong one of the two does not have to go back to find it. */}
      <nav
        aria-label="This person"
        className="flex flex-wrap items-center gap-2 text-[0.8125rem]"
      >
        <Link href={`/u/${view.handle}`} className="nf-chip">
          @{view.handle}
        </Link>
        <Link
          href={`/u/${view.handle}/${direction === "followers" ? "following" : "followers"}`}
          className="nf-chip"
        >
          {direction === "followers" ? "Following" : "Followers"}
        </Link>
      </nav>

      <PeopleList
        handle={view.handle}
        direction={direction}
        isOwner={view.isOwner}
        signedIn={view.signedIn}
        total={view.total}
        initial={view.people}
        initialCursor={view.cursor}
      />
      {/* The dock is on every social surface, so it does not blink in and out
          as somebody moves between a profile and the people on it. */}
      <AroundFab />
    </div>
  );
}
