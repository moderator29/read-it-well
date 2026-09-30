/**
 * THE OBJECT IN THE RING (the founder, 30 September: sign in, sign up, the
 * code steps, welcome back and the passcode "3D, smart and beautiful", in
 * the language of the passcode sample). Each door puts one of his 3D clay
 * objects in the glowing glass ring across the blue bowl
 * (`AuthCurveBlock`'s `focal`); which one is decided here, by the path, so
 * the auth layout (drawn once) and the passcode screens agree.
 *
 *   the email code, check your inbox, forgot password   envelope
 *   phone sign-in                                       phone-code
 *   the passcode (set, reset; welcome back without a photo)  passcode-lock
 *   a new password                                      shield
 *   sign up                                             rent (house and key)
 *   finishing the account                               id-check
 *   success (the code accepted)                         verified
 *   sign in with a password                             the Vallo mark
 *
 * A NEW OBJECT SHOWS ONLY ONCE ITS FILE EXISTS. The files are sliced into
 * `public/brand/3d/<name>@2x.webp` by `scripts/brand-3d.mjs`; until a name
 * is `true` in `FOCAL_READY` its screen shows the Vallo mark, so a half-
 * delivered set never draws a broken image. `focal-art.test.ts` fails if a
 * name is switched on while its file is missing.
 */
export const FOCAL_READY = {
  envelope: false,
  "phone-code": false,
  "passcode-lock": false,
  shield: true,
  verified: true,
  "id-check": true,
  rent: true,
} as const satisfies Record<string, boolean>;

export type FocalName = keyof typeof FOCAL_READY;
export type FocalArt = { kind: "mark" } | { kind: "object"; name: FocalName; src: string };

export function focalSrc(name: FocalName): string {
  return `/brand/3d/${name}@2x.webp`;
}

/** The object for a name, or the Vallo mark while its file is not in. */
export function focalObject(
  name: FocalName,
  ready: Readonly<Record<FocalName, boolean>> = FOCAL_READY,
): FocalArt {
  return ready[name] ? { kind: "object", name, src: focalSrc(name) } : { kind: "mark" };
}

/** Which object a door shows, by its path. */
export function focalForPath(
  path: string,
  ready: Readonly<Record<FocalName, boolean>> = FOCAL_READY,
): FocalArt {
  const is = (prefix: string) => path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`);
  if (is("/sign-in/phone")) return focalObject("phone-code", ready);
  if (is("/sign-in/email") || is("/sign-in/code") || is("/sign-up/verify") || is("/sign-up/email") || is("/forgot-password")) {
    return focalObject("envelope", ready);
  }
  if (is("/reset-password")) return focalObject("shield", ready);
  if (is("/sign-up/finish")) return focalObject("id-check", ready);
  if (is("/sign-up")) return focalObject("rent", ready);
  return { kind: "mark" };
}
