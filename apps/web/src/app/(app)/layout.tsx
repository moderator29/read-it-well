import { getDictionary, type Locale } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { getShellIdentity } from "@/lib/app/shell-queries";
import { AppShell } from "@/components/app/AppShell";

/**
 * Personal Mode layout.
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
  const { userName, unreadNotifications, avatarUrl, signedIn, isAgent, isAdmin } =
    await getShellIdentity();

  return (
    <AppShell
      t={t}
      locale={locale}
      userName={userName}
      unreadNotifications={unreadNotifications}
      avatarUrl={avatarUrl}
      signedIn={signedIn}
      isAgent={isAgent}
      isAdmin={isAdmin}
    >
      {children}
    </AppShell>
  );
}
