/**
 * THE WORD A PERSON READS FOR A POWER OR WATER ENUM MEMBER.
 *
 * ---------------------------------------------------------------------------
 * IT LIVES IN `lib` RATHER THAN BESIDE THE PANEL THAT USES IT, ON PURPOSE.
 *
 * `vitest.config.ts` aliases `react` at its react-server entry, and its own
 * header says every module in the suite is a server module and nothing in it
 * renders a component. A `.tsx` therefore cannot be imported by a test at all:
 * it fails to resolve `react/jsx-dev-runtime` before a single assertion runs.
 * So the part that can be WRONG IN SILENCE is a plain module here, and the
 * component is left with layout.
 *
 * ---------------------------------------------------------------------------
 * AND IT CAN BE WRONG IN SILENCE. IT ALREADY WAS.
 *
 * The first version lower-cased the first part of the value, so `BAND_A`
 * became `gridbandA` rather than `gridBandA` and every one of the three enum
 * lookups returned null. The panel still rendered: the heading, the basis line
 * and the two boolean cells were all present, and the three facts that are the
 * entire reason the panel exists were simply absent. Nothing threw, nothing
 * logged, the page answered 200 with a perfectly plausible body.
 *
 * It was found by fetching the rendered HTML from a real `next start` and
 * grepping for "Band A". A status code is not a render proof, and neither is a
 * page that looks right to somebody who did not already know what was meant to
 * be on it.
 */

/** Every member of the three enums, read off the live schema on 22 September 2026. */
export const POWER_GRID_VALUES = ["BAND_A", "MOSTLY_ON", "PATCHY", "RARELY", "NONE"] as const;
export const POWER_BACKUP_VALUES = [
  "NONE",
  "GENERATOR",
  "INVERTER",
  "SOLAR",
  "GENERATOR_INVERTER",
] as const;
export const WATER_SUPPLY_VALUES = [
  "TREATED_MAINS",
  "BOREHOLE",
  "PUMPED_STORAGE",
  "TANKER",
  "NONE",
] as const;

/**
 * `("BAND_A", "grid")` becomes `gridBandA`. EVERY part is capitalised, because
 * the whole value follows a prefix.
 *
 * Returns null for a member nobody has written a word for, rather than the
 * key. A raw enum member on a screen is the database talking to a person.
 */
export function factLabel(
  value: string | null,
  prefix: string,
  copy: Record<string, string>,
): string | null {
  if (value === null) return null;
  const key = `${prefix}${value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("")}`;
  return copy[key] ?? null;
}
