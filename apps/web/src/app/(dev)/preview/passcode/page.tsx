/* Screenshot harness for the passcode screens (docs/PASSCODE.md): the real
   lock and setup components with fixture props, so they can be drawn in a
   sandbox with no session. `?s=lock`, `lock4`, `setup`, `reset`,
   `lock-photo` (a stand-in picture in the ring, not a member's),
   `password-only`, `unavailable` or `passkey` (the Face ID or fingerprint key
   bottom left of the keypad). Closed outside development by the
   preview layout's own guard. */
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { PasscodeLock } from "@/components/passcode/PasscodeLock";
import { PasscodeSetup } from "@/components/passcode/PasscodeSetup";
import { fixtureWrongCode } from "./fixture";

export default async function Page({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const { s = "lock" } = await searchParams;
  const locale = await getLocale();
  const copy = getDictionary(locale).passcode;
  if (s === "setup" || s === "reset") {
    return <PasscodeSetup copy={copy} locale={locale} mode={s === "setup" ? "first" : "reset"} name="Ada" overlay />;
  }
  return (
    <PasscodeLock
      copy={copy}
      locale={locale}
      mode={s === "password-only" ? "password-only" : s === "unavailable" ? "unavailable" : "code"}
      length={s === "lock4" ? 4 : 6}
      name="Ada Okafor"
      avatarUrl={s === "lock-photo" ? "/brand/session-b/roles/price-agency-person-256.png" : null}
      verify={fixtureWrongCode}
      passkey={s === "passkey"}
    />
  );
}
