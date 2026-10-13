import type { Dictionary } from "@vallo/i18n/core";

/**
 * The landing hero's words, as data: the slogan's set lines and the sub
 * (founder directive D1). Pure and free of JSX, so `headline-coupling.test.ts`
 * can hold the brand hierarchy in the unit project without rendering the
 * client tree `Hero.tsx` pulls in.
 *
 * The slogan is broken after its first comma ("Space," / "without the
 * runaround."), the second line taking the brand blue as the old headline's
 * did. That is a typesetting decision about one English line, which D1 keeps
 * English in every locale, not a translation. A slogan without a comma is set
 * on one line rather than broken somewhere arbitrary.
 *
 * The positioning line is never returned: D1 rules it is never the primary
 * consumer line, and the hero is the most primary consumer line there is.
 */
export function heroCopy(t: Dictionary): { lines: [string] | [string, string]; subtitle: string } {
  const slogan = t.landing.slogan.trim();
  const cut = slogan.indexOf(", ");
  const lines: [string] | [string, string] =
    cut > 0 ? [slogan.slice(0, cut + 1), slogan.slice(cut + 2)] : [slogan];
  return { lines, subtitle: t.landing.explanation };
}
