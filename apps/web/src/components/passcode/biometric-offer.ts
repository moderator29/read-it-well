/**
 * WHETHER TO OFFER FACE ID OR FINGERPRINT RIGHT AFTER A NEW PASSCODE IS SET
 * (7 October 2026, the founder: "set and build Face ID to work").
 *
 * The biometric is the WebAuthn platform key the money lock enrols
 * (`money_credentials`, Settings, Privacy, Money lock); the passcode lock
 * accepts the same key, verified on the server (`lib/passcode/passkey-unlock.ts`).
 * Nothing here unlocks anything: it only decides whether to show the one
 * offer, and the offer only links to the enrolment, which asks for the
 * password as it always has.
 *
 * Offered ONCE per device, only on a device whose browser or app can ask the
 * phone's own lock, and never to a member who already holds a key.
 */
export const BIO_OFFER_KEY = "vallo.bio-offer";

/** Where the enrolment lives (the money lock's own page). */
export const BIO_ENROL_HREF = "/settings/privacy/money-lock";

export function shouldOfferBiometric(input: {
  /** The member already holds a platform key. */
  enrolled: boolean;
  /** This device can ask its own lock (`platformLockAvailable()`). */
  supported: boolean;
  /** The offer was already shown on this device. */
  seen: boolean;
}): boolean {
  return !input.enrolled && input.supported && !input.seen;
}

/** Read the seen flag; a refused storage reads as seen, so nobody is nagged. */
export function readBioOfferSeen(): boolean {
  try {
    return window.localStorage.getItem(BIO_OFFER_KEY) === "seen";
  } catch {
    return true;
  }
}

export function markBioOfferSeen(): void {
  try {
    window.localStorage.setItem(BIO_OFFER_KEY, "seen");
  } catch {
    /* Storage refused: the read above already treats this device as seen. */
  }
}
