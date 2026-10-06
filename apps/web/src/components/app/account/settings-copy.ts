import type { Dictionary } from "@vallo/i18n/core";

/**
 * THE SLICES OF THE DICTIONARY THE SETTINGS SCREENS READ.
 *
 * A settings page handed `t` (the whole dictionary) to each client card, and a
 * prop from a server component to a client component is serialised into the
 * page's payload: about 440KB of every surface's words for a card that reads a
 * single object (W13 measured the auth pages at 480KB for the same reason;
 * `components/auth/auth-copy.ts` is the same pattern).
 *
 * Each type is a `Pick` of what one component (and the children it hands `t`
 * to) reads, and the component is typed with it, so reading anything else is a
 * compile error until it is added here on purpose. A full `Dictionary` is still
 * assignable to every slice, so `/agent/settings` and the harnesses that hold
 * the whole dictionary keep passing it. The `for...` functions the pages call
 * are written key by key. No word changes.
 */

type S = Dictionary["settings"];

/** `settings.<key>` and nothing else of `settings`. */
export type SettingsOf<K extends keyof S> = { settings: Pick<S, K> };

function settingsOf<K extends keyof S>(t: Dictionary, ...keys: K[]): SettingsOf<K> {
  const picked = {} as Pick<S, K>;
  for (const key of keys) picked[key] = t.settings[key];
  return { settings: picked };
}

/* ------------------------------------------------------------ the hub */

/** `/settings` (`SettingsHub`, `LogOutRow`). */
export type HubCopy = SettingsOf<"hub" | "appearance" | "notifications" | "language" | "about"> & {
  socialProfile: Pick<Dictionary["socialProfile"], "verified" | "verifiedTitle">;
  platform: Pick<Dictionary["platform"], "lite">;
  publicDoors: { invite: Pick<Dictionary["publicDoors"]["invite"], "rowTitle" | "rowSub"> };
  passcode: Pick<Dictionary["passcode"], "settingsRow" | "settingsRowSub">;
  paymentsPage: Pick<Dictionary["paymentsPage"], "settingsRow" | "settingsRowSub">;
};

export function forHub(t: Dictionary): HubCopy {
  return {
    ...settingsOf(t, "hub", "appearance", "notifications", "language", "about"),
    socialProfile: { verified: t.socialProfile.verified, verifiedTitle: t.socialProfile.verifiedTitle },
    platform: { lite: t.platform.lite },
    publicDoors: { invite: { rowTitle: t.publicDoors.invite.rowTitle, rowSub: t.publicDoors.invite.rowSub } },
    passcode: { settingsRow: t.passcode.settingsRow, settingsRowSub: t.passcode.settingsRowSub },
    paymentsPage: { settingsRow: t.paymentsPage.settingsRow, settingsRowSub: t.paymentsPage.settingsRowSub },
  };
}

/* ------------------------------------------------------- the account */

/** `/settings/account`: `AccountSection` and the delete panel it opens. */
export type AccountCopy = SettingsOf<"account" | "delete"> & {
  paymentsPage: Pick<Dictionary["paymentsPage"], "settingsRow" | "settingsRowSub">;
  common: Pick<Dictionary["common"], "signIn" | "signOut" | "continue">;
};

export function forAccount(t: Dictionary): AccountCopy {
  return {
    ...settingsOf(t, "account", "delete"),
    paymentsPage: { settingsRow: t.paymentsPage.settingsRow, settingsRowSub: t.paymentsPage.settingsRowSub },
    common: { signIn: t.common.signIn, signOut: t.common.signOut, continue: t.common.continue },
  };
}

/* ------------------------------------------------ the toggle cards */

/** The notification channels (`AccountNotificationsCard`). */
export type NotifyToggleCopy = SettingsOf<"account" | "notify" | "notifications">;
export const forNotifyToggles = (t: Dictionary): NotifyToggleCopy => settingsOf(t, "account", "notify", "notifications");

/** The privacy toggles (`AccountPrivacyCard`). */
export type PrivacyToggleCopy = SettingsOf<"account" | "notify" | "privacy"> & {
  shape: {
    profile: Pick<
      Dictionary["shape"]["profile"],
      "showOccupation" | "showOccupationSub" | "showHomeTown" | "showHomeTownSub"
    >;
  };
};
export function forPrivacyToggles(t: Dictionary): PrivacyToggleCopy {
  const p = t.shape.profile;
  return {
    ...settingsOf(t, "account", "notify", "privacy"),
    shape: {
      profile: {
        showOccupation: p.showOccupation,
        showOccupationSub: p.showOccupationSub,
        showHomeTown: p.showHomeTown,
        showHomeTownSub: p.showHomeTownSub,
      },
    },
  };
}

/* ------------------------------------------------------ the groups */

export type AppearanceCopy = SettingsOf<"appearance"> & { memberKit: Pick<Dictionary["memberKit"], "contrast"> };
export function forAppearance(t: Dictionary): AppearanceCopy {
  return { ...settingsOf(t, "appearance"), memberKit: { contrast: t.memberKit.contrast } };
}

/** Motion settings read the appearance words only. */
export type MotionCopy = SettingsOf<"appearance">;
export const forMotion = (t: Dictionary): MotionCopy => settingsOf(t, "appearance");

export type LanguageCopy = SettingsOf<"language">;
export const forLanguage = (t: Dictionary): LanguageCopy => settingsOf(t, "language");

export type NotificationsCardCopy = SettingsOf<"notifications">;
export const forNotificationsCard = (t: Dictionary): NotificationsCardCopy => settingsOf(t, "notifications");

export type PrivacyCardCopy = SettingsOf<"privacy">;
export const forPrivacyCard = (t: Dictionary): PrivacyCardCopy => settingsOf(t, "privacy");

export type SearchCardCopy = SettingsOf<"search">;
export const forSearchCard = (t: Dictionary): SearchCardCopy => settingsOf(t, "search");

export type SecurityCardCopy = SettingsOf<"security">;
export const forSecurityCard = (t: Dictionary): SecurityCardCopy => settingsOf(t, "security");

export type DataCardCopy = SettingsOf<"data">;
export const forDataCard = (t: Dictionary): DataCardCopy => settingsOf(t, "data");

export type AiConsentCopy = SettingsOf<"aiConsent">;
export const forAiConsent = (t: Dictionary): AiConsentCopy => settingsOf(t, "aiConsent");

export type AddressMoveCopy = SettingsOf<"addressMove">;
export const forAddressMove = (t: Dictionary): AddressMoveCopy => settingsOf(t, "addressMove");
