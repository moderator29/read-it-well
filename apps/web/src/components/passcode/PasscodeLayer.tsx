import type { ReactNode } from "react";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { getShellIdentity } from "@/lib/app/shell-queries";
import { resolvePasscodeGate } from "@/lib/passcode/state";
import { PasscodeGate } from "./PasscodeGate";

/**
 * `PasscodeGate` for a layout that has not already resolved the dictionary
 * and the member's name: the workspace consoles (`/agent`, `/host`,
 * `/admin`), where the lock is one wrapping element so the console's own
 * frame is left alone. The identity read is memoised per request, so a layout
 * that reads it too pays nothing twice. docs/PASSCODE.md.
 */
export async function PasscodeLayer({ children }: { children: ReactNode }) {
  /* SPEED-3: start the gate's own read (`passcode_status`) now, beside the
     identity read, instead of after it. It is memoised per request, so the
     gate below awaits this same promise; its failure is still the gate's to
     answer, which is why nothing here waits on it or swallows it for the gate. */
  void resolvePasscodeGate().catch(() => undefined);
  const [locale, identity] = await Promise.all([getLocale(), getShellIdentity()]);
  return (
    <PasscodeGate
      t={getDictionary(locale)}
      locale={locale}
      name={identity.signedIn && identity.userName !== "Guest" ? identity.userName : ""}
      avatarUrl={identity.avatarUrl}
    >
      {children}
    </PasscodeGate>
  );
}
