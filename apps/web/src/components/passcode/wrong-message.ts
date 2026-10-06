import { plural, type Dictionary, type Locale } from "@vallo/i18n/core";
import { ATTEMPTS_PER_COOLDOWN } from "@/lib/passcode/rules";

type Copy = Dictionary["passcode"];

/**
 * What a wrong code says, quietly, beneath the dots. MOTION_SYSTEM.md
 * section 6: never "a count of remaining attempts shown before the final one".
 *
 * It used to print the count on every wrong try ("4 more tries before a short
 * pause"), which turns a typo into a countdown and makes the most repeated
 * screen in the product feel like a warning. Now a wrong code says only that
 * it was wrong, until the count is the last one: exactly one try left before
 * the short pause, or exactly one before the sign-out (which is named, and
 * wins, because it is the heavier consequence). Those two are the moments the
 * number changes what somebody does next, so those are the moments it shows.
 *
 * Pure, for the test; the lock and the change-passcode step both read it.
 */
export function wrongCodeMessage(
  attempt: { beforeCooldown: number; beforeSignOut: number },
  copy: Copy,
  locale: Locale,
): string {
  if (attempt.beforeSignOut === 1) return plural(1, copy.wrongLastBeforeSignOut, locale);
  if (attempt.beforeCooldown === 1 && attempt.beforeSignOut > ATTEMPTS_PER_COOLDOWN) {
    return plural(1, copy.wrongLeft, locale);
  }
  return copy.wrong;
}
