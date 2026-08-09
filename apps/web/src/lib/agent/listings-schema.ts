import { z } from "zod";

import {
  BUILD_CONDITION_VALUES,
  FURNISHING_VALUES,
  LAND_TENURE_VALUES,
  LISTING_INTENT_VALUES,
  PERIOD_SUFFIX,
  RATE_PERIOD_VALUES,
  RENT_PERIOD_VALUES,
  SALE_STATUS_VALUES,
  type BuildCondition,
  type Furnishing,
  type LandTenure,
  type ListingIntent,
  type RatePeriod,
  type RentPeriod,
  type SaleStatus,
} from "../listings/pricing";

export type {
  BuildCondition,
  Furnishing,
  LandTenure,
  ListingIntent,
  RatePeriod,
  RentPeriod,
  SaleStatus,
} from "../listings/pricing";

/**
 * Agent listing input schemas and the canonical submit gate.
 *
 * Two audiences share this file, which is the whole point. The wizard imports
 * it in the browser to light up its checklist as the agent works, and the
 * server actions import it to decide what may actually enter the review queue.
 * One definition of "ready", so the checklist can never promise something the
 * server then refuses.
 *
 * Drafts are forgiving on purpose: a half-typed listing must always be
 * saveable, because a lost draft is a lost listing and a lost listing is lost
 * supply. Only the title is asked for to save. Everything else is asked for at
 * submit, where the quality gate lives (HYBRID_INVENTORY section 5).
 *
 * Money crosses the boundary exactly once, here: naira text in,
 * Math.round(naira * 100) integer kobo out. Nothing downstream ever sees a
 * float.
 *
 * THREE MARKETS, THREE MONEY SHAPES, and the wizard has to ask for exactly one
 * of them. `intent` is the first question and everything after it follows:
 *
 *   SALE      an asking price, the title being sold, and a sale status.
 *   TENANCY   a rent and its cycle, plus the fee breakdown a Nigerian tenant
 *             is actually quoted: caution, service charge, agency, legal,
 *             agreement, and the total to find at the door.
 *   SHORT STAY a rate per night, or per head for a restaurant table.
 *
 * Which of the two rent shapes applies is decided by the property type through
 * `isTenancy`, not by another question: a shop is let by the year and a
 * shortlet is let by the night, and asking somebody to confirm that is asking
 * them to restate what they already told us.
 */

/* ------------------------------------------------------------- constants */

/** Minimum photos before a listing may be submitted. */
export const MIN_PHOTOS = 4;
/** The database allows positions 0 to 9, so ten photos per listing. */
export const MAX_PHOTOS = 10;
/** Narrower than this and the photo blurs on a modern phone screen. */
export const MIN_PHOTO_WIDTH = 1600;
/** Words of description required before submit. */
export const MIN_DESCRIPTION_WORDS = 40;
/** Title bounds, applied after trimming and collapsing runs of spaces. */
export const MIN_TITLE_LENGTH = 8;
export const MAX_TITLE_LENGTH = 80;
/** A draft may be saved with a title this short; submit still needs eight. */
export const MIN_DRAFT_TITLE_LENGTH = 2;
/** One hundred million naira, in kobo. Above this is a typing accident. */
export const MAX_PRICE_KOBO = 100_000_000_00;

export const PHOTO_TOO_NARROW_MESSAGE =
  "Photos must be at least 1600px wide so they look sharp on every screen.";

/* -------------------------------------------------------- property types */

export type PropertyType =
  | "apartment"
  | "hotel"
  | "home"
  | "villa"
  | "shortlet"
  | "rental"
  | "shop"
  | "office"
  | "land"
  | "restaurant";

export const PROPERTY_TYPE_VALUES = [
  "apartment",
  "hotel",
  "home",
  "villa",
  "shortlet",
  "rental",
  "shop",
  "office",
  "land",
  "restaurant",
] as const satisfies readonly PropertyType[];

export const PROPERTY_TYPES: { value: PropertyType; label: string; blurb: string }[] = [
  { value: "apartment", label: "Apartment", blurb: "A self-contained flat let by the night." },
  { value: "shortlet", label: "Shortlet", blurb: "A furnished stay for a few nights or weeks." },
  { value: "home", label: "Home", blurb: "A whole house guests book by the night." },
  { value: "villa", label: "Villa", blurb: "A large private home with grounds." },
  { value: "hotel", label: "Hotel", blurb: "Rooms in a managed property." },
  {
    value: "rental",
    label: "Rental",
    blurb: "A home let on a yearly tenancy. Priced per year, inspected before payment.",
  },
  { value: "shop", label: "Shop", blurb: "Retail space let by the year." },
  { value: "office", label: "Office", blurb: "Workspace let by the year." },
  { value: "land", label: "Land", blurb: "A plot, priced per year of tenure." },
  /*
   * The one thing on this list nobody sleeps in.
   *
   * Discovery used to fill this category from a Google Places feed: a name, a
   * photo and a pin, with no verified badge, nobody to message and no way to
   * hold anybody a table. The feed is gone and this value is what a restaurant
   * is now, a place somebody here put up, with a message button and a
   * reservation this platform actually holds.
   *
   * Priced per head, which needs no new price period: `YEARLY` below does not
   * contain it, so it files as a nightly figure, and every reader of a
   * restaurant already treats that number as a head price by the rule stated in
   * lib/listings/types.ts.
   */
  {
    value: "restaurant",
    label: "Restaurant",
    blurb: "A place to eat, with tables guests reserve. Priced per head.",
  },
];

/**
 * The tenancy market: let by the year, agreed with the agent, inspected before
 * any money moves, and never reserved by the night. Rentals were the whole of
 * it until shops, offices and land arrived, and every one of those is let the
 * same way, so they take the same path rather than a second one that would
 * drift from it.
 */
const TENANCY: ReadonlySet<PropertyType> = new Set<PropertyType>([
  "rental",
  "shop",
  "office",
  "land",
]);

/** Priced per head rather than per night. One category, stated once. */
const PER_HEAD: ReadonlySet<PropertyType> = new Set<PropertyType>(["restaurant"]);

/** True when this category is let on a tenancy rather than by the night. */
export function isTenancy(type: PropertyType | null | undefined): boolean {
  return type ? TENANCY.has(type) : false;
}

/**
 * Retained under its old name because the agent workspace, the wizard and the
 * card model all call it, and the question it answers has not changed: is this
 * the yearly market or the nightly one.
 */
export function isRental(type: PropertyType | null | undefined): boolean {
  return isTenancy(type);
}

/** The rate cycle a short-stay category is quoted in. */
export function ratePeriodFor(type: PropertyType | null | undefined): RatePeriod {
  return type && PER_HEAD.has(type) ? "guest" : "night";
}

/** The words the UI puts after a price, per market and intent. */
export function priceSuffixFor(
  type: PropertyType | null | undefined,
  intent: ListingIntent = "rent",
): string {
  if (intent === "sale") return PERIOD_SUFFIX.sale;
  if (isTenancy(type)) return PERIOD_SUFFIX.year;
  return PERIOD_SUFFIX[ratePeriodFor(type)];
}

/**
 * Retained for the agent workspace and the wizard, which print "per year" or
 * "per night" beside a figure. A sale is not a period and is not answered here;
 * callers that can be looking at one call `priceSuffixFor` with the intent.
 */
export function pricePeriodLabel(type: PropertyType | null | undefined): string {
  return isTenancy(type) ? "per year" : "per night";
}

/* ------------------------------------------------------- intent and money */

export const LISTING_INTENT_CHOICES: {
  value: ListingIntent;
  label: string;
  blurb: string;
}[] = [
  { value: "rent", label: "To let", blurb: "Somebody pays to occupy it. Rent, or a nightly rate." },
  { value: "sale", label: "For sale", blurb: "Somebody buys it outright, with a title to transfer." },
];

export const RENT_PERIOD_CHOICES: { value: RentPeriod; label: string }[] = [
  { value: "year", label: "Per year" },
  { value: "quarter", label: "Per quarter" },
  { value: "month", label: "Per month" },
];

export const TENURE_CHOICES: { value: LandTenure; label: string; blurb: string }[] = [
  {
    value: "certificate_of_occupancy",
    label: "Certificate of Occupancy",
    blurb: "A C of O issued by the state. The strongest title on offer.",
  },
  {
    value: "governors_consent",
    label: "Governor's Consent",
    blurb: "A previously granted title, transferred with the governor's consent.",
  },
  {
    value: "deed_of_assignment",
    label: "Deed of Assignment",
    blurb: "The transfer document, without consent obtained yet.",
  },
  { value: "gazette", label: "Gazette", blurb: "Excised land recorded in the state gazette." },
  { value: "freehold", label: "Freehold", blurb: "Held outright, with no term." },
  { value: "leasehold", label: "Leasehold", blurb: "Held for a fixed term of years." },
];

export const SALE_STATUS_CHOICES: { value: SaleStatus; label: string }[] = [
  { value: "available", label: "Available" },
  { value: "under_offer", label: "Under offer" },
  { value: "sold", label: "Sold" },
];

export const FURNISHING_CHOICES: { value: Furnishing; label: string }[] = [
  { value: "unfurnished", label: "Unfurnished" },
  { value: "semi_furnished", label: "Semi furnished" },
  { value: "fully_furnished", label: "Fully furnished" },
];

export const CONDITION_CHOICES: { value: BuildCondition; label: string }[] = [
  { value: "newly_built", label: "Newly built" },
  { value: "renovated", label: "Renovated" },
  { value: "old", label: "Older build" },
  { value: "off_plan", label: "Off plan" },
];

/** A year built earlier than this is a typing accident, not a building. */
export const MIN_YEAR_BUILT = 1800;
/** Off plan is real, so a few years ahead of today is a legitimate answer. */
export const YEAR_BUILT_LOOKAHEAD = 5;
/** The tallest building in Nigeria has 30 floors. 200 leaves room for the world. */
export const MAX_FLOORS = 200;
/** Shortest tenancy anybody offers is a month; longest anybody quotes is a decade. */
export const MAX_TENANCY_MONTHS = 120;

/* --------------------------------------------------------------- states */

/**
 * The 37 seeded state codes (36 states plus the FCT). Held here so the gate
 * can run in the browser without a round trip; the select still renders the
 * names read from the states table, and the foreign key remains the authority.
 */
export const STATE_CODES = [
  "AB", "AD", "AK", "AN", "BA", "BY", "BE", "BO", "CR", "DE", "EB", "ED",
  "EK", "EN", "GO", "IM", "JI", "KD", "KN", "KT", "KE", "KO", "KW", "LA",
  "NA", "NI", "OG", "ON", "OS", "OY", "PL", "RI", "SO", "TA", "YO", "ZA",
  "FC",
] as const;

const STATE_CODE_SET = new Set<string>(STATE_CODES);

/* -------------------------------------------------- light, water, access */

/**
 * The three questions a Nigerian guest asks before the price.
 *
 * The amenity list already carried "Backup Power" and "Running Water" as tick
 * boxes, and a tick box cannot tell a Band A feeder apart from a generator
 * somebody runs from seven to eleven. Those two chips stay for now so nothing a
 * host has already ticked disappears, but the structured answers below are what
 * the listing page reads and what search will filter on, because four spellings
 * of borehole cannot be filtered at all.
 */
export const POWER_GRID_VALUES = ["BAND_A", "MOSTLY_ON", "PATCHY", "RARELY", "NONE"] as const;
export type PowerGrid = (typeof POWER_GRID_VALUES)[number];

export const POWER_GRID_CHOICES: { value: PowerGrid; label: string; blurb: string }[] = [
  { value: "BAND_A", label: "Band A", blurb: "20 hours a day or more from the grid" },
  { value: "MOSTLY_ON", label: "Mostly on", blurb: "Light most of the day, with gaps" },
  { value: "PATCHY", label: "Patchy", blurb: "On and off through the day" },
  { value: "RARELY", label: "Rarely on", blurb: "A few hours at best" },
  { value: "NONE", label: "No grid supply", blurb: "Nothing from the distribution company" },
];

export const POWER_BACKUP_VALUES = [
  "NONE",
  "GENERATOR",
  "INVERTER",
  "SOLAR",
  "GENERATOR_INVERTER",
] as const;
export type PowerBackup = (typeof POWER_BACKUP_VALUES)[number];

export const POWER_BACKUP_CHOICES: { value: PowerBackup; label: string }[] = [
  { value: "NONE", label: "No backup" },
  { value: "GENERATOR", label: "Generator" },
  { value: "INVERTER", label: "Inverter" },
  { value: "SOLAR", label: "Solar" },
  { value: "GENERATOR_INVERTER", label: "Generator and inverter" },
];

export const WATER_SUPPLY_VALUES = [
  "TREATED_MAINS",
  "BOREHOLE",
  "PUMPED_STORAGE",
  "TANKER",
  "NONE",
] as const;
export type WaterSupply = (typeof WATER_SUPPLY_VALUES)[number];

export const WATER_SUPPLY_CHOICES: { value: WaterSupply; label: string; blurb: string }[] = [
  { value: "TREATED_MAINS", label: "Treated mains", blurb: "Running water from the mains" },
  { value: "BOREHOLE", label: "Borehole", blurb: "The property's own borehole" },
  { value: "PUMPED_STORAGE", label: "Pumped storage", blurb: "Tank filled and pumped through" },
  { value: "TANKER", label: "Tanker delivery", blurb: "Water is bought in and stored" },
  { value: "NONE", label: "No running water", blurb: "Water is fetched" },
];

export const MAX_BACKUP_HOURS = 24;
export const MAX_ESTATE_NAME = 120;
export const MAX_GATE_DIRECTIONS = 600;
export const MAX_SECURITY_PHONE = 32;
export const MAX_ACCESS_CODE = 40;


/* ------------------------------------------------------------ amenities */

/** The 15 seeded amenity codes with their labels, for chips and validation. */
export const AMENITY_CHOICES: { code: string; label: string }[] = [
  { code: "wifi", label: "Free WiFi" },
  { code: "ac", label: "Air Conditioning" },
  { code: "tv", label: "TV" },
  { code: "kitchen", label: "Kitchen" },
  { code: "parking", label: "Parking" },
  { code: "pool", label: "Swimming Pool" },
  { code: "gym", label: "Gym" },
  { code: "security", label: "Security" },
  { code: "elevator", label: "Elevator" },
  { code: "furnished", label: "Furnished" },
  { code: "balcony", label: "Balcony" },
  { code: "garden", label: "Garden" },
  { code: "laundry", label: "Laundry" },
  { code: "generator", label: "Backup Power" },
  { code: "water", label: "Running Water" },
  { code: "shower", label: "Hot Shower" },
  { code: "breakfast", label: "Breakfast" },
  { code: "workspace", label: "Workspace" },
];

const AMENITY_CODE_SET = new Set(AMENITY_CHOICES.map((a) => a.code));

/* ------------------------------------------------------------- helpers */

/** Trim, then collapse every run of whitespace to a single space. */
export function collapseSpaces(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** Words in a body of text, whitespace separated, punctuation ignored. */
export function countWords(value: string | null | undefined): number {
  if (!value) return 0;
  const cleaned = value.replace(/[^\p{L}\p{N}'-]+/gu, " ").trim();
  return cleaned.length === 0 ? 0 : cleaned.split(/\s+/).length;
}

// Naira as typed: digits, optional thousands commas, at most two decimals.
const NAIRA_RE = /^\d{1,3}(,\d{3})*(\.\d{1,2})?$|^\d+(\.\d{1,2})?$/;

/**
 * Parse naira text to integer kobo. The only float in the money path, and it
 * is rounded away in the same expression. Returns null when the text is not a
 * well-formed naira amount.
 */
export function parseNairaToKobo(raw: string): number | null {
  const trimmed = raw.trim().replace(/^₦/, "").trim();
  if (trimmed.length === 0) return null;
  if (!NAIRA_RE.test(trimmed)) return null;
  const naira = Number(trimmed.replace(/,/g, ""));
  if (!Number.isFinite(naira) || naira < 0) return null;
  return Math.round(naira * 100);
}

/** Kobo back to the naira text an input should show when a draft is restored. */
export function koboToNairaInput(minor: number | null | undefined): string {
  if (!minor || minor <= 0) return "";
  const kobo = minor % 100;
  const naira = (minor - kobo) / 100;
  return kobo === 0 ? String(naira) : `${naira}.${String(kobo).padStart(2, "0")}`;
}

const emptyToUndefined = (value: unknown) =>
  value === "" || value === null ? undefined : value;

const optionalText = (max: number, tooLong: string) =>
  z.preprocess(
    emptyToUndefined,
    z.string().max(max, tooLong).transform(collapseSpaces).optional(),
  );

const optionalCount = (min: number, max: number, message: string) =>
  z.preprocess(
    (value) => {
      const cleared = emptyToUndefined(value);
      if (cleared === undefined) return undefined;
      return typeof cleared === "string" ? Number(cleared) : cleared;
    },
    z.number(message).int(message).min(min, message).max(max, message).optional(),
  );

const optionalNaira = (message: string) =>
  z.preprocess(
    emptyToUndefined,
    z
      .union([z.string(), z.number()])
      .optional()
      .transform((raw, ctx) => {
        if (raw === undefined) return undefined;
        const kobo = parseNairaToKobo(String(raw));
        if (kobo === null) {
          ctx.addIssue({ code: "custom", message });
          return z.NEVER;
        }
        if (kobo > MAX_PRICE_KOBO) {
          ctx.addIssue({
            code: "custom",
            message: "That amount looks too high. Check the figure and try again.",
          });
          return z.NEVER;
        }
        return kobo;
      }),
  );

/**
 * A positive decimal, for the one measurement on a listing that is not a whole
 * number. Land is sold in fractions of a square metre and rounding it to an
 * integer would misstate the plot, so `listings.size_sqm` is numeric and this
 * is the only field in the wizard that may carry a fraction. It is still not
 * money and never becomes money.
 */
const optionalDecimal = (message: string) =>
  z.preprocess(
    emptyToUndefined,
    z
      .union([z.string(), z.number()])
      .optional()
      .transform((raw, ctx) => {
        if (raw === undefined) return undefined;
        const value = Number(String(raw).replace(/,/g, "").trim());
        if (!Number.isFinite(value) || value <= 0 || value > 10_000_000) {
          ctx.addIssue({ code: "custom", message });
          return z.NEVER;
        }
        // Two decimal places is more precision than any survey plan states.
        return Math.round(value * 100) / 100;
      }),
  );

/** An ISO calendar date, the shape both `<input type="date">` and Postgres use. */
const optionalDate = (message: string) =>
  z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, message)
      .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), message)
      .optional(),
  );

const uuid = (message: string) => z.string().trim().uuid(message);

/* --------------------------------------------------------- draft schema */

/**
 * What the wizard sends on every autosave. Title carries the only hard
 * requirement, because a draft has to survive an agent who typed one line and
 * put the phone down.
 */
export const draftInputSchema = z.object({
  id: z.preprocess(emptyToUndefined, uuid("We could not identify that listing.").optional()),
  title: z
    .string("Give your listing a title so we can save it.")
    .transform(collapseSpaces)
    .pipe(
      z
        .string()
        .min(MIN_DRAFT_TITLE_LENGTH, "Give your listing a title so we can save it.")
        .max(MAX_TITLE_LENGTH, `Keep the title under ${MAX_TITLE_LENGTH} characters.`),
    ),
  description: optionalText(4000, "Keep the description under 4000 characters."),
  propertyType: z.preprocess(emptyToUndefined, z.enum(PROPERTY_TYPE_VALUES).optional()),
  stateCode: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .transform((value) => value.trim().toUpperCase())
      .refine((value) => STATE_CODE_SET.has(value), "Choose a state from the list.")
      .optional(),
  ),
  city: optionalText(80, "Keep the city under 80 characters."),
  area: optionalText(80, "Keep the area under 80 characters."),
  address: optionalText(200, "Keep the address under 200 characters."),
  landmark: optionalText(120, "Keep the landmark under 120 characters."),
  bedrooms: optionalCount(0, 20, "Bedrooms can be 0 to 20."),
  bathrooms: optionalCount(0, 20, "Bathrooms can be 0 to 20."),
  toilets: optionalCount(0, 20, "Toilets can be 0 to 20."),
  parkingSpaces: optionalCount(0, 50, "Parking spaces can be 0 to 50."),
  floor: optionalCount(-5, MAX_FLOORS, `The floor can be -5 to ${MAX_FLOORS}.`),
  totalFloors: optionalCount(1, MAX_FLOORS, `A building has 1 to ${MAX_FLOORS} floors.`),
  sizeSqm: optionalDecimal("Enter the size in square metres, for example 120."),

  /* ------------------------------------------------------------- intent
     The first question, and the one every money field below depends on. A
     draft may be saved without it, in which case the row keeps whatever it
     had, which is 'rent' by column default. */
  intent: z.preprocess(emptyToUndefined, z.enum(LISTING_INTENT_VALUES).optional()),

  /* ---------------------------------------------------------- to let, yearly
     A tenancy: the rent, its cycle, and everything else somebody has to find
     before the keys change hands. Every fee is optional because agents
     genuinely quote different subsets, and an unstated fee is rendered as
     unstated rather than as zero. */
  rentNaira: optionalNaira("Enter the rent in naira, for example 4,500,000."),
  rentPeriod: z.preprocess(emptyToUndefined, z.enum(RENT_PERIOD_VALUES).optional()),
  rentNegotiable: z.preprocess(emptyToUndefined, z.boolean().optional()),
  cautionDepositNaira: optionalNaira("Enter the caution deposit in naira."),
  serviceChargeNaira: optionalNaira("Enter the service charge in naira."),
  serviceChargePeriod: z.preprocess(emptyToUndefined, z.enum(RENT_PERIOD_VALUES).optional()),
  agencyFeeNaira: optionalNaira("Enter the agency fee in naira."),
  legalFeeNaira: optionalNaira("Enter the legal fee in naira."),
  agreementFeeNaira: optionalNaira("Enter the agreement fee in naira."),
  totalMoveInNaira: optionalNaira("Enter the total move-in cost in naira."),
  minimumTenancyMonths: optionalCount(
    1,
    MAX_TENANCY_MONTHS,
    `The shortest tenancy can be 1 to ${MAX_TENANCY_MONTHS} months.`,
  ),
  availableFrom: optionalDate("Enter the date as YYYY-MM-DD."),
  furnished: z.preprocess(emptyToUndefined, z.enum(FURNISHING_VALUES).optional()),

  /* --------------------------------------------------------- to let, nightly
     A shortlet, a hotel room, a restaurant table. One figure and the cycle it
     is quoted in, which the category decides rather than the lister. */
  rateNaira: optionalNaira("Enter the rate in naira, for example 85,000."),
  ratePeriod: z.preprocess(emptyToUndefined, z.enum(RATE_PERIOD_VALUES).optional()),

  /* -------------------------------------------------------------- for sale */
  salePriceNaira: optionalNaira("Enter the asking price in naira, for example 180,000,000."),
  priceNegotiable: z.preprocess(emptyToUndefined, z.boolean().optional()),
  tenure: z.preprocess(emptyToUndefined, z.enum(LAND_TENURE_VALUES).optional()),
  saleStatus: z.preprocess(emptyToUndefined, z.enum(SALE_STATUS_VALUES).optional()),
  yearBuilt: optionalCount(
    MIN_YEAR_BUILT,
    new Date().getUTCFullYear() + YEAR_BUILT_LOOKAHEAD,
    `The year built can be ${MIN_YEAR_BUILT} to ${new Date().getUTCFullYear() + YEAR_BUILT_LOOKAHEAD}.`,
  ),
  condition: z.preprocess(emptyToUndefined, z.enum(BUILD_CONDITION_VALUES).optional()),

  /* Light and water. Undefined means the host has not answered yet and the
     column is left exactly as it was; the listing page renders unanswered as
     unanswered, never as good news. */
  powerGrid: z.preprocess(emptyToUndefined, z.enum(POWER_GRID_VALUES).optional()),
  powerBackup: z.preprocess(emptyToUndefined, z.enum(POWER_BACKUP_VALUES).optional()),
  powerBackupHours: optionalCount(
    0,
    MAX_BACKUP_HOURS,
    `Backup hours can be 0 to ${MAX_BACKUP_HOURS}.`,
  ),
  waterSupply: z.preprocess(emptyToUndefined, z.enum(WATER_SUPPLY_VALUES).optional()),
  prepaidMeter: z.preprocess(emptyToUndefined, z.boolean().optional()),
});

export type DraftInput = z.input<typeof draftInputSchema>;
export type DraftParsed = z.output<typeof draftInputSchema>;

/* --------------------------------------------------- photo and amenities */

export const addPhotoSchema = z.object({
  listingId: uuid("We could not identify that listing."),
  /** `<auth uid>/<listing id>/<uuid>.<ext>` inside the listing-photos bucket. */
  storagePath: z
    .string()
    .trim()
    .min(6, "That upload did not complete. Try the photo again.")
    .max(400, "That upload did not complete. Try the photo again.")
    .regex(/^[0-9a-zA-Z._/-]+$/, "That upload did not complete. Try the photo again.")
    // No traversal: a path may only ever point inside the uploader's folder.
    .refine(
      (path) => !path.split("/").includes(".."),
      "That upload did not complete. Try the photo again.",
    ),
  position: z.preprocess(
    emptyToUndefined,
    z.number().int().min(0).max(MAX_PHOTOS - 1).optional(),
  ),
});

export const removePhotoSchema = z.object({
  listingId: uuid("We could not identify that listing."),
  photoId: uuid("We could not identify that photo."),
});

export const reorderPhotosSchema = z.object({
  listingId: uuid("We could not identify that listing."),
  orderedIds: z
    .array(uuid("We could not identify that photo."))
    .min(1, "There are no photos to reorder.")
    .max(MAX_PHOTOS, `A listing holds up to ${MAX_PHOTOS} photos.`),
});

export const setAmenitiesSchema = z.object({
  listingId: uuid("We could not identify that listing."),
  codes: z
    .array(z.string().trim())
    .max(AMENITY_CHOICES.length, "Choose from the amenities listed.")
    .transform((codes) => Array.from(new Set(codes)))
    .refine(
      (codes) => codes.every((code) => AMENITY_CODE_SET.has(code)),
      "Choose from the amenities listed.",
    ),
});

export const listingIdSchema = z.object({
  listingId: uuid("We could not identify that listing."),
});

/**
 * What a host tells us about getting in.
 *
 * This never reaches `public.listings`, which the whole internet can read once a
 * listing is PUBLISHED. It goes to `public.listing_access`, whose select policy
 * names three readers and no others: the host, an admin, and a guest holding a
 * CONFIRMED booking on that listing.
 */
export const listingAccessSchema = z.object({
  listingId: uuid("We could not identify that listing."),
  estateName: optionalText(MAX_ESTATE_NAME, `Keep the estate name under ${MAX_ESTATE_NAME} characters.`),
  gateDirections: optionalText(
    MAX_GATE_DIRECTIONS,
    `Keep the gate directions under ${MAX_GATE_DIRECTIONS} characters.`,
  ),
  securityPhone: optionalText(
    MAX_SECURITY_PHONE,
    "That phone number is too long. A single number is enough.",
  ),
  accessCode: optionalText(MAX_ACCESS_CODE, `Keep the code under ${MAX_ACCESS_CODE} characters.`),
});

export type ListingAccessInput = z.input<typeof listingAccessSchema>;

/* ------------------------------------------------------- the submit gate */

/**
 * Everything the gate needs to judge a listing, whether the values are sitting
 * in wizard state or have just been read back out of Postgres.
 */
export type SubmitSubject = {
  title: string | null | undefined;
  description: string | null | undefined;
  propertyType: PropertyType | null | undefined;
  stateCode: string | null | undefined;
  city: string | null | undefined;
  area: string | null | undefined;
  /** To let, or for sale. Absent reads as "rent", the column default. */
  intent: ListingIntent | null | undefined;
  /** Tenancy rent in kobo, with the cycle it is quoted in. */
  rentMinor: number | null | undefined;
  rentPeriod: RentPeriod | null | undefined;
  /** Short-stay rate in kobo, per night or per head. */
  rateMinor: number | null | undefined;
  ratePeriod: RatePeriod | null | undefined;
  /** Asking price in kobo, and the title being sold with it. */
  salePriceMinor: number | null | undefined;
  tenure: LandTenure | null | undefined;
  bedrooms: number | null | undefined;
  bathrooms: number | null | undefined;
  amenityCount: number;
  photoCount: number;
  /** True when a photo sits at position 0, which is the cover. */
  hasCover: boolean;
};

/** One unmet requirement, named by the field the agent has to go back to. */
export type GateRequirement = { field: string; message: string };

/**
 * THE canonical gate. The wizard checklist and `submitListing` both call this,
 * so what an agent is told and what the server enforces cannot drift apart.
 * An empty array means the listing is ready for review.
 */
export function submitRequirements(subject: SubmitSubject): GateRequirement[] {
  const unmet: GateRequirement[] = [];

  const title = collapseSpaces(subject.title ?? "");
  if (title.length < MIN_TITLE_LENGTH) {
    unmet.push({
      field: "title",
      message: `Give the listing a title of at least ${MIN_TITLE_LENGTH} characters.`,
    });
  } else if (title.length > MAX_TITLE_LENGTH) {
    unmet.push({
      field: "title",
      message: `Shorten the title to ${MAX_TITLE_LENGTH} characters or fewer.`,
    });
  }

  const words = countWords(subject.description);
  if (words < MIN_DESCRIPTION_WORDS) {
    unmet.push({
      field: "description",
      message: `Describe the property in at least ${MIN_DESCRIPTION_WORDS} words. You have ${words} so far.`,
    });
  }

  if (!subject.propertyType) {
    unmet.push({ field: "propertyType", message: "Choose what kind of property this is." });
  }

  if (subject.photoCount < MIN_PHOTOS) {
    unmet.push({
      field: "photos",
      message: `Add at least ${MIN_PHOTOS} photos. You have ${subject.photoCount}.`,
    });
  } else if (!subject.hasCover) {
    unmet.push({
      field: "photos",
      message: "Choose which photo leads the listing. The first one is the cover.",
    });
  }

  const stateCode = (subject.stateCode ?? "").trim().toUpperCase();
  if (!STATE_CODE_SET.has(stateCode)) {
    unmet.push({ field: "stateCode", message: "Choose the state the property is in." });
  }
  if (collapseSpaces(subject.city ?? "").length < 2) {
    unmet.push({ field: "city", message: "Enter the city, for example Lagos." });
  }
  if (collapseSpaces(subject.area ?? "").length < 2) {
    unmet.push({ field: "area", message: "Enter the area, for example Lekki Phase 1." });
  }

  if (subject.amenityCount < 1) {
    unmet.push({ field: "amenities", message: "Choose at least one amenity guests will find." });
  }

  /*
   * The money gate, which is three different gates.
   *
   * A listing that says nothing about what it costs is the single most useless
   * thing this catalogue can publish, so exactly one of the three shapes has to
   * be complete, and which one is not the lister's choice: intent picks sale
   * against everything else, and the property type picks tenancy against short
   * stay. Each branch names the field the wizard has to send the agent back to,
   * so the checklist and the server refusal point at the same input.
   */
  const intent: ListingIntent = subject.intent ?? "rent";
  if (intent === "sale") {
    if ((subject.salePriceMinor ?? 0) <= 0) {
      unmet.push({ field: "salePrice", message: "Set the asking price in naira." });
    }
    /* A buyer's first question in Nigeria is what title they are taking, and a
       sale listing that will not answer it is the shape of every land scam
       there has ever been. It is required rather than encouraged. */
    if (!subject.tenure) {
      unmet.push({
        field: "tenure",
        message: "Say what title comes with the property, for example Certificate of Occupancy.",
      });
    }
  } else if (isTenancy(subject.propertyType)) {
    if ((subject.rentMinor ?? 0) <= 0) {
      unmet.push({ field: "rent", message: "Set the rent in naira." });
    }
    if (!subject.rentPeriod) {
      unmet.push({ field: "rentPeriod", message: "Say whether the rent is per year, quarter or month." });
    }
  } else {
    if ((subject.rateMinor ?? 0) <= 0) {
      unmet.push({
        field: "rate",
        message:
          subject.propertyType === "restaurant"
            ? "Set the price per head in naira."
            : "Set the price per night in naira.",
      });
    }
    if (!subject.ratePeriod) {
      unmet.push({ field: "ratePeriod", message: "Say what the rate covers." });
    }
  }

  if ((subject.bedrooms ?? -1) < 0) {
    unmet.push({ field: "bedrooms", message: "Say how many bedrooms the property has." });
  }
  /* A plot of land has no bathroom. Asking would be a gate no land listing
     could ever pass, which is a worse failure than a missing field: the
     category would exist in search and be impossible to supply. */
  if (subject.propertyType !== "land" && (subject.bathrooms ?? 0) < 1) {
    unmet.push({ field: "bathrooms", message: "Say how many bathrooms the property has." });
  }

  return unmet;
}

/** The gate's verdict shaped for the ActionResult envelope's fieldErrors. */
export function gateFieldErrors(unmet: GateRequirement[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const item of unmet) {
    if (!(item.field in out)) out[item.field] = item.message;
  }
  return out;
}

/** The one sentence shown above the list of unmet requirements. */
export const GATE_SUMMARY_MESSAGE =
  "A few things are still needed before this listing can go for review. Each one is listed below.";

/* -------------------------------------------------------------- statuses */

/**
 * The listing status vocabulary and how it renders. These live here rather
 * than beside the queries because the agent workspace is a client component
 * and the query module is server-only: a value imported across that boundary
 * would drag the server module into the browser bundle.
 */
export type ListingStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "MORE_INFO_REQUIRED"
  | "APPROVED"
  | "PUBLISHED"
  | "REJECTED"
  | "SUSPENDED";

export const STATUS_LABEL: Record<ListingStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  MORE_INFO_REQUIRED: "More information needed",
  APPROVED: "Approved",
  PUBLISHED: "Live",
  REJECTED: "Not accepted",
  SUSPENDED: "Suspended",
};

/**
 * Status colours, named for the STATE rather than for the colour.
 *
 * The four locked meanings live in packages/design-tokens/src/tokens.css. This
 * map only says which listing status is which state; it never picks a colour.
 * Everything a host is still waiting on is "pending", whatever the wording of
 * the step, and everything the platform has stopped is "rejected".
 */
export const STATUS_TONE: Record<
  ListingStatus,
  "neutral" | "pending" | "approved" | "rejected"
> = {
  DRAFT: "neutral",
  SUBMITTED: "pending",
  UNDER_REVIEW: "pending",
  MORE_INFO_REQUIRED: "pending",
  APPROVED: "approved",
  PUBLISHED: "approved",
  REJECTED: "rejected",
  SUSPENDED: "rejected",
};
