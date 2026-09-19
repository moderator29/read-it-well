import { getDictionary } from "@vallo/i18n";
import { ProfileHeader } from "@/components/social/profile/ProfileHeader";
import { PERSON } from "../../_fixtures/people";

/**
 * Somebody else's page, from fixtures: the real `ProfileHeader` exactly as
 * `/u/[handle]` composes it.
 *
 * ADDED BECAUSE `/u/[handle]` WAS THE ONE SURFACE IN THIS SCOPE WITH NO
 * HARNESS. `/preview/f4/profile` photographs `AccountHero` and `AccountBody`,
 * which is the page its OWNER sees; a stranger's page is a different component
 * tree entirely, and the two small badges the shape law had to be applied to,
 * `.nf-social-role` and `.nf-social-chip`, are drawn nowhere else. Neither
 * could be photographed before this page existed, so neither could be proved.
 *
 * The fixture deliberately carries every optional band at once, which no real
 * profile has to: a moderator badge, an occupation, two standings, a place and
 * an agent trust band. A shot of a person with none of them proves nothing
 * about the badges, and the point of this page is the badges.
 */
export default function PublicProfilePreview() {
  const t = getDictionary("en");
  return (
    <main className="min-w-0 flex-1 pb-4xl">
      <ProfileHeader
        profile={{
          userId: PERSON.id,
          handle: PERSON.handle,
          displayLabel: PERSON.name,
          avatarUrl: "",
          isAgent: true,
          bio: PERSON.bio,
          bioStatus: "LIVE",
          pronouns: "he/him",
          link: "vallo.ng",
          contactPolicy: "OPEN",
          pidginOk: true,
          homeAreaId: "00000000-0000-4000-8000-00000000c001",
          coverPath: null,
          coverUrl: "",
          followerCount: 12400,
          followingCount: 482,
          postCount: 36,
          claimedAt: "2025-03-04T09:00:00.000Z",
        }}
        isOwner={false}
        homeArea={{ slug: "lekki-phase-1", name: "Lekki Phase 1", city: "Lagos" }}
        moderatorOf={[{ slug: "lekki-phase-1", name: "Lekki Phase 1" }]}
        locale="en"
        t={t}
        occupation={{ code: "ESTATE_AGENT", name: "Estate agent" }}
        standing={[
          { code: "TRUSTED", name: "Trusted", objectName: "shield-check" },
          { code: "FAST_REPLIES", name: "Fast replies", objectName: "chat-ring" },
        ]}
        place={{ lga: "Eti-Osa", state: "Lagos", label: "Eti-Osa, Lagos" }}
        trust={{
          score: 92,
          completedDeals: 41,
          responseTime: "2 hrs",
          reviewCount: 28,
          averageRating: 4.8,
        }}
        joinedLabel="March 2025"
      />
    </main>
  );
}
