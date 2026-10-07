/**
 * THE GROUND UNDER AN AUTH SCREEN (W11, 6 October 2026; reference 7044, "quiet
 * and photographic", and the north star's "one Island per screen on a
 * photographic ground").
 *
 * Every door into Vallo stands on one picture, in the bowl at the top of the
 * screen, with the member's form in one Island below it. WHICH picture is
 * decided here, by the path, so the auth layout (drawn once and kept across
 * every step) and any later screen agree, and so the choice is a pure
 * function with its own test.
 *
 * THE FAMILY OF GROUNDS, and why each screen has the one it has:
 *
 *   tower   sign in. A lit residential tower at dusk: somebody coming back to
 *           somewhere they know. The calmest of the photographs, which is what
 *           reference 7044 does for a returning member.
 *   villa   sign up and finishing the account. A house with its lights on and
 *           the gate open: the home being offered. Warmer than the tower.
 *   water   the code steps. A skyline across still water: nothing to look at,
 *           which is right for a screen whose whole job is to be waited on
 *           and typed into.
 *   wave    forgot password and the new password. No photograph at all, only
 *           the brand's own blue ground: a recovery is not the moment for a
 *           picture of somebody's house.
 *
 * THESE ARE PHOTOGRAPHS OF PLACES, never of a listing and never claimed as
 * inventory (`docs/IMAGERY.md`, rule 3): they are the landing page's own
 * ambience set in `public/brand/photos`, used as a ground and nothing else.
 * They are decorative and `aria-hidden`; the screen's title names the place.
 */
export type GroundName = "tower" | "villa" | "water" | "wave";

export type Ground = {
  name: GroundName;
  /** Under `public/`; the 1.4 to 1.7 megapixel originals, resized by next/image. */
  src: string;
  /** `object-position`, so the part of a landscape picture that carries the screen survives a portrait crop. */
  position: string;
};

export const GROUNDS: Readonly<Record<GroundName, Ground>> = {
  tower: { name: "tower", src: "/brand/photos/tower-entrance-dusk.jpg", position: "72% 50%" },
  villa: { name: "villa", src: "/brand/photos/villa-exterior-sunset.jpg", position: "52% 42%" },
  water: { name: "water", src: "/brand/photos/skyline-waterfront-dusk.jpg", position: "62% 50%" },
  wave: { name: "wave", src: "/brand/photos/bg-blue-wave.jpg", position: "50% 50%" },
};

function within(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`);
}

/** Which ground a door stands on, by its path. Anything unknown stands on the tower. */
export function groundForPath(path: string): Ground {
  if (within(path, "/forgot-password") && !within(path, "/forgot-password/code")) return GROUNDS.wave;
  if (within(path, "/reset-password")) return GROUNDS.wave;
  if (
    within(path, "/sign-up/verify") ||
    within(path, "/sign-in/code") ||
    within(path, "/sign-in/phone") ||
    within(path, "/forgot-password/code")
  ) {
    return GROUNDS.water;
  }
  if (within(path, "/sign-up")) return GROUNDS.villa;
  return GROUNDS.tower;
}
