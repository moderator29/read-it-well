import { getDictionary } from "@vallo/i18n";
import { forAuth } from "@/components/auth/auth-copy";
import { AuthWait, waitDoors } from "@/components/auth/AuthWait";
import { EmailAuthForm } from "@/components/auth/EmailAuthForm";
import { signUpWithEmail } from "@/lib/auth/actions";
import { getLocale } from "@/lib/locale";

/**
 * The wait, on the sign-up form: this form itself, inert, so nothing moves
 * when it arrives (`AuthWait`). The address a link carried is the page's to
 * fill; an empty field is the same size.
 */
export default async function LoadingSignUpEmail() {
  const doors = await waitDoors();
  return (
    <AuthWait>
      <EmailAuthForm
        mode="sign-up"
        t={forAuth(getDictionary(await getLocale()))}
        action={signUpWithEmail}
        googleReady={doors.googleReady}
        surface={doors.surface}
      />
    </AuthWait>
  );
}
