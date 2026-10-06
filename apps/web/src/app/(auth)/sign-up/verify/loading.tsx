import { getDictionary } from "@vallo/i18n";
import { forAuth } from "@/components/auth/auth-copy";
import { AuthWait } from "@/components/auth/AuthWait";
import { VerifyCodeForm } from "@/components/auth/VerifyCodeForm";
import { pendingSignUpEmail, resendSignUpCode, verifySignUpCode } from "@/lib/auth/actions";
import { getLocale } from "@/lib/locale";

/**
 * The wait, on the code screen: this screen itself, inert, with the address
 * the code went to already in its sentence (the same cookie the page reads),
 * so nothing moves when it arrives (`AuthWait`).
 */
export default async function LoadingVerify() {
  return (
    <AuthWait>
      <VerifyCodeForm
        t={forAuth(getDictionary(await getLocale()))}
        verify={verifySignUpCode}
        resend={resendSignUpCode}
        email={await pendingSignUpEmail()}
      />
    </AuthWait>
  );
}
