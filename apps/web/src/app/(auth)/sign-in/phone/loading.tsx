import { getDictionary } from "@vallo/i18n";
import { forAuth } from "@/components/auth/auth-copy";
import { AuthWait } from "@/components/auth/AuthWait";
import { CodeSignInForm } from "@/components/auth/CodeSignInForm";
import { getLocale } from "@/lib/locale";

/** The wait, on the phone sign-in: this screen itself, inert, so nothing moves when it arrives (`AuthWait`). */
export default async function LoadingSignInPhone() {
  return (
    <AuthWait>
      <CodeSignInForm mode="phone" t={forAuth(getDictionary(await getLocale()))} />
    </AuthWait>
  );
}
