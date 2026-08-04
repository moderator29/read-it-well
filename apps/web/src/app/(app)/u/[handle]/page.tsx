import type { Metadata } from "next";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { FollowButton } from "@/components/social/profile/FollowButton";
import { ProfileHeader } from "@/components/social/profile/ProfileHeader";
import { ProfileNotice } from "@/components/social/profile/ProfileNotice";
import { ProfileMenu } from "@/components/social/profile/ProfileMenu";
import { ProfileShare } from "@/components/social/profile/ProfileShare";
import { ProfileTabs } from "@/components/social/profile/ProfileTabs";
/* Plain module, never the client component: a server component importing a
   value from a `"use client"` file gets a client reference, not the value. */
import {
  AGENT_TABS,
  ALL_TABS,
  MEMBER_TABS,
  type TabKey,
} from "@/lib/social/profile-tabs-schema";
import { AroundFab } from "@/components/social/AroundFab";
import { loadPublicProfile, normaliseHandle } from "@/lib/social/profiles-queries";
import {
  getProfileActivity,
  getProfileFeed,
  getProfileReplies,
} from "@/lib/social/posts-queries";
import {
  getAgentProperties,
  getAgentReviews,
  getProfileMediaGrid,
  monthYear,
} from "@/lib/social/profile-tabs-queries";
import { listStories } from "@/lib/social/stories-queries";

/**
 * `/u/[handle]`: a person's page.
 *
 * A handle is an address, so this route answers for every one of them, whether
 * somebody holds it or not. A handle nobody has taken is not a 404: it is an
 * offer, because the fastest way to get somebody their own page is to show them
 * the one that is waiting.
 *
 * **Two kinds of person get two sets of tabs**, and which set is decided here
 * rather than in the component: an agent whose listings can actually be
 * resolved gets Properties, Stories, Reviews and Activity, and everybody else
 * gets Posts, Replies, Media and Activity. Somebody who is marked as an agent
 * but whose `agents` row cannot be reached from a public page falls back to the
 * ordinary set, because a Properties tab that could only ever be empty is a
 * worse lie than an absent one.
 *
 * Everything the page renders is read in parallel. Nine small reads that all
 * start at once cost one round trip; the same nine in sequence cost nine, and
 * on the connections this product is built for that is the whole difference
 * between a page and a wait.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  return { title: `@${normaliseHandle(handle)}` };
}

function tabFrom(raw: string | string[] | undefined, allowed: TabKey[]): TabKey | undefined {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const found = ALL_TABS.find((key) => key === value);
  return found && allowed.includes(found) ? found : undefined;
}

export default async function SocialProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const { handle: raw } = await params;
  const handle = normaliseHandle(raw);
  const locale = await getLocale();
  const [view, query] = await Promise.all([loadPublicProfile(raw), searchParams]);

  if (view.state === "found") {
    const userId = view.profile.userId;

    /* An agent's own tabs need an `agents` row, and `agents` is select-own plus
       admin, so this resolves for the agent themselves and for nobody else
       until it is projected. The fallback is the ordinary tab set, never an
       empty Properties tab. */
    const agentId = view.agentId;
    const isAgentPage = view.profile.isAgent && Boolean(agentId);
    const tabs = isAgentPage ? AGENT_TABS : MEMBER_TABS;

    const [posts, replies, media, activity, properties, reviews, stories] =
      await Promise.all([
        isAgentPage ? Promise.resolve([]) : getProfileFeed(userId),
        isAgentPage ? Promise.resolve([]) : getProfileReplies(userId),
        isAgentPage ? Promise.resolve([]) : getProfileMediaGrid(userId),
        getProfileActivity(userId),
        isAgentPage ? getAgentProperties(agentId) : Promise.resolve([]),
        isAgentPage ? getAgentReviews(agentId) : Promise.resolve([]),
        isAgentPage ? listStories({ authorId: userId, limit: 30 }) : Promise.resolve([]),
      ]);

    return (
      <div className="mx-auto max-w-2xl">
        <ProfileHeader
          profile={view.profile}
          isOwner={view.isOwner}
          homeArea={view.homeArea}
          moderatorOf={view.moderatorOf}
          locale={locale}
          occupation={view.occupation}
          standing={view.standing}
          place={view.place}
          trust={view.trust}
          joinedLabel={monthYear(view.profile.claimedAt)}
          follow={
            view.isOwner ? undefined : (
              <FollowButton
                handle={view.profile.handle}
                initialFollowing={view.viewerFollows}
                signedIn={view.signedIn}
                compact
              />
            )
          }
          share={
            <ProfileShare
              handle={view.profile.handle}
              displayLabel={view.profile.displayLabel}
            />
          }
          menu={
            <ProfileMenu
              handle={view.profile.handle}
              userId={userId}
              displayLabel={view.profile.displayLabel}
              isOwner={view.isOwner}
              signedIn={view.signedIn}
              initialMuted={view.viewerMutes}
              onCover
            />
          }
        />

        <ProfileTabs
          handle={view.profile.handle}
          isOwner={view.isOwner}
          signedIn={view.signedIn}
          hasBio={view.profile.bio.length > 0}
          tabs={tabs}
          storyCount={view.storyCount}
          initialTab={tabFrom(query.tab, tabs)}
          data={{ posts, replies, media, activity, properties, stories, reviews }}
        />

        <AroundFab />
      </div>
    );
  }

  /* Every other outcome is a designed page with its own way onward, under the
     ordinary page header rather than under a cover, because there is no person
     here for a cover to belong to. */
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={`@${handle}`} fallback="/home" />

      {view.state === "unconfigured" && (
        <ProfileNotice
          icon="user-check"
          title="Profiles switch on shortly"
          body="The platform keys are not in place yet, so nobody's page can be read from here. Everything else in the app works as normal."
          primary={{ href: "/home", label: "Back to home" }}
        />
      )}

      {view.state === "malformed" && (
        <ProfileNotice
          icon="home-search"
          title="That is not a handle"
          body="A handle is 3 to 20 characters: letters, numbers and underscores, starting with a letter. Check the address and try again."
          primary={{ href: "/home", label: "Back to home" }}
          secondary={{ href: "/search", label: "Search stays" }}
        />
      )}

      {/*
        The copy here never says the handle is free, and that is deliberate.
        `social_profiles_select` hides a profile from anybody a block touches in
        either direction, so this one screen covers two situations and nothing in
        an exposed schema can tell them apart. Telling a blocked visitor that a
        name is available would be a lie and would send them into a claim the
        unique index then refuses.
      */}
      {view.state === "claimable" && (
        <ProfileNotice
          icon="user-verified"
          title={`Nothing to show at @${handle}`}
          body={
            view.canClaim
              ? "Either nobody holds this handle, or its owner is not reachable from your account. If it is going spare, you can take it and it becomes your address on RentMe."
              : view.signedIn
                ? "Either nobody holds this handle, or its owner is not reachable from your account. You already have a page of your own, and a person keeps one handle at a time."
                : "Nobody we can show you is at this handle. Sign in to claim it, or to see whose it is."
          }
          primary={
            view.canClaim
              ? { href: `/u/${handle}/edit`, label: `Claim @${handle}` }
              : view.signedIn
                ? { href: "/profile", label: "Go to your account" }
                : { href: "/sign-in", label: "Sign in to claim it" }
          }
          secondary={{ href: "/home", label: "Back to home" }}
        />
      )}
    </div>
  );
}
