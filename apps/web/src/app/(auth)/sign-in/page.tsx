import { Suspense } from "react";
import type { Metadata } from "next";
import type { Dictionary } from "@vallo/i18n/core";
import { publicPageMetadata } from "@/lib/i18n/public-metadata";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { FIRST_RUN_COOKIE } from "@/components/app/welcome/first-run-seen";
import { signInFirstRunRedirect } from "./first-run-gate";
import { getDictionary } from "@vallo/i18n";
import { forAuth } from "@/components/auth/auth-copy";
import { getLocale } from "@/lib/locale";
import { resolveProviderStates } from "@/lib/auth/providers";
import { requestSurface } from "@/lib/auth/surface";
import { chooserEmail, signInWithEmail, signUpMethodForEmail } from "@/lib/auth/actions";
import type { EmailStatus } from "@/lib/auth/form-state";
import { EmailAuthForm } from "@/components/auth/EmailAuthForm";
import { AltSignInDoors } from "@/components/auth/AltSignInDoors";
import { emailFromQuery } from "@/components/auth/auth-intent";
import { arrivalOf } from "@/app/welcome/plan";
import { wallHeading } from "@/components/app/welcome/wall-heading";
import { AuthWait, waitDoors } from "@/components/auth/AuthWait";

/* A10: the title and description in the page's own language, with its
   canonical and hreflang (lib/i18n/public-metadata.ts; words in publicMeta). */
export async function generateMetadata(): Promise<Metadata> {
  return publicPageMetadata("signIn", { robots: { index: false, follow: false } });
}

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

type Params = Record<string, string | string[] | undefined>;

/*
 * THE NOTICE, read from the URL the same way by the screen and by its wait,
 * so the wait is the same height as the screen (`AuthWait`).
 */
function noticeFor(params: Params, t: Dictionary): string | undefined {
  const notice = typeof params.notice === "string" ? params.notice : undefined;
  const next = typeof params.next === "string" ? params.next : undefined;
  /* THE WALL NAMES WHAT THEY ASKED FOR (V-18), here as well as on first
     run. A device that has already seen first run comes straight to this
     screen from the wall, and "Sign in to open that" said nothing about what
     "that" was. The same pure heading first run uses names it. */
  const arrival = notice === "sign-in-required" && next ? arrivalOf(next) : null;
  const wall = arrival ? wallHeading(arrival.reason, t.shape.wall) : null;
  /* The key comes from the URL, so only the table's own keys count
     (`?notice=constructor` must not reach the prototype). */
  return wall
    ? `${wall.titleA} ${wall.titleB}. ${wall.body}`
    : notice && Object.hasOwn(t.authFlow.notices, notice)
      ? t.authFlow.notices[notice]
      : undefined;
}

/*
 * THE FIRST 400MS (U1). The screen waits on a network read (whether Apple
 * is switched on), so it streams; while it does, the wait draws this same
 * screen, inert (`AuthWait`), rather than a skeleton of another shape. This
 * Suspense replaces the segment's `loading.tsx`, which also wrapped
 * /sign-in/code and /sign-in/phone and was the first thing painted there.
 */
export default function SignInPage({ searchParams }: { searchParams: Promise<Params> }) {
  return (
    <Suspense fallback={<SignInWait searchParams={searchParams} />}>
      <SignInScreen searchParams={searchParams} />
    </Suspense>
  );
}

async function SignInWait({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  /* A first run on its way draws nothing rather than a screen it is about
     to leave. */
  if (signInFirstRunRedirect({ cookie: (await cookies()).get(FIRST_RUN_COOKIE)?.value, params })) return null;
  const t = getDictionary(await getLocale());
  const next = typeof params.next === "string" ? params.next : undefined;
  const doors = await waitDoors();
  return (
    <AuthWait>
      <EmailAuthForm
        mode="sign-in"
        t={forAuth(t)}
        action={signInWithEmail}
        next={next}
        initialEmail={emailFromQuery(params.email) || (await chooserEmail())}
        googleReady={doors.googleReady}
        surface={doors.surface}
        notice={noticeFor(params, t)}
        emailReady={doors.emailReady}
      />
      <AltSignInDoors t={forAuth(t)} next={next} surface={doors.surface} />
    </AuthWait>
  );
}

async function SignInScreen({ searchParams }: { searchParams: Promise<Params> }) {
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
  const next = typeof params.next === "string" ? params.next : undefined;
  const noticeText = noticeFor(params, t);
  /*
   * B-1: ONE SCREEN, EMAIL AND PASSWORD TOGETHER (refs 12 and 14). This used
   * to draw an email-only chooser and send the address on to
   * `/sign-in/email` for the password; that route now forwards here.
   *
   * What the split was protecting is kept. The one action is still
   * `signInWithEmail` (per-connection and per-address limits, the neutral
   * "do not match" refusal, `next` re-checked on the server). An address that
   * arrives already filled in (`?email=` on a link, or the old chooser's
   * cookie) is looked up exactly as the second step did, and "none" draws
   * the ordinary password step, so the screen never says whether an account
   * exists (F-08); only a clear "google" changes what is drawn.
   */
  const surface = await requestSurface();
  const providers = await resolveProviderStates(surface);
  const configured = (id: "email" | "google" | "apple") =>
    providers.some((p) => p.id === id && p.configured);
  const address = emailFromQuery(params.email) || (await chooserEmail());

  let accountMethod: EmailStatus = "unknown";
  if (address) {
    try {
      const method = await signUpMethodForEmail(address);
      accountMethod = method === "none" ? "unknown" : method;
    } catch {
      accountMethod = "unknown";
    }
  }

  return (
    <>
      <EmailAuthForm
        mode="sign-in"
        t={forAuth(t)}
        action={signInWithEmail}
        next={next}
        initialEmail={address}
        accountMethod={accountMethod}
        googleReady={configured("google") && surface === "web"}
        appleReady={configured("apple") && surface !== "android-native"}
        surface={surface}
        notice={noticeText}
        emailReady={configured("email")}
      />
      {/* A3 and A2: the code-by-email door, and phone and passkey when switched on. */}
      <AltSignInDoors t={forAuth(t)} next={next} surface={surface} />
    </>
  );
}
