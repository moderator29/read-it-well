import type { Metadata } from "next";
import { getDictionary } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { RowLink, SettingsGroup } from "@/components/app/account/rows";
import { loadProfileState } from "@/lib/profile/queries";
import { loadAccountSocialIdentity } from "@/lib/profile/social-identity";
import { getProfileFeed } from "@/lib/social/posts-queries";
import { AccountHero } from "./AccountHero";
import { SignedOutHero } from "./SignedOutHero";
import { AccountBody } from "./AccountBody";

export const metadata: Metadata = { title: "Profile" };

/**
 * Profile: your account, wearing your own identity.
 *
 * This page and `/u/[handle]` were two different ideas of the same person. One
 * ran a cover edge to edge, put the avatar on the stride ring and showed real
 * follower counts; this one showed a monogram in a white box, three numbers in
 * a bordered strip and seven square tiles. They were not two designs of one
 * screen, they were two people, and only one of them looked like it belonged to
 * this platform.
 *
 * So the header here is now the social header, class for class, with both
 * photos changeable in place. Underneath it, two tabs: everything that belongs
 * to you as grouped rows, and what you have actually written.
 *
 * **The cover, the counts and the posts all need a claimed handle**, because
 * they all live on `social_profiles`. Somebody who has not claimed one is not
 * shown empty versions of them. They get the same header without the counts,
 * and an offer, because the fastest way to get somebody their own page is to
 * show them the one that is waiting.
 *
 * Signed out, or before the platform keys land, the same header shape stands
 * with only what is actually known on it. It used to show 8 trips, 23 saved
 * and 5 reviews to somebody who had never booked anything, because those three
 * numbers were constants in the file. See `SignedOutHero`.
 */
export default async function ProfilePage() {
  const locale = await getLocale();
  const t = getDictionary(locale);

  // Three reads that do not depend on each other, so they cost one round trip
  // rather than three. On the connections this product is built for that is the
  // difference between a page and a wait.
  const [account, social] = await Promise.all([
    loadProfileState(),
    loadAccountSocialIdentity(),
  ]);

  const identity = social.state === "claimed" ? social.identity : null;

  // Only somebody with a handle has posts to read, and the read is keyed by
  // user id rather than handle, so it needs the identity to have resolved.
  const posts =
    social.state === "claimed" ? await getProfileFeed(social.userId) : [];

  const copy = {
    bookings: t.nav.bookings,
    saved: t.nav.saved,
    wallet: t.nav.wallet,
    messages: t.nav.messages,
    settings: t.nav.settings,
    becomeAgent: t.landing.footer.becomeAgent,
  };

  if (account.state !== "signed-in") {
    return (
      <div className="mx-auto max-w-2xl">
        <SignedOutHero unconfigured={account.state === "unconfigured"} />

        {account.state === "no-row" && (
          <p
            role="status"
            className="nf-card mt-3 p-4 text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]"
          >
            We could not load your account profile just now, so this page is showing what is
            held on this device. Sign out and back in, then open this page again.
          </p>
        )}

        {/* The destinations still exist and still say what they are. Hiding
            them would make the app look smaller than it is to the one person
            most likely to be deciding whether to sign up. No counts, because
            there is nothing yet to count. */}
        <div className="mt-6 space-y-6">
          <SettingsGroup label="What is here">
            <RowLink href="/search" icon="search" label="Find a place" />
            <RowLink href="/bookings" icon="calendar-booking" label={t.nav.bookings} />
            <RowLink href="/saved" icon="heart" label={t.nav.saved} />
          </SettingsGroup>

          <SettingsGroup label="More">
            <RowLink href="/settings" icon="sliders" label={t.nav.settings} />
            <RowLink
              href="/agents"
              icon="building-apartment"
              label={t.landing.footer.becomeAgent}
            />
            <RowLink href="/help" icon="ticket" label="Help" />
          </SettingsGroup>
        </div>
      </div>
    );
  }

  const { profile } = account;
  const placeLabel = [profile.place.lgaName, profile.place.stateName].filter(Boolean).join(", ");

  return (
    <div className="mx-auto max-w-2xl">
      <AccountHero
        userId={profile.userId}
        displayName={
          profile.displayName || [profile.firstName, profile.surname].filter(Boolean).join(" ")
        }
        email={profile.email}
        avatarUrl={profile.avatarUrl}
        identity={
          identity
            ? {
                handle: identity.handle,
                coverUrl: identity.coverUrl,
                followerCount: identity.followerCount,
                followingCount: identity.followingCount,
                postCount: identity.postCount,
                isAgent: identity.isAgent,
                bio: identity.bio,
              }
            : null
        }
        metaLine={{
          place: placeLabel,
          joined: `Joined ${monthAndYear(profile.memberSince)}`,
        }}
        locale={locale}
      />

      <AccountBody
        counts={profile.counts}
        copy={copy}
        email={profile.email}
        placeLabel={placeLabel}
        occupationName={profile.place.occupationName}
        details={{
          firstName: profile.firstName,
          surname: profile.surname,
          nickname: profile.nickname,
          phone: profile.phone,
        }}
        posts={posts}
        handle={identity?.handle ?? null}
        hasBio={(identity?.bio.length ?? 0) > 0}
        locale={locale}
      />
    </div>
  );
}

/** Member-since reads as a month and a year, in Lagos time. */
function monthAndYear(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "today";
  return new Intl.DateTimeFormat("en-NG", {
    month: "long",
    year: "numeric",
    timeZone: "Africa/Lagos",
  }).format(date);
}
