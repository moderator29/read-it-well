import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { resolveProviderStates } from "@/lib/auth/providers";
import { requestSurface } from "@/lib/auth/surface";
import { chooserEmail, signUpWithEmail } from "@/lib/auth/actions";
import { EmailAuthForm } from "@/components/auth/EmailAuthForm";
import { listStates } from "@/lib/places/queries";

export const metadata: Metadata = {
  title: "Create your account",
  robots: { index: false, follow: false },
};

/**
 * The sign-up form itself, in two steps on one page (the Slate pass, 29
 * September): the account first, with Google and Apple as round doors under
 * it, then everything else. It was a chooser that sent the email route on to
 * `/sign-up/email`; the two-step form keeps the providers on the first step,
 * so the chooser hop is gone. `/sign-up/email` still draws the same form for
 * the links and the action that point at it.
 *
 * IT CARRIES `next`, AND UNTIL 23 SEPTEMBER IT WAS THE ONE HOP THAT DROPPED IT.
 *
 * The chain a shared address travels is: `proxy.ts` bounces a stranger to
 * `/sign-in?next=/listing/abc`, `AuthChoices` rides `next` into
 * `/sign-in/email` or into the Google door, and `/auth/callback` lands them
 * back on the listing. `/sign-up` sat in that chain reading nothing, so a
 * person who pressed Create an account, or who was linked straight here,
 * reached the form with no destination and finished on `/home`.
 *
 * That was survivable while browsing was open, because almost nobody met a
 * sign-in wall. After item 8 EVERY shared listing, search and profile address
 * on this platform goes through this screen, so a dropped `next` is every
 * shared link on Vallo ending somewhere other than the thing that was shared.
 *
 * It is read and passed on, never trusted: `safeReturnPath` in `proxy.ts` is
 * what put the value in the URL, the form re-reads it into its own hidden
 * field, and the auth action validates it again before redirecting. A
 * `next` typed by hand into this address is checked at the same gate as one
 * the middleware wrote.
 */
export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;
  const locale = await getLocale();
  const t = getDictionary(locale);

  const surface = await requestSurface();
  const providers = await resolveProviderStates(surface);
  const ready = (id: "google" | "apple") => providers.some((p) => p.id === id && p.configured);
  return (
    <EmailAuthForm
      mode="sign-up"
      t={t}
      action={signUpWithEmail}
      states={await listStates()}
      next={next}
      initialEmail={await chooserEmail()}
      googleReady={ready("google")}
      appleReady={ready("apple")}
      surface={surface}
    />
  );
}
