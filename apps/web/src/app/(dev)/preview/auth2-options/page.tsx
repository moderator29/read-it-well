/* TEMPORARY screenshot harness: the sign-up options page with Google and
   Apple switched on, which this sandbox's auth project lacks. Deleted after
   the screenshots. */
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { AuthCurveBlock } from "@/components/auth/slate";
import { SignUpOptions } from "@/components/auth/SignUpOptions";
import { BackButton } from "@/components/site/BackButton";

export default async function Page() {
  const t = getDictionary(await getLocale());
  return (
    <main id="main" className="nf-auth nf-slate">
      <AuthCurveBlock
        brandLabel={t.a11y.logoHome}
        wordmark={t.auth.wordmark}
        start={<BackButton fallback="/welcome" className="nf-auth__back-btn" />}
        line={t.auth.heroSignUp}
      />
      <div className="nf-auth__body">
        <SignUpOptions t={t} googleReady appleReady />
      </div>
      <p className="nf-auth__legal">{t.auth.termsNotice}</p>
    </main>
  );
}
