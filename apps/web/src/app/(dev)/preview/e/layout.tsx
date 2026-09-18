import { getDictionary } from "@vallo/i18n";
import { AppShell } from "@/components/app/AppShell";
import { PERSON } from "../_fixtures/people";

/**
 * Worker E's preview pages, inside the real consumer chrome with the
 * fixture identity, so a screenshot carries the header and the dock the
 * governing renders show around every money surface. The chrome is the
 * lead's component, rendered as the app layout renders it; nothing here
 * changes it.
 */
export default function PreviewELayout({ children }: { children: React.ReactNode }) {
  const t = getDictionary("en");
  return (
    <AppShell t={t} side="property" userName={PERSON.name} signedIn unreadNotifications={2}>
      {children}
    </AppShell>
  );
}
