import Link from "next/link";
import type { AltDoorsCopy } from "./auth-copy";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { phoneSignInEnabled } from "@/lib/auth/phone-sign-in-flag";
import { PasskeySignIn } from "./PasskeySignIn";

/**
 * A3 and A2: the other ways in, under the sign-in form. Quiet links that
 * leave the form itself untouched: "Email me a code instead" always, and
 * "Continue with phone number" and the passkey button only when their
 * switches are on.
 */
export function AltSignInDoors({ t, next, surface }: { t: AltDoorsCopy; next?: string; surface: string }) {
  const carry = next ? `?next=${encodeURIComponent(next)}` : "";
  return (
    <div className="nf-auth__links grid justify-items-center gap-xs" data-testid="alt-sign-in">
      <Link href={`/sign-in/code${carry}`} className="nf-tap nf-auth__aside">
        <UiIcon name="mail" size={16} />
        {t.publicDoors.emailCode.offer}
      </Link>
      {phoneSignInEnabled() && (
        <Link href={`/sign-in/phone${carry}`} className="nf-tap nf-auth__aside">
          <UiIcon name="phone" size={16} />
          {t.publicDoors.phone.offer}
        </Link>
      )}
      {surface === "web" && <PasskeySignIn label={t.publicDoors.emailCode.passkey} next={next} failed={t.publicDoors.emailCode.failed} />}
    </div>
  );
}
