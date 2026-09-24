import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { FIRST_RUN_COOKIE } from "@/components/app/welcome/first-run-seen";
import { signInFirstRunRedirect } from "./first-run-gate";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { resolveProviderStates } from "@/lib/auth/providers";
import { requestSurface } from "@/lib/auth/surface";
import { AuthChoices } from "@/components/auth/AuthChoices";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

/**
 * Notices the auth callback can send here. A link that has expired or been
 * used already is the common case and deserves a plain sentence, not a silent
 * return to an empty form where the person cannot tell what went wrong.
 *
 * They land on the chooser rather than the form because every one of them is
 * about getting in at all, not about the email route specifically.
 */
/* The sentences are `authFlow.notices` in the dictionary, keyed by the
   notice name the callback and the middleware send. */

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  /* A device that has never met first run meets it now, and comes back here
     with everything it asked for (`first-run-gate.ts`, request W2). */
  const firstRun = signInFirstRunRedirect({
    cookie: (await cookies()).get(FIRST_RUN_COOKIE)?.value,
    params,
  });
  if (firstRun) redirect(firstRun);

  const locale = await getLocale();
  const t = getDictionary(locale);
  const notice = typeof params.notice === "string" ? params.notice : undefined;
  const next = typeof params.next === "string" ? params.next : undefined;
  /* The key comes from the URL, so only the table's own keys count
     (`?notice=constructor` must not reach the prototype). */
  const noticeText = notice && Object.hasOwn(t.authFlow.notices, notice) ? t.authFlow.notices[notice] : undefined;

  const surface = await requestSurface();
  return (
    <AuthChoices
      mode="sign-in"
      t={t}
      providers={await resolveProviderStates(surface)}
      surface={surface}
      notice={noticeText}
      next={next}
    />
  );
}
