/*
 * TEMPORARY verification route. Deleted before hand-over.
 *
 * The sandbox cannot reach the Supabase host, so every social route renders its
 * unconfigured state here and the designed profile itself can never be looked
 * at locally. This route renders the same components against a fixed view so a
 * human can actually see the cover, the overlap and the counts at 390px in both
 * themes, which is the one check that has caught real defects in this codebase.
 */
import { ProfileHeader } from "@/components/social/profile/ProfileHeader";
import { ProfileTabs } from "@/components/social/profile/ProfileTabs";
import type { SocialProfileView } from "@/lib/social/profiles-queries";

const view: SocialProfileView = {
  userId: "00000000-0000-4000-8000-000000000000",
  handle: "tolu_ade",
  displayLabel: "Tolu Adeyemi",
  avatarUrl: "",
  isAgent: true,
  bio: "Living in Yaba since 2019. I know which streets flood, which landlords answer their phone, and where to eat at midnight.",
  bioStatus: "LIVE",
  pronouns: "she/her",
  link: "https://toluade.ng",
  contactPolicy: "REQUEST",
  pidginOk: true,
  homeAreaId: null,
  coverPath: null,
  coverUrl: "",
  followerCount: 1284,
  followingCount: 312,
  postCount: 96,
  claimedAt: new Date().toISOString(),
};

export default function ShotProfilePage() {
  return (
    <div className="mx-auto max-w-2xl">
      <ProfileHeader
        profile={view}
        isOwner
        homeArea={{ slug: "lagos-yaba", name: "Yaba", city: "Lagos" }}
        moderatorOf={[{ slug: "lagos-yaba", name: "Yaba" }]}
        locale="en"
      />
      <ProfileTabs handle={view.handle} isOwner hasBio />
    </div>
  );
}
