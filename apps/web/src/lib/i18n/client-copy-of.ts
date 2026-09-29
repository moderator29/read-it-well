import type { Dictionary } from "@vallo/i18n/core";

/** The auth screens' lines that client code draws. */
const AUTH_FLOW_KEYS = [
  "appleFailed",
  "appleUnfinished",
  "backHome",
  "errorBody",
  "errorTitle",
  "reference",
  "tryAgain",
  "alreadyConfirmed",
  "codeStillWorks",
  "enterCodeInstead",
  "expiredLink",
  "invalidLink",
  "linkFailedTitle",
  "providerOff",
  "signInWithEmail",
  "signInWithYourEmail",
  "unconfigured",
  "noScriptSignIn",
  "noScriptSignUp",
  "signingInBody",
  "signingInTitle",
  "verifyingBody",
  "verifyingTitle",
] as const;

/**
 * What the root layout hands to client code through `ClientCopyProvider`
 * (`client-copy.tsx` says why). Kept to the words the client components on
 * the main routes actually read, because every page carries a copy (about
 * 7 KB; `core-entry.test.ts` holds it under 12):
 *
 *   common                     the back button, the page header
 *   a11y                       accessible names (the gallery)
 *   platform.outbox            the offline tray, save, the composer, viewings
 *   platform.inflight          the offline tray
 *   trustVisible.state         the in-app error screen
 *   trustVisible.report        the report sheet
 *   counts, reserve            the listing page's booking bar and panel
 *   uiCommon.around, .inbox    a post's place line, the inbox tabs
 *   authFlow (the keys below)  Apple sign-in, the auth error, the verify screens
 *   catalogue.card             the listing gallery's empty frame
 *   frontDoor.share            the listing page's share control
 *   offPlatform                the sheet before a link leaves Vallo
 *   socialProfile.accountPage  the profile's hero and rows
 *   success (chrome, and the   the success sheet's own words, and only the
 *   moments below)             moments whose components have no server
 *                              parent to hand them copy: the account moments
 *                              the root layout's host shows, a report, a
 *                              support ticket and an inspection request. Every
 *                              other moment's words come from its page, so the
 *                              ~5 KB of them are not carried by every screen.
 *
 * A server-side function, not part of the client module, so the root layout
 * can call it.
 */
export type ClientCopy = {
  common: Dictionary["common"];
  a11y: Dictionary["a11y"];
  platform: Pick<Dictionary["platform"], "outbox" | "inflight">;
  trustVisible: Pick<Dictionary["trustVisible"], "state" | "report">;
  counts: Dictionary["counts"];
  reserve: Dictionary["reserve"];
  uiCommon: Pick<Dictionary["uiCommon"], "around" | "inbox">;
  authFlow: Pick<Dictionary["authFlow"], (typeof AUTH_FLOW_KEYS)[number]>;
  catalogue: Pick<Dictionary["catalogue"], "card">;
  frontDoor: Pick<Dictionary["frontDoor"], "share">;
  offPlatform: Dictionary["offPlatform"];
  socialProfile: Pick<Dictionary["socialProfile"], "accountPage">;
  success: Pick<Dictionary["success"], "continue" | "close" | "detail"> & {
    moments: Pick<Dictionary["success"]["moments"], (typeof SLICED_MOMENTS)[number]>;
  };
};

/** The success moments carried on every screen. Keep this list short. */
const SLICED_MOMENTS = [
  "accountCreated",
  "emailVerified",
  "passwordChanged",
  "passcodeSet",
  "passcodeChanged",
  "inspectionRequested",
  "reportFiled",
  "ticketFiled",
  "contactSent",
] as const;

export function clientCopyOf(t: Dictionary): ClientCopy {
  return {
    common: t.common,
    a11y: t.a11y,
    platform: { outbox: t.platform.outbox, inflight: t.platform.inflight },
    trustVisible: {
      state: t.trustVisible.state,
      report: t.trustVisible.report,
    },
    counts: t.counts,
    reserve: t.reserve,
    uiCommon: { around: t.uiCommon.around, inbox: t.uiCommon.inbox },
    authFlow: Object.fromEntries(
      AUTH_FLOW_KEYS.map((key) => [key, t.authFlow[key]])
    ) as ClientCopy["authFlow"],
    catalogue: { card: t.catalogue.card },
    frontDoor: { share: t.frontDoor.share },
    offPlatform: t.offPlatform,
    socialProfile: { accountPage: t.socialProfile.accountPage },
    success: {
      continue: t.success.continue,
      close: t.success.close,
      detail: t.success.detail,
      moments: Object.fromEntries(
        SLICED_MOMENTS.map((key) => [key, t.success.moments[key]])
      ) as ClientCopy["success"]["moments"],
    },
  };
}
