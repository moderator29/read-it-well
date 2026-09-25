/**
 * THE STAYS SET-UP, AS `GOVERNING-10` AND `GOVERNING-11` DRAW IT.
 *
 * Six panels were drawn and none of them existed: "Your hotel" and "Rates" on
 * `GOVERNING-10`, "Your place" and "House rules and cancellation" on the
 * shortlet half of `GOVERNING-11`, "Your restaurant" and "Tables and hours" on
 * its restaurant half. What a host actually met was one generic property step
 * and one generic rooms step, both of them a stack of labelled boxes.
 *
 * THIS FILE IS THE PART OF THOSE PANELS THAT IS NOT A PICTURE: the three place
 * types a shortlet can be, the four house rules the render toggles, the meal
 * plans a rate can carry, the four table sizes, the sitting durations, the
 * cuisines offered as chips. It is pure and it is client-safe, so the step
 * bodies and the server actions read the same list and neither can drift.
 *
 * WHY THE LISTS ARE HERE AND NOT INLINE IN THE STEP. Every one of them is also
 * a thing the database has an opinion about: the place type is a
 * `room_category`, the meal plan is a `meal_plan`, the covers are a
 * `service_windows.covers`. A list typed into a component is a list nothing can
 * check against the schema, and this build has already paid for one of those
 * (`AMENITY_CHOICES` offered three amenities the `amenities` table never had,
 * and every host who ticked one saved nothing and was told nothing).
 */

import type { BrandIconName } from "@/design-system/icons/BrandIcon";
import type { UiIconName } from "@/design-system/icons/UiIcon";
import { countOf } from "@vallo/i18n/core";

/* --------------------------------------------------------- the two branches */

/**
 * WHICH SET OF DRAWN SCREENS A STAYS HOST GETS, re-exported from the file that
 * defines it.
 *
 * `stepsFor` in `onboarding.ts` has to know the branch to build the step list,
 * and this file has to know `BusinessKind`, which `onboarding.ts` owns. A value
 * import in both directions is a module cycle, so the decision lives there and
 * is read from here, which is the file every drawn screen already reads.
 */
export { branchFor, type StaysBranch } from "./onboarding";

/* ------------------------------------------------- the shortlet's place type */

/**
 * The three tiles of `GOVERNING-11` screen one, and the one thing on these two
 * images that the database cannot yet hold.
 *
 * `room_category` is `single | double | twin | suite | family | dorm`. None of
 * those is an entire flat and none of them is a whole house, so a shortlet host
 * has until now had to answer a hotel's question about a place that is not a
 * hotel room. `supabase/migrations/20260922190000_imgc_a_shortlet_is_not_a_hotel_room.sql`
 * adds the three values, additively, and `scripts/probes/stays_place_type.sql`
 * proves them. THE MIGRATION HAS NOT BEEN APPLIED: the project is INACTIVE and
 * every call to it from this box times out. `placeTypeUnavailable` below is how
 * the interface finds that out and says it in words rather than guessing at a
 * category that would be wrong.
 */
export type PlaceTypeId = "entire_flat" | "whole_house" | "private_room";

export type PlaceType = {
  id: PlaceTypeId;
  /** The tile's word, as drawn. */
  title: string;
  /** What a guest gets, so nobody has to guess between the first two. */
  meaning: string;
  mark: BrandIconName;
};

export const PLACE_TYPES: readonly PlaceType[] = [
  {
    id: "entire_flat",
    title: "Entire flat",
    meaning: "A self-contained flat, the whole of it, and the guest is the only party in it.",
    mark: "apartment-block",
  },
  {
    id: "whole_house",
    title: "Whole house",
    meaning: "A house with its own door and its own compound.",
    mark: "modern-house",
  },
  {
    id: "private_room",
    /*
     * THE RENDER DRAWS A CAR HERE AND IT IS THE ONE THING ON THESE FOUR IMAGES
     * THAT IS NOT FOLLOWED. `GOVERNING-11` screen one puts a vehicle-and-sofa
     * glyph on the "Private room" tile, between a building for a flat and a
     * house for a house. A car does not mean a private room in any reading, and
     * the shape law's sibling principle applies: where the render is plainly a
     * slip rather than a decision, the meaning wins. Everything else on the
     * tile, its size, radius, fill, lit rim, tick badge and type, is the render.
     */
    title: "Private room",
    meaning: "One room in a place you or somebody else also lives in.",
    mark: "hotel-room",
  },
] as const;

export function placeTypeFrom(value: string | null | undefined): PlaceType | null {
  return PLACE_TYPES.find((type) => type.id === value) ?? null;
}

/**
 * Whether a refusal from the database is the missing enum rather than a fault.
 *
 * Postgres answers an unknown enum label with `22P02`, "invalid input value for
 * enum room_category". Reading that specific code is the difference between
 * telling a host "that could not be saved" and telling whoever runs this estate
 * exactly which migration has not been applied. Anything else is a real fault
 * and is NOT swallowed here.
 */
export function placeTypeUnavailable(code: string | null | undefined): boolean {
  return code === "22P02";
}

/* ----------------------------------------------------- what is slept in */

/**
 * THE BED KIND A SHORTLET SCREEN CAN HONESTLY CLAIM, WHICH IS NONE.
 *
 * `room_types.beds` is a jsonb ARRAY of `{kind, count}`, enforced by
 * `room_types_beds_check` and typed as `BedSpec[]` in `lib/stays/types.ts`.
 * `GOVERNING-11` screen one asks for a NUMBER of beds and never for their
 * kinds, so the only entry this screen may write is one whose kind states that
 * nobody has said: `unspecified`.
 *
 * IT IS THE ABSENCE OF A FACT, NAMED, AND NOT AN INVENTED ONE. Writing
 * `{"kind": "double"}` because most beds are double would be a claim about
 * somebody's flat that nobody made. A reader meeting `unspecified` should
 * print the count alone, "3 beds", which is exactly what the host told us.
 *
 * THIS SCREEN SHIPPED WRITING AN OBJECT INTO THAT COLUMN and would have met
 * `23514` on the first real save. See
 * `20260922200000_imgc_a_bedroom_is_not_a_bed.sql` for the whole fault.
 */
export const SHORTLET_BED_KIND = "unspecified";

export type BedEntry = { kind: string; count: number };

/** The array a bed count becomes. None is an empty array, never a zero entry. */
export function bedsArray(count: number): BedEntry[] {
  return count > 0 ? [{ kind: SHORTLET_BED_KIND, count }] : [];
}

/**
 * How many beds a saved unit records, read out of jsonb defensively.
 *
 * The column is an array by constraint, and nothing constrains what is IN the
 * array: the schema's own comment says the entries are "validated in the app"
 * and no schema in this repository validates them. So every entry is checked
 * here, anything unreadable is skipped rather than thrown on, and a row
 * written by a seed, by hand or by an older screen cannot take down the step
 * that would let somebody fix it.
 */
export function bedsTotal(value: unknown): number {
  if (!Array.isArray(value)) return 0;
  let total = 0;
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) continue;
    const count = (entry as Record<string, unknown>).count;
    if (typeof count === "number" && Number.isInteger(count) && count > 0) total += count;
  }
  return total;
}

/* ---------------------------------------------------------- the house rules */

/**
 * The four toggles of `GOVERNING-11` screen two.
 *
 * They are stored as lines in `accommodations.house_rules`, which is the column
 * that already exists and already renders on the stay page, rather than as four
 * new booleans. A house rule is a sentence a guest reads, and the render's own
 * wording is that sentence: writing them as lines means the guest sees the
 * words the host chose and no screen has to translate a boolean back into
 * English at read time.
 */
export type HouseRuleId = "no_smoking" | "no_pets" | "no_parties" | "no_children";

export type HouseRule = {
  id: HouseRuleId;
  /** The toggle's label, as drawn. */
  label: string;
  /** The line written into the property's house rules when it is on. */
  line: string;
  /**
   * The small round glyph at the row's left.
   *
   * A FLAT MARK AND NOT A GLASS OBJECT, and the same mark on the three
   * prohibitions. `GOVERNING-11` screen two draws four crossed-out
   * pictograms: a cigarette, a paw, a party and a child. This icon set
   * contains none of the four, and drawing four DIFFERENT marks that each mean
   * something else would say four wrong things instead of one true one. The
   * crossed circle is what all three prohibitions actually are underneath, and
   * the fourth rule is about WHO rather than what, so it takes the person
   * mark. The word beside it is what carries the meaning either way.
   *
   * A cigarette, a paw and a party glyph are artwork, and the honest way to
   * get them is to draw them into the set rather than to approximate them
   * here. Raised in the ledger.
   */
  mark: UiIconName;
  /** On by default, as the render draws the first three lit and the last dark. */
  onByDefault: boolean;
};

export const HOUSE_RULES: readonly HouseRule[] = [
  {
    id: "no_smoking",
    label: "No smoking",
    line: "No smoking anywhere inside the property.",
    mark: "block",
    onByDefault: true,
  },
  {
    id: "no_pets",
    label: "No pets",
    line: "No pets.",
    mark: "block",
    onByDefault: true,
  },
  {
    id: "no_parties",
    label: "No parties",
    line: "No parties and no events.",
    mark: "block",
    onByDefault: true,
  },
  {
    id: "no_children",
    label: "No children under 12",
    line: "No children under 12.",
    mark: "user",
    onByDefault: false,
  },
] as const;

/** The lines the toggles compose, in the order the render lists them. */
export function houseRulesText(on: readonly HouseRuleId[]): string {
  return HOUSE_RULES.filter((rule) => on.includes(rule.id))
    .map((rule) => rule.line)
    .join("\n");
}

/**
 * Which toggles a saved property already has on, read back from its own text.
 *
 * Exact line matching rather than keyword sniffing: a host who typed their own
 * rules on the old generic step keeps every word of them, and only a line this
 * file itself wrote turns a toggle on. Anything else in the column is somebody's
 * own prose and is preserved by `mergeHouseRules`.
 */
export function houseRulesOn(text: string): HouseRuleId[] {
  const lines = new Set(
    text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
  );
  return HOUSE_RULES.filter((rule) => lines.has(rule.line)).map((rule) => rule.id);
}

/**
 * The property's house rules after the toggles have been set.
 *
 * Every line this file did not write is kept, in its original order, under the
 * toggled ones. A host who wrote "Generator runs from 7pm" on the old step and
 * then turned off "No pets" on the new one must not lose the generator.
 */
export function mergeHouseRules(existing: string, on: readonly HouseRuleId[]): string {
  const ours = new Set(HOUSE_RULES.map((rule) => rule.line));
  const theirs = existing
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !ours.has(line));
  return [houseRulesText(on), ...theirs].filter(Boolean).join("\n");
}

/* ----------------------------------------------------------- the meal plans */

/**
 * The rows of `GOVERNING-10` screen three: what a night includes, and what that
 * night costs. Exactly `public.meal_plan`, in the order a guest meets them.
 */
export type MealPlanId = "room_only" | "breakfast" | "half_board" | "full_board";

export type MealPlan = {
  id: MealPlanId;
  /** The row's label. The render writes "Bed and breakfast" for `breakfast`. */
  label: string;
  /** What the rate covers, for the host choosing between them. */
  meaning: string;
};

export const MEAL_PLANS: readonly MealPlan[] = [
  { id: "room_only", label: "Room only", meaning: "The night, and nothing else." },
  { id: "breakfast", label: "Bed and breakfast", meaning: "The night and breakfast." },
  { id: "half_board", label: "Half board", meaning: "The night, breakfast and one other meal." },
  { id: "full_board", label: "Full board", meaning: "The night and all three meals." },
] as const;

export function mealPlanLabel(id: string): string {
  return MEAL_PLANS.find((plan) => plan.id === id)?.label ?? id;
}

/* -------------------------------------------------------- the restaurant's */

/**
 * The cuisine chips of `GOVERNING-11` screen three, the render's six in the
 * render's order.
 *
 * `restaurant_profiles.cuisines` is a free text array, so this is an offer and
 * not a whitelist: a venue that is none of these can still say what it is. The
 * six are here so that six hosts who all serve Nigerian food write the same
 * word and the shelf can group them, which is the whole reason the column is an
 * array of labels rather than a sentence.
 */
export const CUISINES: readonly string[] = [
  "Nigerian",
  "Continental",
  "Seafood",
  "Italian",
  "Chinese",
  "Fast food",
] as const;

/**
 * The price band tiles, drawn as one to four naira marks.
 *
 * `restaurant_profiles.price_band` is an integer 1 to 4 and the marks ARE the
 * value: no band carries a price range, because this platform has never
 * measured what a band costs in any city and a printed range would be an
 * invented number. The band means what it means everywhere else it is drawn.
 */
export const PRICE_BANDS: readonly { value: number; marks: string; meaning: string }[] = [
  { value: 1, marks: "₦", meaning: "The cheapest of four bands." },
  { value: 2, marks: "₦₦", meaning: "The second of four bands." },
  { value: 3, marks: "₦₦₦", meaning: "The third of four bands." },
  { value: 4, marks: "₦₦₦₦", meaning: "The dearest of four bands." },
] as const;

/* ------------------------------------------------------ the tables and hours */

/**
 * The week, Monday first, as `GOVERNING-11` screen four lists it.
 *
 * `service_windows.weekday` is `0` for Sunday, which is what the database
 * stores and what `WEEKDAYS` in the wizard already assumes. The render starts
 * on Monday, so the ORDER is here and the NUMBER is unchanged: nothing about
 * the storage moves to suit a picture.
 */
export const WEEK_FROM_MONDAY: readonly { weekday: number; label: string }[] = [
  { weekday: 1, label: "Monday" },
  { weekday: 2, label: "Tuesday" },
  { weekday: 3, label: "Wednesday" },
  { weekday: 4, label: "Thursday" },
  { weekday: 5, label: "Friday" },
  { weekday: 6, label: "Saturday" },
  { weekday: 0, label: "Sunday" },
] as const;

/**
 * The four table sizes of the render's inventory panel.
 *
 * WHAT IS SAVED IS THE COVERS, AND THE PANEL SAYS SO. `service_windows.covers`
 * is the only seating number this database holds, and it is the number every
 * reservation is checked against. The four steppers are how that number is
 * ARRIVED AT, which is how a restaurateur actually counts a room, and the total
 * is printed under them so nobody has to trust an arithmetic they cannot see.
 * No breakdown is claimed to be stored, because none is.
 */
export const TABLE_SIZES: readonly { seats: number; label: string }[] = [
  { seats: 2, label: "Two seats" },
  { seats: 4, label: "Four seats" },
  { seats: 6, label: "Six seats" },
  { seats: 8, label: "Eight seats" },
] as const;

export type TableInventory = Record<number, number>;

/** The covers a room holds, from the tables in it. */
export function coversFrom(inventory: TableInventory): number {
  return TABLE_SIZES.reduce((total, size) => total + size.seats * (inventory[size.seats] ?? 0), 0);
}

/**
 * The sitting durations the render's select offers, in minutes.
 *
 * Minutes rather than a label, because the only honest use of this number is
 * arithmetic on a booking, and a string that says "1 hour" cannot be added to a
 * time. Nothing consumes it yet, which is stated where it is drawn.
 */
export const SITTING_DURATIONS: readonly { minutes: number; label: string }[] = [
  { minutes: 60, label: "1 hour" },
  { minutes: 90, label: "1 hour 30 minutes" },
  { minutes: 120, label: "2 hours" },
  { minutes: 180, label: "3 hours" },
] as const;

/* ------------------------------------------------------------------- times */

/**
 * A 24-hour `HH:MM`, as the columns store it, written the way the render draws
 * it. The render prints "2:00 PM" and "8:00 AM to 11:00 PM"; the column holds
 * `14:00`. One function, so no screen invents a second format.
 */
export function clockLabel(value: string): string {
  const match = /^(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return value;
  const hours = Number(match[1]);
  const minutes = match[2];
  const suffix = hours < 12 ? "AM" : "PM";
  const shown = hours % 12 === 0 ? 12 : hours % 12;
  return `${shown}:${minutes} ${suffix}`;
}

/**
 * HOW LONG BEFORE ARRIVAL A GUEST MAY STILL CANCEL, in the render's words.
 *
 * `cancellation_policies.is_free_until_hours` is a number of hours, and
 * `GOVERNING-10` screen three writes it as "2 days before arrival". 168 hours
 * is true and unreadable; seven days is the same fact in the unit a person
 * thinks in. Whole days only, because 36 hours is not "one and a half days" to
 * anybody booking a room, and the hours are then left as hours.
 */
export function noticeLabel(hours: number): string {
  if (hours > 0 && hours % 24 === 0) {
    const days = hours / 24;
    return countOf(days, "days");
  }
  return countOf(hours, "hours");
}

/** "8:00 AM to 11:00 PM", the render's row, with a word rather than a dash. */
export function windowLabel(opens: string, closes: string): string {
  return `${clockLabel(opens)} to ${clockLabel(closes)}`;
}

/**
 * THE TIMES A SERVICE MAY CLOSE AT, which is the half hours plus one.
 *
 * `GOVERNING-11` screen four draws Friday and Saturday closing at 12:00 AM,
 * and this database cannot hold that: `service_windows` carries a
 * `service_windows_order_chk` of `opens < closes`, and its own comment says "a
 * window stays inside one day". Midnight as a closing time is the NEXT day, so
 * it would be refused by the check.
 *
 * 23:59 is therefore the last option and it is offered honestly rather than
 * silently: a restaurant that serves until midnight closes at 11:59 PM on this
 * platform, the screen says so beside the control, and the alternative, which
 * is drawing a 12:00 AM that the database refuses on save, would be a control
 * that fails after the host has finished.
 */
export function closingTimes(): string[] {
  return [...halfHours(), "23:59"];
}

/** Every half hour of the day, for the check-in and check-out selects. */
export function halfHours(): string[] {
  const times: string[] = [];
  for (let hour = 0; hour < 24; hour += 1) {
    for (const minute of ["00", "30"]) {
      times.push(`${String(hour).padStart(2, "0")}:${minute}`);
    }
  }
  return times;
}
