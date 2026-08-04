/* TEMPORARY verification route. Deleted before hand-over. See ../page.tsx. */
import { PageHeader } from "@/components/app/PageHeader";
import { ProfileEditor } from "@/components/social/profile/ProfileEditor";
import type { SocialProfileView } from "@/lib/social/profiles-queries";

const view: SocialProfileView = {
  userId: "00000000-0000-4000-8000-000000000000",
  handle: "tolu_ade",
  displayLabel: "Tolu Adeyemi",
  avatarUrl: "",
  isAgent: true,
  bio: "Living in Yaba since 2019. I know which streets flood, which landlords answer their phone, and where to eat at midnight.",
  bioStatus: "HELD",
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

export default function ShotEditorPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Edit your profile" subtitle="@tolu_ade" fallback="/home" />
      <ProfileEditor
        profile={view}
        initialHandle={view.handle}
        areas={[
          { id: "a1", name: "Yaba", city: "Lagos", stateCode: "LA" },
          { id: "a2", name: "Gwarinpa", city: "Abuja", stateCode: "FC" },
        ]}
      />
    </div>
  );
}
