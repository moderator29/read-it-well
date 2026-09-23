import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { FIRST_RUN_COOKIE } from "@/components/app/welcome/first-run-seen";
import { signInFirstRunRedirect } from "./first-run-gate";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { getProviderStates } from "@/lib/auth/providers";
import { AuthChoices } from "@/components/auth/AuthChoices";
import { arrivalOf } from "@/app/welcome/plan";
import { wallHeading } from "@/components/app/welcome/wall-heading";

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
const NOTICES: Record<string, string> = {
  "link-expired":
    "That link has expired or was already used. Sign in below, or ask for a new link.",
  "link-invalid": "That link was incomplete. Sign in below and it will work as normal.",
  unconfigured: "We cannot reach accounts right now. Nothing you typed was lost.",
  "signed-out": "You are signed out. Sign in whenever you are ready.",
  /*
   * Sent by the middleware when somebody reaches a product address without a
   * session. It names the reason rather than dropping them on a bare form,
   * because arriving at a sign-in screen you did not ask for is confusing
   * enough to read as a bug.
   */
  "sign-in-required": "Sign in to open that. It takes a moment, and new accounts are free.",
};

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
  /* THE WALL NAMES WHAT THEY ASKED FOR (V-18), here as well as on first
     run. A device that has already seen first run comes straight to this
     screen from the wall, and "Sign in to open that" said nothing about what
     "that" was. The same pure heading first run uses names it. */
  const arrival = notice === "sign-in-required" && next ? arrivalOf(next) : null;
  const wall = arrival ? wallHeading(arrival.reason, t.shape.wall) : null;
  const noticeText = wall
    ? `${wall.titleA} ${wall.titleB}. ${wall.body}`
    : notice
      ? NOTICES[notice]
      : undefined;

  return (
    <AuthChoices
      mode="sign-in"
      t={t}
      providers={getProviderStates()}
      notice={noticeText}
      next={next}
    />
  );
}
