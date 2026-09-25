import { getDictionary } from "@vallo/i18n";
import { AccountHero } from "@/app/(app)/profile/AccountHero";
import { AccountBody } from "@/app/(app)/profile/AccountBody";
import { SignedOutHero } from "@/app/(app)/profile/SignedOutHero";
import { switchRoleLine } from "@/app/(app)/profile/belongings";
import LoadingProfile from "@/app/(app)/profile/loading";
import { AddWorkspaceChooser } from "@/components/supply/AddWorkspaceChooser";
import { PERSON } from "../../_fixtures/people";
import { FEED_POSTS } from "../../f4/fixtures";

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
                isAgent: true,
                bio: PERSON.bio,
              }
            : null
        }
        badgeTier={claimed ? "gold" : null}
        locale="en"
      />
      <AccountBody
        counts={{ trips: 3, saved: 12, reviews: 2 }}
        copy={{
          bookings: t.nav.bookings,
          saved: t.nav.saved,
          wallet: t.nav.wallet,
          messages: t.nav.messages,
          settings: t.nav.settings,
          belongings: t.socialProfile.belongings,
          posts: t.socialProfile.posts,
          myBookings: t.socialProfile.myBookings,
          myBookingsSub: t.socialProfile.myBookingsSub,
          savedSub: t.socialProfile.savedSub,
          walletSub: t.socialProfile.walletSub,
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
