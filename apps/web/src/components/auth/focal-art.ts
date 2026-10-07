import type { TieredObjectName } from "@/design-system/icons/object-assets";

/**
 * THE OBJECT ACROSS THE EDGE OF THE ISLAND (the founder, 30 September: each
 * door puts one of his objects across the curve; W11, 6 October: the same
 * object, now one of the two-tier set of D29 instead of the glass 3D pack, so
 * it survives a light ground and matches every other object on the platform).
 *
 * Which object a door shows is decided here, by the path, so the auth layout
 * (drawn once) and the success moment agree, with a test to hold it:
 *
 *   sign in with a password             key-cushion     a key on its cushion: back in
 *   sign up                             scene-house-keys  a home and its keys (Tier A, hero scale)
 *   the email code, check your inbox,
 *   forgot password                     envelope
 *   phone sign in                       chat-pair       a message with a code in it
 *   a new password                      padlock
 *   finishing the account               passport-book   who you are, on Vallo
 *   the code accepted                   shield-tick     verified (`ArrivalMoment`)
 *
 * Tier B objects are symbols, so they are simple and matte; the one Tier A
 * scene is the only thing on these screens that shows a real place, and it
 * does so on the sign-up door, where the person is being offered one.
 */
export type FocalName = Extract<
  TieredObjectName,
  "key-cushion" | "scene-house-keys" | "envelope" | "chat-pair" | "padlock" | "passport-book" | "shield-tick"
>;

export type FocalArt = { name: FocalName; /** The edge, in CSS px, the object is drawn at. */ size: number };

/** The size an object is drawn at: scenes are wide compositions and need more room than a symbol. */
const SIZES: Readonly<Record<FocalName, number>> = {
  "key-cushion": 88,
  "scene-house-keys": 120,
  envelope: 88,
  "chat-pair": 88,
  padlock: 88,
  "passport-book": 88,
  "shield-tick": 160,
};

export function focalObject(name: FocalName): FocalArt {
  return { name, size: SIZES[name] };
}

function within(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`);
}

/** Which object a door shows, by its path. */
export function focalForPath(path: string): FocalArt {
  if (within(path, "/sign-in/phone")) return focalObject("chat-pair");
  if (
    within(path, "/sign-in/email") ||
    within(path, "/sign-in/code") ||
    within(path, "/sign-up/verify") ||
    within(path, "/sign-up/email") ||
    within(path, "/forgot-password")
  ) {
    return focalObject("envelope");
  }
  if (within(path, "/reset-password")) return focalObject("padlock");
  if (within(path, "/sign-up/finish")) return focalObject("passport-book");
  if (within(path, "/sign-up")) return focalObject("scene-house-keys");
  return focalObject("key-cushion");
}
