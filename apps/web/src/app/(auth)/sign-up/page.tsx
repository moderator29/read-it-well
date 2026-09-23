import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { getProviderStates } from "@/lib/auth/providers";
import { AuthChoices } from "@/components/auth/AuthChoices";

export const metadata: Metadata = {
  title: "Create your account",
  robots: { index: false, follow: false },
};

/**
 * The three ways in, and nothing else.
 *
 * The form used to unroll here in place, which left the Google and Apple rows
 * stranded below nine fields. It now lives at `/sign-up/email`, so this page
 * stays one screen and the states it needs are read there rather than on every
 * visit to the chooser.
 *
 * IT CARRIES `next`, AND UNTIL 23 SEPTEMBER IT WAS THE ONE HOP THAT DROPPED IT.
 *
 * The chain a shared address travels is: `proxy.ts` bounces a stranger to
 * `/sign-in?next=/listing/abc`, `AuthChoices` rides `next` into
 * `/sign-in/email` or into the Google door, and `/auth/callback` lands them
 * back on the listing. `/sign-up` sat in that chain reading nothing, so a
 * person who pressed Create an account, or who was linked straight here,
 * reached `/sign-up/email` with no destination and finished on `/home`.
 *
 * That was survivable while browsing was open, because almost nobody met a
 * sign-in wall. After item 8 EVERY shared listing, search and profile address
 * on this platform goes through this screen, so a dropped `next` is every
 * shared link on Vallo ending somewhere other than the thing that was shared.
 *
 * It is read and passed on, never trusted: `safeReturnPath` in `proxy.ts` is
 * what put the value in the URL, `/sign-up/email` re-reads it into its own
 * hidden field, and the auth action validates it again before redirecting. A
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

  return <AuthChoices mode="sign-up" t={t} providers={getProviderStates()} next={next} />;
}
