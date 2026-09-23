import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { AppShell } from "@/components/app/AppShell";
import type { Side } from "@/lib/side.constants";

/**
 * The platform sweep's harness frame for the home group (worker
 * "sweep-home"). The routes it stands in for need a session and this box has
 * none, so the real screen components are handed fixture props inside the
 * real app shell, signed in. It proves the look before and after the sweep,
 * never the wiring.
 */
export async function SweepFrame({
  side = "property",
  route,
  children,
}: {
  side?: Side;
  route: string;
  children: React.ReactNode;
}) {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  return (
    <AppShell
      t={t}
      side={side}
      userName="Seyi Omojuni"
      userHandle="seyifunmi"
      unreadNotifications={0}
      avatarUrl=""
      signedIn
      isAgent={false}
      isAdmin={false}
      preview={{ route }}
    >
      {children}
    </AppShell>
  );
}
