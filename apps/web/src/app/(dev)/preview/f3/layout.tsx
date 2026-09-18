import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { AppShell } from "@/components/app/AppShell";

/**
 * F3's pages render inside the real app shell so the header, the gutter and
 * the dock are the ones the product has. Signed in, so the gated controls
 * draw the way an account sees them (the harness proves the look, never the
 * ONE LAW); the surfaces inside carry fixture props.
 */
export default async function F3PreviewLayout({ children }: { children: React.ReactNode }) {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  return (
    <AppShell
      t={t}
      side="property"
      userName="Seyi Omojuni"
      userHandle="seyifunmi"
      unreadNotifications={0}
      avatarUrl=""
      signedIn
      isAgent={false}
      isAdmin={false}
    >
      {children}
    </AppShell>
  );
}
