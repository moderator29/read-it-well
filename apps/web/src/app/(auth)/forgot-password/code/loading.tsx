import { getDictionary } from "@vallo/i18n";
import { forAuth } from "@/components/auth/auth-copy";
import { AuthWait } from "@/components/auth/AuthWait";
import { ResetCodeForm } from "@/components/auth/ResetCodeForm";
import { chooserEmail, verifyPasswordResetCode } from "@/lib/auth/actions";
import { getLocale } from "@/lib/locale";

/** The wait, on the reset code: this screen itself, inert, so nothing moves when it arrives (`AuthWait`). */
export default async function LoadingResetCode() {
  return (
    <AuthWait>
      <ResetCodeForm
        t={forAuth(getDictionary(await getLocale()))}
        verify={verifyPasswordResetCode}
        initialEmail={await chooserEmail()}
      />
    </AuthWait>
  );
}
