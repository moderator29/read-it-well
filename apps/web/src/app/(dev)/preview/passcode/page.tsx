/* Screenshot harness for the passcode screens (docs/PASSCODE.md): the real
   lock and setup components with fixture props, so they can be drawn in a
   sandbox with no session. `?s=lock`, `lock4`, `setup`, `reset`,
   `password-only` or `unavailable`. Closed outside development by the
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
      verify={fixtureWrongCode}
    />
  );
}
