import { getDictionary } from "@vallo/i18n";
import { AppShell } from "@/components/app/AppShell";
import { PERSON } from "../../_fixtures/people";

/**
 * Wallet harness: the real wallet and send
 * components on fixture props, inside the real consumer chrome, so every
 * proof in docs/design/proofs/session-b/wallet and /send can be re-shot and
 * re-swept. Fixture-backed: never the proof of the wiring, only of the look.
 */
export default function WalletHarnessLayout({ children }: { children: React.ReactNode }) {
  const t = getDictionary("en");
  return (
    <AppShell t={t} side="property" userName={PERSON.name} signedIn unreadNotifications={2}>
      {children}
    </AppShell>
  );
}
