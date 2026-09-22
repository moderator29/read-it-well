import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { getShellIdentity } from "@/lib/app/shell-queries";
import { getSide } from "@/lib/side";
import { resolveWorkspaces } from "@/lib/supply/workspaces-queries";
import { AppShell } from "@/components/app/AppShell";

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
      {children}
    </AppShell>
  );
}
