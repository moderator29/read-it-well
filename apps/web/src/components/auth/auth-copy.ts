import type { Dictionary } from "@vallo/i18n/core";

/**
 * THE SLICES OF THE DICTIONARY THE AUTH SCREENS READ.
 *
 * The auth pages used to hand the WHOLE dictionary to their client forms
 * (`t={t}`). A prop passed from a server component to a client component is
 * serialised into the RSC payload, so every sign-in and sign-up document
 * carried all four hundred and forty kilobytes of it: the sign-in flight
 * measured 480KB raw and 133.5KB gzipped, against 10 to 28KB on the other
 * routes (W13). The forms read a dozen small namespaces between them.
 *
 * Each type below is a `Pick` of exactly what a screen reads, and the forms are
 * typed with it, so the compiler proves nothing is missing: reading
 * `t.something.else` inside a form is a type error until its namespace is added
 * here on purpose. A full `Dictionary` is still assignable to every slice, so a
 * harness that has the whole thing in hand can keep passing it. The server pages
 * call `forAuth(t)` (or `forWelcome(t)`) and pass only the slice, and `forAuth`
 * is written key by key so a namespace cannot ride along by accident.
 *
 * No words change: every string is the dictionary's own.
 */

/** What the password and name fields read (`fields.tsx`). */
export type FieldsCopy = Pick<Dictionary, "signUp">;

/** The age and terms acceptance (`AcceptTerms`). */
export type TermsCopy = Pick<Dictionary, "safety">;

/** The social doors (`SocialDoors`). */
export type SocialCopy = Pick<Dictionary, "auth">;

/** The arrival moment after a verified sign-up (`ArrivalMoment`). */
export type ArrivalCopy = Pick<Dictionary, "authFlow">;

/** The other-ways links under the sign-in form (`AltSignInDoors`). */
export type AltDoorsCopy = { publicDoors: Pick<Dictionary["publicDoors"], "emailCode" | "phone"> };

/** Everything the sign-in, sign-up, code, reset and finish forms read between them. */
export type AuthCopy = Pick<
  Dictionary,
  "auth" | "authFlow" | "common" | "signUp" | "safety" | "experienceEntry"
> &
  AltDoorsCopy & {
    welcomeCards: Pick<Dictionary["welcomeCards"], "label">;
  };

export function forAuth(t: Dictionary): AuthCopy {
  return {
    auth: t.auth,
    authFlow: t.authFlow,
    common: t.common,
    signUp: t.signUp,
    safety: t.safety,
    experienceEntry: t.experienceEntry,
    publicDoors: { emailCode: t.publicDoors.emailCode, phone: t.publicDoors.phone },
    welcomeCards: { label: t.welcomeCards.label },
  };
}

/** What the welcome intro reads (`WelcomeIntro`). */
export type WelcomeCopy = {
  welcomeCards: Pick<Dictionary["welcomeCards"], "intro">;
  landing: Pick<Dictionary["landing"], "slogan" | "explanation">;
  auth: Pick<Dictionary["auth"], "termsNotice">;
  safety: Pick<Dictionary["safety"], "termsLink" | "privacyLink">;
};

export function forWelcome(t: Dictionary): WelcomeCopy {
  return {
    welcomeCards: { intro: t.welcomeCards.intro },
    landing: { slogan: t.landing.slogan, explanation: t.landing.explanation },
    auth: { termsNotice: t.auth.termsNotice },
    safety: { termsLink: t.safety.termsLink, privacyLink: t.safety.privacyLink },
  };
}
