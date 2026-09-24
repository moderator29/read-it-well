import { getDictionary, type Locale } from "@vallo/i18n";
import { VitalsReporter } from "@/components/app/VitalsReporter";
import { DataMeterRecorder } from "@/components/app/DataMeterRecorder";
import { OfflineTray } from "@/components/app/OfflineTray";
import { WidgetBridge } from "@/components/app/WidgetBridge";
import { getLocale } from "@/lib/locale";
import { getShellIdentity } from "@/lib/app/shell-queries";
import { getSide } from "@/lib/side";
import { resolveWorkspaces } from "@/lib/supply/workspaces-queries";
import { AppShell } from "@/components/app/AppShell";

import type { Metadata } from "next";

/**
 * NOTHING UNDER THIS LAYOUT IS FOR A CRAWLER, AND THE TAG NOW SAYS SO.
 *
 * The root layout used to declare `robots: { index: true, follow: true }`
 * (UI-16 removed it: no tag is the indexable default, and stating it put
 * "index, follow" beside a not-found page's "noindex"). That was right when
 * browsing was open: `/search`, `/listing/[id]`, `/around`,
 * `/stays` and `/stay/[id]` were the inventory we wanted found. The founder's
 * item 8 of 23 September closed all of them, and roughly half the routes under
 * this group had no robots directive of their own, so they went on inheriting
 * an invitation to index a page the gate would refuse.
 *
 * No crawler can act on that, because `proxy.ts` answers a signed-out request
 * with a 307 to `/sign-in` and the HTML is never served. It is fixed here
 * anyway, for two reasons. A tag that contradicts the gate is a tag the next
 * person reads and believes. And the day one of these routes is deliberately
 * reopened, the safe default is the one that has to be switched ON rather than
 * the one somebody has to remember to switch off.
 *
 * ONE PLACE RATHER THAN THIRTY. Next merges metadata down the tree, so a page
 * that states its own `robots` still wins: the pages that already carry
 * `index: false` are unaffected, and any page deliberately reopened states it
 * here. The public site (landing, company and legal pages) carries no tag and
 * is indexed by default, as it must be.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * The consumer layout, for both sides.
 *
 * Wraps every consumer route in `AppShell` so the rail and tab bar are present
 * on all of them, not just home. This is a route group, so it adds the chrome
 * without changing any URL. Locale and dictionary are resolved once here and
 * handed down; the active destination is worked out inside the shell from the
 * current path.
 *
 * The shell is a client component, so the two facts it cannot fetch itself, who
 * is signed in and how many notifications they have not read, are resolved here
 * on the server and passed down. The name used to be a hardcoded "Guest" whose
 * own comment said "until real sessions land", which stopped being true the day
 * auth shipped, so every signed-in user was greeted by the placeholder.
 */
export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  /*
   * The side (Property or Stays) is a cookie, read once here and handed to the
   * shell, which computes the EFFECTIVE side from the path so a side-owned URL
   * always wins. Passing the cookie value from the server is what makes the
   * first paint of every shared route agree between server and client: no
   * hydration flash, no second render to correct the accent.
   */
  /*
   * The workspace list is the third server fact the shell cannot fetch itself,
   * beside the session and the unread count. It is read here once per request
   * (React's cache keeps it to one execution) and handed down, because the
   * switch sits in two places in that shell and both must show the same list.
   *
   * IT IS WHAT THEY HOLD, NOT WHAT THEY MAY DO. Every route gates itself.
   */
  const [
    side,
    { userName, userHandle, unreadNotifications, avatarUrl, signedIn, isAgent, isAdmin },
    { workspaces, current },
  ] = await Promise.all([getSide(), getShellIdentity(), resolveWorkspaces()]);

  return (
    <AppShell
      t={t}
      side={side}
      userName={userName}
      userHandle={userHandle}
      unreadNotifications={unreadNotifications}
      avatarUrl={avatarUrl}
      signedIn={signedIn}
      isAgent={isAgent}
      isAdmin={isAdmin}
      workspaces={workspaces}
      currentProfile={current}
    >
      {/* V-79: counts, on this phone only, what each page could measure. */}
      <DataMeterRecorder />
      {/* V-80: one page view in ten reports its own speed, anonymously. */}
      <VitalsReporter />
      {/* V-40: what was done offline is sent, and what was paid is resolved. */}
      <OfflineTray />
      {/* V-98: the home-screen widget's token, in the native app only. */}
      <WidgetBridge />
      {children}
    </AppShell>
  );
}
