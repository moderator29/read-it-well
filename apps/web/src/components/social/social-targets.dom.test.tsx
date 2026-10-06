/**
 * EVERY CONTROL IN THE SOCIAL SURFACES IS A 44PX TARGET (W12; Chromium at
 * 390 in English, the product's real compiled cascade, T1's `auditFit`).
 *
 * The surfaces: the feed's post card (like, reply, repost, share, the more
 * menu, the author's avatar and name), the composer, the profile header
 * (follow, the more menu, share, the avatar), the properties list and the
 * story rail. `auditFit` counts a control's own box or the box of its
 * `::before` or `::after` hit area, so a drawn 36px button with a 44px overlay
 * passes and a drawn 36px button without one is named here. The fixtures are
 * the preview harness's own (fictional, never shipped).
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { appCss, auditFit, fitMount } from "@/lib/testing/locale-fit";
import { BROWSER_TEST_TIMEOUT, closeBrowser, hasBrowser, warmBrowser } from "@/lib/testing/mount-in-browser";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);

const SURFACES: { name: string; imports: string; body: string; bleed?: boolean }[] = [
  {
    name: "the feed's post card",
    imports: `
      import { PostCard } from "@/components/social/feed/PostCard";
      import { FEED_POSTS } from "@/app/(dev)/preview/f4/fixtures";`,
    body: `<div style={{ display: "grid", gap: 16 }}>{FEED_POSTS.map((post) => (
      <PostCard key={post.id} post={post} locale="en" onLike={() => {}} onReply={() => {}} onRepost={() => {}} onShare={() => {}} onMenu={() => {}} />
    ))}</div>`,
  },
  {
    name: "the composer",
    imports: `import { Composer } from "@/components/social/feed/Composer";`,
    body: `<Composer signedIn areaName="Lekki Phase 1" />`,
  },
  {
    name: "the profile header",
    bleed: true,
    imports: `
      import { ProfileHeader } from "@/components/social/profile/ProfileHeader";
      import { FollowButton } from "@/components/social/profile/FollowButton";
      import { ProfileMenu } from "@/components/social/profile/ProfileMenu";
      import { ProfileShare } from "@/components/social/profile/ProfileShare";
      import { PERSON } from "@/app/(dev)/preview/_fixtures/people";`,
    body: `<ProfileHeader
      profile={{
        userId: PERSON.id, handle: PERSON.handle, displayLabel: PERSON.name, avatarUrl: "", isAgent: true,
        badgeTier: "gold", bio: PERSON.bio, bioStatus: "LIVE", pronouns: "he/him", link: "vallo.ng",
        contactPolicy: "OPEN", pidginOk: true, homeAreaId: "00000000-0000-4000-8000-00000000c001",
        coverPath: null, coverUrl: "", followerCount: 12400, followingCount: 482, postCount: 36,
        claimedAt: "2025-03-04T09:00:00.000Z",
      }}
      isOwner={false}
      homeArea={{ slug: "lekki-phase-1", name: "Lekki Phase 1", city: "Lagos" }}
      moderatorOf={[{ slug: "lekki-phase-1", name: "Lekki Phase 1" }]}
      locale="en"
      t={t}
      occupation={{ code: "ESTATE_AGENT", name: "Estate agent" }}
      standing={[{ code: "TRUSTED", name: "Trusted", objectName: "shield-check" }]}
      place={{ lga: "Eti-Osa", state: "Lagos", label: "Eti-Osa, Lagos" }}
      trust={{ completedDeals: 41, responseTime: "2 hrs", reviewCount: 28, averageRating: 4.8 }}
      joinedLabel="March 2025"
      follow={<FollowButton handle={PERSON.handle} initialFollowing={false} signedIn />}
      menu={<ProfileMenu handle={PERSON.handle} userId={PERSON.id} displayLabel={PERSON.name} isOwner={false} signedIn onCover reportWords={t.experienceSocial.feed.report} />}
      share={<ProfileShare handle={PERSON.handle} displayLabel={PERSON.name} />}
    />`,
  },
  {
    name: "the properties list",
    imports: `import { PropertyList } from "@/components/social/profile/PropertyList";`,
    body: `<PropertyList properties={[
      { id: "p1", title: "Three-bedroom flat in Lekki", area: "Lekki Phase 1", city: "Lagos", priceMinor: 450000000, pricePeriod: "year", intent: "rent", bedrooms: 3, bathrooms: 3, photoUrl: null },
      { id: "p2", title: "Two-bedroom flat in Yaba", area: "Yaba", city: "Lagos", priceMinor: 180000000, pricePeriod: "year", intent: "rent", bedrooms: 2, bathrooms: 2, photoUrl: null },
    ]} />`,
  },
  {
    name: "the story rail",
    imports: `
      import { StoryRing } from "@/components/social/feed/StoryRing";
      import { FEED_STORIES, YOU } from "@/app/(dev)/preview/f4/fixtures";`,
    body: `<StoryRing stories={FEED_STORIES} you={YOU} yourStoryLabel="Your story" />`,
  },
];

describe.skipIf(!hasBrowser && !process.env.CI)("social surfaces: tap targets at 390px", () => {
  for (const surface of SURFACES) {
    it(`${surface.name}: every control is at least 44px, by its box or its hit area`, async () => {
      const { page, close } = await fitMount({
        locale: "en",
        imports: surface.imports,
        body: surface.body,
        css: await appCss(),
        bleed: surface.bleed,
      });
      try {
        const found = await auditFit(page);
        expect(found.targets, `${surface.name}: controls under 44px`).toEqual([]);
      } finally {
        await close();
      }
    });
  }
});
