import type { Metadata } from "next";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { ProfileHeader } from "@/components/social/profile/ProfileHeader";
import { ProfileNotice } from "@/components/social/profile/ProfileNotice";
import { ProfileTabs } from "@/components/social/profile/ProfileTabs";
import { loadPublicProfile, normaliseHandle } from "@/lib/social/profiles-queries";

/**
 * `/u/[handle]`: a person's page.
 *
 * A handle is an address, so this route answers for every one of them, whether
 * somebody holds it or not. A handle nobody has taken is not a 404: it is an
 * offer, because the fastest way to get somebody their own page is to show them
 * the one that is waiting.
 *
 * Everything here is public by definition except a bio the scanner is holding,
 * and that decision is made in the query rather than in this file, so no
 * template can forget it.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  return { title: `@${normaliseHandle(handle)}` };
}

export default async function SocialProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle: raw } = await params;
  const handle = normaliseHandle(raw);
  const locale = await getLocale();
  const view = await loadPublicProfile(raw);

  if (view.state === "found") {
    return (
      <div className="mx-auto max-w-2xl">
        <ProfileHeader
          profile={view.profile}
          isOwner={view.isOwner}
          homeArea={view.homeArea}
          moderatorOf={view.moderatorOf}
          locale={locale}
        />
        <ProfileTabs
          handle={view.profile.handle}
          isOwner={view.isOwner}
          hasBio={view.profile.bio.length > 0}
        />
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

      {view.state === "blocked" && (
        <ProfileNotice
          icon="shield-check"
          title="This page is not available to you"
          body="You blocked this person, so their page stays out of your way. Nothing about this is shown to them."
          primary={{ href: "/home", label: "Back to home" }}
          secondary={{ href: "/around", label: "Look around" }}
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

      {view.state === "claimable" && (
        <ProfileNotice
          icon="user-verified"
          title={`@${handle} is free`}
          body={
            view.canClaim
              ? "Nobody holds this handle. Take it and it becomes your address on RentMe, with your bio, the place you call home and everything you say around it."
              : view.signedIn
                ? "Nobody holds this handle yet. You already have a page of your own, and a person keeps one handle at a time."
                : "Nobody holds this handle. Sign in and it can be yours, with your bio, the place you call home and everything you say around it."
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
