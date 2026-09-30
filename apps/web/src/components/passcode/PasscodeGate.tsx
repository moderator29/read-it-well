import type { ReactNode } from "react";
import type { Dictionary, Locale } from "@vallo/i18n";
import { resolvePasscodeGate } from "@/lib/passcode/state";
import { passkeyUnlockOffered } from "@/lib/passcode/passkey-unlock";
import { PasscodeGuard } from "./PasscodeGuard";
import { PasscodeLock } from "./PasscodeLock";
import { PasscodeSetup } from "./PasscodeSetup";

/**
 * THE GATE, IN THE (app) LAYOUT. docs/PASSCODE.md.
 *
 * Signed out (the open catalogue, if the founder's switch is on): the page,
 * untouched. Signed in: the page only when the session is unlocked; the lock
 * or the setup screen otherwise, drawn INSTEAD of the page so nothing of it
 * reaches the browser. The auth pages and the public site are other layouts
 * and are never locked.
 *
 * It never falls through to the page on a failure. An unreadable passcode
 * shows the lock with "Use your password instead", and only a fresh full
 * sign-in or a valid unlock cookie lets the member in
 * (`lib/passcode/decide.ts`).
 */
export async function PasscodeGate({
  t,
  locale,
  name,
  avatarUrl,
  children,
}: {
  t: Dictionary;
  locale: Locale;
  name: string;
  avatarUrl: string;
  children: ReactNode;
}) {
  const { view } = await resolvePasscodeGate();
  const copy = t.passcode;
  /* C14: one read of whether this member holds a platform key; only asked
     when a lock can be drawn. A failed read is "no", which leaves the code. */
  const passkey = view.kind === "unlocked" || view.kind === "locked" ? await passkeyUnlockOffered().catch(() => false) : false;

  switch (view.kind) {
    case "open":
      return <>{children}</>;
    case "unlocked":
      return (
        <PasscodeGuard
          copy={copy}
          locale={locale}
          length={view.length}
          mint={view.mint}
          name={name}
          avatarUrl={avatarUrl}
          passkey={passkey}
        >
          {children}
        </PasscodeGuard>
      );
    case "setup":
      return <PasscodeSetup copy={copy} locale={locale} mode={view.mode} name={name} avatarUrl={avatarUrl} overlay />;
    case "locked":
      return (
        <PasscodeLock
          copy={copy}
          locale={locale}
          mode={view.mode}
          length={view.length}
          lockedUntil={view.lockedUntil}
          name={name}
          avatarUrl={avatarUrl}
          passkey={passkey && view.mode === "code"}
        />
      );
  }
}
