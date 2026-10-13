import { getDictionary } from "@vallo/i18n";
import { sheetWordsOf } from "@/components/social/sheet-words";
import { AccountHero } from "@/app/(app)/profile/AccountHero";
import { AccountBody } from "@/app/(app)/profile/AccountBody";
import { SignedOutHero } from "@/app/(app)/profile/SignedOutHero";
import { switchRoleLine } from "@/app/(app)/profile/belongings";
import LoadingProfile from "@/app/(app)/profile/loading";
import { AddWorkspaceChooser } from "@/components/supply/AddWorkspaceChooser";
import { PERSON } from "../../_fixtures/people";
import { FEED_POSTS } from "../../f4/fixtures";
import { BadgeRow } from "@/components/social/badges/BadgeRow";
import { badgeCopyOf } from "@/components/social/badges/badge-copy";
import type { ProfileBadge } from "@/components/social/badges/badge-model";
import { IdentityCredentials } from "@/components/app/identity/IdentityHeader";
import { ValloRecord } from "@/components/app/trust/ValloRecord";
import { PassportRows } from "@/app/(app)/profile/PassportRows";
import { roleLine, roleWords } from "@/lib/profile/role-line";
import type { RecordRow } from "@/lib/trust/record";

/* A Vallo Record, as a fixture (fictional, never shipped). */
const FIXTURE_RECORD: RecordRow = {
  recordCode: "VR-7KQ2-M4",
  displayName: PERSON.name,
  since: "2026-03-04T09:00:00.000Z",
  stoppedAt: null,
  replyMedianMinutes: 42,
  replied: 38,
  answeredInDay: 36,
  enquiries: 40,
  described: 12,
  describedOf: 12,
  lets: 6,
  kept: 9,
  keptOf: 10,
  stopped: false,
};

/*
 * `?v=badges`: the full state with a badge row. The codes, names and objects
 * are six rows of the real `public.badges` catalogue (Neighbour draws
 * `home-search`, the one the founder photographed); that this person holds
 * them is the fixture.
 */
const CATALOGUE_BADGES: readonly [string, string, string][] = [
  ["neighbour", "Neighbour", "home-search"],
  ["verified_member", "Verified Member", "user-verified"],
  ["first_stay", "First Stay", "luggage-check"],
  ["photo_pro", "Photo Pro", "camera"],
  ["honest_reviewer", "Honest Reviewer", "reviews"],
  ["local_guide", "Local Guide", "map-route"],
];
const FIXTURE_BADGES: ProfileBadge[] = CATALOGUE_BADGES.map(([code, name, objectName], i) => ({
  code,
  name,
  description: name,
  objectName,
  tier: 1,
  grantedAt: `2026-0${(i % 8) + 1}-04T09:00:00.000Z`,
  grantedLabel: "4 March 2026",
  earned: false,
}));

/**
 * The profile's proof harness (rule R-G): the real `AccountHero`,
 * `AccountBody` and `SignedOutHero` on fixture props, so every shot in
 * `docs/design/proofs/session-b/profile/` and the shape sweep can be re-run.
 * FIXTURE PROPS, NOT DATA: the counts, the balance and the posts are invented
 * for the picture and prove only the look; the wiring is in ledger 1.2.
 *
 *   ?v=full       claimed handle, approved agent (the default)
 *   ?v=values     plus a figure on every row and an agent and staff account
 *   ?v=nohandle   no handle claimed
 *   ?v=noposts    no posts
 *   ?v=signedout  the signed-out page
 *   ?v=loading    the profile's loading skeleton
 *   ?v=setup      the add-a-workspace chooser at /profile/setup
 *   ?v=badges     the full state with a badge row from the real catalogue
 *   ?v=renter     a renter: no supply account, no tier, no Record
 *   ?v=host       somebody running a hotel and a shortlet
 * The full and values states carry a gold badge tier (a fixture, standing in
 * for what `person_badge` would publish for an approved agent).
 */
export function ProfileHarness({ v = "full" }: { v?: string }) {
  const t = getDictionary("en");
  if (v === "loading") return <LoadingProfile />;
  if (v === "setup") return <AddWorkspaceChooser t={t} side="property" />;
  if (v === "signedout") {
    return (
      <div className="nf-pf">
        <SignedOutHero unconfigured={false} />
      </div>
    );
  }
  const claimed = v !== "nohandle";
  /* Who the fixture is, for the role line: an approved agent by default, a
     renter with no supply account, or somebody running a hotel and a
     shortlet. Each is a fixture standing in for the rows `role-facts.ts`
     reads. A renter holds no published tier: gold is a checked lister's. */
  const words =
    v === "renter"
      ? roleWords({ listers: [], businesses: [] })
      : v === "host"
        ? roleWords({ listers: [], businesses: ["hotel", "shortlet_operator"] })
        : roleWords({ listers: ["agent"], businesses: [] });
  return (
    <div className="nf-pf">
      <AccountHero
        userId={PERSON.id}
        displayName={PERSON.name}
        email="seyi@example.com"
        avatarUrl=""
        identity={
          claimed
            ? {
                handle: PERSON.handle,
                coverUrl: "",
                followerCount: 12400,
                followingCount: 482,
                postCount: 3,
                isAgent: v !== "renter" && v !== "host",
                bio: PERSON.bio,
              }
            : null
        }
        badgeTier={claimed && v !== "renter" ? "gold" : null}
        roleLine={roleLine(words, t.socialProfile.roleLine)}
        locale="en"
        credentials={
          <IdentityCredentials label={t.socialProfile.passportAndCredentials}>
            {v === "badges" ? <BadgeRow badges={FIXTURE_BADGES} isOwner copy={badgeCopyOf(t)} /> : null}
            <PassportRows
              on
              copy={t.passportV2}
              memberSinceLabel={t.socialProfile.accountPage.memberSince}
              memberSince="September 2026"
            />
            {v === "renter" || v === "host" ? null : <ValloRecord record={FIXTURE_RECORD} t={t} locale="en" />}
          </IdentityCredentials>
        }
      />
      <AccountBody
        sheet={sheetWordsOf(t)}
        counts={{ trips: 3, saved: 12, reviews: 2 }}
        copy={{
          bookings: t.nav.bookings,
          saved: t.nav.saved,
          agreements: t.nav.agreements,
          messages: t.nav.messages,
          settings: t.nav.settings,
          belongings: t.socialProfile.belongings,
          posts: t.socialProfile.posts,
          myBookings: t.socialProfile.myBookings,
          myBookingsSub: t.socialProfile.myBookingsSub,
          savedSub: t.socialProfile.savedSub,
          agreementsSub: t.socialProfile.agreementsSub,
        }}
        email="seyi@example.com"
        placeLabel="Eti-Osa, Lagos"
        occupationName="Product designer"
        details={{ firstName: "Seyi", surname: "Omojuni", nickname: "", phone: "" }}
        posts={v === "noposts" ? [] : FEED_POSTS}
        handle={claimed ? PERSON.handle : null}
        hasBio
        locale="en"
        facts={
          v === "values"
            ? {
                upcomingBookings: 2,
                saved: 14,
                openAgreements: 1,
                openInspections: 1,
              }
            : undefined
        }
        switchLine={switchRoleLine(
          v === "values" ? [{ kind: "agent" }, { kind: "console" }] : [],
          getDictionary("en").socialProfile.accountPage,
        )}
        memberSince="September 2026"
      />
    </div>
  );
}
