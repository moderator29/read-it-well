import { getDictionary, type Locale } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { AppShell } from "@/components/app/AppShell";

/**
 * Personal Mode layout.
 *
 * Wraps every consumer route in `AppShell` so the rail and tab bar are present
 * on all of them, not just home. This is a route group, so it adds the chrome
 * without changing any URL. Locale and dictionary are resolved once here and
 * handed down; the active destination is worked out inside the shell from the
 * current path.
 */
/* Neutral demo identity until real sessions land; reads correctly both in the
   greeting ("Welcome back, Guest") and on the rail identity card. */
const PLACEHOLDER_NAME = "Guest";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);

  return (
    <AppShell t={t} locale={locale} userName={PLACEHOLDER_NAME}>
      {children}
    </AppShell>
  );
}
