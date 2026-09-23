import { getDictionary } from "@vallo/i18n";
import { AppShell } from "@/components/app/AppShell";

/**
 * Session B platform sweep, group "stays" (SWEEP.md Phase 2): the real stays,
 * stay detail, trips, restaurants, checkout and held-payment components on
 * fixture props, inside the real consumer chrome, so every before and after
 * proof in docs/design/proofs/session-b/sweep-stays can be re-shot. Every
 * route in the group needs a session, so this is the only way to draw them on
 * this box. Fixture-backed: the proof of the look, never of the wiring.
 */
export default function SweepStaysLayout({ children }: { children: React.ReactNode }) {
  const t = getDictionary("en");
  return (
    <AppShell t={t} side="property" userName="Seyi Omojuni" userHandle="seyifunmi" signedIn unreadNotifications={0}>
      {children}
    </AppShell>
  );
}
