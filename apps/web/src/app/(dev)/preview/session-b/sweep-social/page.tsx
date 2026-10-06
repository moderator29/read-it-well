import { Suspense } from "react";
import { sheetWordsOf } from "@/components/social/sheet-words";
import { getDictionary, type Locale } from "@vallo/i18n";
import { AppShell } from "@/components/app/AppShell";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { Inbox } from "@/app/(app)/messages/Inbox";
import { ThreadView } from "@/app/(app)/messages/[id]/ThreadView";
import { ShareToThread } from "@/app/(app)/messages/share/SharePicker";
import { ProfileEditor } from "@/components/social/profile/ProfileEditor";
import { ProfilePhotos } from "@/components/social/profile/ProfilePhotos";
import { PeopleList } from "@/components/social/profile/PeopleList";
import { ProfileHeader } from "@/components/social/profile/ProfileHeader";
import { FollowButton } from "@/components/social/profile/FollowButton";
import { ProfileMenu } from "@/components/social/profile/ProfileMenu";
import { ProfileShare } from "@/components/social/profile/ProfileShare";
import { ProfileTabs } from "@/components/social/profile/ProfileTabs";
import { InboxEmpty } from "@/app/(app)/messages/Inbox";
import InboxLoading from "@/app/(app)/messages/loading";
import ThreadLoading from "@/app/(app)/messages/[id]/loading";
import ProfileLoading from "@/app/(app)/u/[handle]/loading";
import EditLoading from "@/app/(app)/u/[handle]/edit/loading";
import FollowersLoading from "@/app/(app)/u/[handle]/followers/loading";
import PeopleLoading from "@/app/(app)/u/loading";
import { AGENT_TABS, MEMBER_TABS, type TabKey } from "@/lib/social/profile-tabs-schema";
import type { FollowRow } from "@/lib/social/follows-queries";
import type { PropertyCard } from "@/lib/social/profile-tabs-queries";
import { COUNTERPART, HOTEL, PERSON } from "../../_fixtures/people";
import { AREA_OPTIONS, EDITOR_PROFILE, FEED_POSTS } from "../../f4/fixtures";
import {
  BOOKING_CONTEXT,
  BOOKING_THREAD,
  CONVERSATION_ID,
  INBOX,
  INSPECTION,
  LISTING_CARD,
  LISTING_ID,
  RENTAL_CONTEXT,
  RENTAL_THREAD,
} from "../../f5/fixtures";

/**
 * `/preview/session-b/sweep-social?f=<face>`: the social and messages group
 * of the platform sweep, the real components on fixture props inside the
 * real app shell, so the before and after proofs of every signed-in route in
 * the group come from one committed place. Behind the preview gate in
 * `../../layout.tsx`. Faces: profile (`&tab=` any tab key, `&m=1` for the
 * member bar, `&e=1` for every tab empty), followers, followers-empty, edit,
 * inbox, inbox-empty, booking, rental, plain, share, and the loading
 * skeletons as load-inbox, load-thread, load-profile, load-edit,
 * load-followers, load-people. Invented names only (`app/(dev)/preview/_fixtures/people.ts`).
 */
export const dynamic = "force-dynamic";

const FOLLOWERS: FollowRow[] = [
  {
    userId: COUNTERPART.id,
    handle: COUNTERPART.handle,
    displayLabel: COUNTERPART.name,
    avatarUrl: "",
    isAgent: true,
    badgeTier: "gold",
    bio: "Lettings across Lekki and Ajah.",
    viewerFollows: true,
    isViewer: false,
  },
  {
    userId: "00000000-0000-4000-8000-000000000011",
    handle: "adaora_n",
    displayLabel: "Adaora Nwosu",
    avatarUrl: "",
    isAgent: false,
    badgeTier: "none",
    bio: "",
    viewerFollows: false,
    isViewer: false,
  },
  {
    userId: PERSON.id,
    handle: PERSON.handle,
    displayLabel: PERSON.name,
    avatarUrl: "",
    isAgent: false,
    badgeTier: "none",
    bio: PERSON.bio,
    viewerFollows: false,
    isViewer: true,
  },
] as FollowRow[];

const ROUTES: Record<string, string> = {
  profile: `/u/${PERSON.handle}`,
  "followers-empty": `/u/${PERSON.handle}/followers`,
  "inbox-empty": "/messages",
  "load-inbox": "/messages",
  "load-thread": `/messages/${CONVERSATION_ID}`,
  "load-profile": `/u/${PERSON.handle}`,
  "load-edit": `/u/${PERSON.handle}/edit`,
  "load-followers": `/u/${PERSON.handle}/followers`,
  "load-people": "/u",
  followers: `/u/${PERSON.handle}/followers`,
  edit: `/u/${PERSON.handle}/edit`,
  inbox: "/messages",
  booking: `/messages/${CONVERSATION_ID}`,
  rental: `/messages/${CONVERSATION_ID}`,
  plain: `/messages/${CONVERSATION_ID}`,
  share: `/messages/share/listing/${LISTING_ID}`,
};

const PROPERTIES: PropertyCard[] = [
  {
    id: "00000000-0000-4000-8000-00000000a001",
    title: "Luxury 2 bedroom apartment",
    area: "Lekki Phase 1",
    city: "Lagos",
    priceMinor: 280_000_000,
    pricePeriod: "year",
    intent: "rent",
    bedrooms: 2,
    bathrooms: 2,
    photoUrl: "/brand/photos/bedroom-01.jpg",
  },
];
const REVIEWS = [
  {
    id: "r1",
    rating: 5,
    body: "Clear about the terms from the first message and on time for the inspection.",
    createdLabel: "2 weeks ago",
    listingTitle: "Luxury 2 bedroom apartment",
    authorLabel: "Adaora Nwosu",
  },
];

async function Face({ f, tab, member, empty }: { f: string; tab?: string; member: boolean; empty: boolean }) {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  switch (f) {
    case "profile":
      return (
        <ProfileHeader
          profile={{
            userId: PERSON.id,
            handle: PERSON.handle,
            displayLabel: PERSON.name,
            avatarUrl: "",
            isAgent: true,
            badgeTier: "gold" as const,
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
          trust={{ completedDeals: 41, responseTime: "2 hrs", reviewCount: 28, averageRating: 4.8 }}
          joinedLabel="March 2025"
          follow={<FollowButton handle={PERSON.handle} initialFollowing={false} signedIn labels={t.socialProfile} />}
          share={<ProfileShare handle={PERSON.handle} displayLabel={PERSON.name} />}
          menu={
            <ProfileMenu handle={PERSON.handle} userId={PERSON.id} displayLabel={PERSON.name} isOwner={false} signedIn />
          }
        />
      );
    case "tabs": {
      const tabs: TabKey[] = member ? MEMBER_TABS : AGENT_TABS;
      return (
        <div className="mx-auto max-w-2xl">
          <ProfileTabs
            handle={PERSON.handle}
            isOwner={false}
            signedIn
            hasBio
            tabs={tabs}
            initialTab={(tab as TabKey) ?? tabs[0]}
            storyCount={0}
            labels={t.socialProfile}
            sheet={sheetWordsOf(t)}
            data={{
              posts: empty ? [] : FEED_POSTS,
              replies: [],
              media: [],
              activity: [],
              properties: empty ? [] : PROPERTIES,
              stories: [],
              reviews: empty ? [] : REVIEWS,
            }}
          />
        </div>
      );
    }
    case "followers-empty":
      return (
        <div className="mx-auto max-w-2xl">
          <PageHeader title="Followers" subtitle={`People who follow ${PERSON.name}`} fallback={`/u/${PERSON.handle}`} />
          <PeopleList handle={PERSON.handle} direction="followers" isOwner={false} signedIn total={0} initial={[]} initialCursor={null} />
        </div>
      );
    case "inbox-empty":
      return (
        <div className="mx-auto max-w-2xl">
          <PageHeader title="Inbox" />
          <InboxEmpty
            title="Sign in to see your messages"
            body="Conversations live with your account, so they follow you between devices and nobody else can read them."
            action={{ href: "/sign-in", label: "Sign in" }}
            secondary={{ href: "/search", label: "Explore places" }}
          />
        </div>
      );
    case "load-inbox":
      return <InboxLoading />;
    case "load-thread":
      return <ThreadLoading />;
    case "load-profile":
      return <ProfileLoading />;
    case "load-edit":
      return <EditLoading />;
    case "load-followers":
      return <FollowersLoading />;
    case "load-people":
      return <PeopleLoading />;
    case "followers":
      return (
        <div className="mx-auto max-w-2xl">
          <PageHeader title="Followers" subtitle={`People who follow ${PERSON.name}`} fallback={`/u/${PERSON.handle}`} />
          <PeopleList
            handle={PERSON.handle}
            direction="followers"
            isOwner={false}
            signedIn
            total={FOLLOWERS.length}
            initial={FOLLOWERS}
            initialCursor={null}
          />
        </div>
      );
    case "edit":
      return (
        <div className="mx-auto max-w-2xl">
          <PageHeader title="Edit your profile" subtitle={`@${EDITOR_PROFILE.handle}`} fallback={`/u/${EDITOR_PROFILE.handle}`} />
          <div className="mb-sm">
            <ProfilePhotos
              userId={EDITOR_PROFILE.userId}
              handle={EDITOR_PROFILE.handle}
              coverUrl={EDITOR_PROFILE.coverUrl}
              avatarUrl={EDITOR_PROFILE.avatarUrl}
              displayName={EDITOR_PROFILE.displayLabel}
            />
          </div>
          <ProfileEditor profile={EDITOR_PROFILE} initialHandle={EDITOR_PROFILE.handle} areas={AREA_OPTIONS} />
        </div>
      );
    case "inbox":
      return (
        <div className="mx-auto max-w-2xl">
          <Inbox rows={INBOX} meId={PERSON.id} canMarkRead />
        </div>
      );
    case "share":
      return (
        <div className="mx-auto max-w-2xl">
          <PageHeader title="Share to chat" subtitle={LISTING_CARD.title} fallback={`/listing/${LISTING_ID}`} />
          <ShareToThread
            card={LISTING_CARD}
            target={{ kind: "listing", id: LISTING_ID }}
            copy={t.experienceInbox.share.picker}
            threads={[
              {
                id: "00000000-0000-4000-8000-00000000c001",
                counterpartName: HOTEL.name,
                counterpartVerified: true,
                counterpartTier: "gold" as const,
                counterpartKind: "agent",
                listingTitle: HOTEL.name,
              },
              {
                id: "00000000-0000-4000-8000-00000000c003",
                counterpartName: "Adaora Nwosu",
                counterpartVerified: false,
                counterpartTier: "none" as const,
                counterpartKind: "member",
                listingTitle: null,
              },
            ]}
          />
        </div>
      );
    case "booking":
    case "rental":
    case "plain": {
      const booking = f === "booking";
      const rental = f === "rental";
      /*
       * NO `counterpartVerified` HERE, AND DO NOT PUT IT BACK.
       *
       * `9b3d254d` removed it from `ThreadViewProps`, correctly: the flag was
       * the LISTING's and was being drawn beside a PERSON's name, which is the
       * one thing rule 12 forbids. This fixture went on passing it, so from
       * that commit `origin/main` stopped type checking and no production
       * build completed for anybody, in either session.
       *
       * The two `counterpartVerified` keys further up this file are
       * `ShareToThread`'s own thread descriptors, a different type entirely,
       * and `SharePicker.tsx` still declares one. So never sweep this file by
       * the property name.
       *
       * `counterpartTier` replaced it and is REQUIRED, so this fixture must
       * carry one. It is the PERSON's badge tier from the single published
       * derivation, which is the whole point of the change: the rental case
       * draws none, the others gold. Never pass a listing's flag here.
       */
      return (
        <div className="flex h-dvh flex-col">
          <ThreadView
            sheetCopy={{ passport: t.trustVisible.passport, unsafe: t.trustVisible.unsafe }}
            live={false}
            conversationId={CONVERSATION_ID}
            meId={PERSON.id}
            counterpartName={booking ? HOTEL.name : rental ? "Michael T." : COUNTERPART.name}
            counterpartTier={rental ? "none" : "gold"}
            counterpartPhone="+2348010000000"
            listing={
              booking
                ? { id: HOTEL.id, title: HOTEL.name, area: HOTEL.area, city: HOTEL.city, verified: true, approved: true, hue: 2 }
                : rental
                  ? { id: LISTING_ID, title: "Luxury 2 bedroom apartment", area: "Lekki Phase 1", city: "Lagos", verified: true, approved: true, hue: 1 }
                  : null
            }
            inspected={false}
            messages={booking ? BOOKING_THREAD : rental ? RENTAL_THREAD : RENTAL_THREAD.filter((m) => !m.imageUrl).slice(0, 4)}
            context={booking ? BOOKING_CONTEXT : rental ? RENTAL_CONTEXT : undefined}
            inspection={rental ? INSPECTION : null}
            role={rental ? "host" : "guest"}
            threadCopy={t.threads}
            locale={locale}
          />
        </div>
      );
    }
    default:
      return <p className="nf-body">Unknown face.</p>;
  }
}

export default async function SweepSocialPreview({
  searchParams,
}: {
  searchParams: Promise<{ f?: string; tab?: string; m?: string; e?: string }>;
}) {
  const { f = "profile", tab, m, e } = await searchParams;
  return (
    <Suspense>
      <AppShell
        t={getDictionary("en")}
        userName={PERSON.name}
        userHandle={PERSON.handle}
        signedIn
        unreadNotifications={2}
        preview={{ route: ROUTES[f] ?? "/messages" }}
      >
        {f === "profile" ? (
          <>
            <Face f="profile" member={m === "1"} empty={e === "1"} />
            <div className="mt-md">
              <Face f="tabs" tab={tab} member={m === "1"} empty={e === "1"} />
            </div>
          </>
        ) : (
          <Face f={f} member={m === "1"} empty={e === "1"} />
        )}
      </AppShell>
    </Suspense>
  );
}
