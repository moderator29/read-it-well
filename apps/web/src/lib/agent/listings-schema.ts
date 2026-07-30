import { z } from "zod";

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
 * float. Rentals price per year, stays price per night; the same kobo column
 * carries both, read through price_period.
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

export type PropertyType = "apartment" | "hotel" | "home" | "villa" | "shortlet" | "rental";

export const PROPERTY_TYPE_VALUES = [
  "apartment",
  "hotel",
  "home",
  "villa",
  "shortlet",
  "rental",
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
];

/** Rentals are the yearly market; everything else is priced per night. */
export function isRental(type: PropertyType | null | undefined): boolean {
  return type === "rental";
}

export function pricePeriodFor(type: PropertyType | null | undefined): "night" | "year" {
  return isRental(type) ? "year" : "night";
}

/** The words the UI puts after a price, per market. */
export function pricePeriodLabel(type: PropertyType | null | undefined): string {
  return isRental(type) ? "per year" : "per night";
}

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

/* ------------------------------------------------------------ amenities */

/** The 15 seeded amenity codes with their labels, for chips and validation. */
export const AMENITY_CHOICES: { code: string; label: string }[] = [
  { code: "wifi", label: "WiFi" },
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
  maxGuests: optionalCount(1, 30, "Guests can be 1 to 30."),
  bedrooms: optionalCount(0, 20, "Bedrooms can be 0 to 20."),
  beds: optionalCount(1, 30, "Beds can be 1 to 30."),
  bathrooms: optionalCount(1, 20, "Bathrooms can be 1 to 20."),
  priceNaira: optionalNaira("Enter the price in naira, for example 85,000."),
  cleaningNaira: optionalNaira("Enter the cleaning amount in naira, for example 10,000."),
  minStayNights: optionalCount(1, 365, "The shortest stay can be 1 to 365 nights."),
  instantBook: z.preprocess(emptyToUndefined, z.boolean().optional()),
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
  priceMinor: number | null | undefined;
  bedrooms: number | null | undefined;
  bathrooms: number | null | undefined;
  maxGuests: number | null | undefined;
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

  const price = subject.priceMinor ?? 0;
  if (price <= 0) {
    unmet.push({
      field: "price",
      message: isRental(subject.propertyType)
        ? "Set the yearly rent in naira."
        : "Set the price per night in naira.",
    });
  }

  if ((subject.bedrooms ?? -1) < 0) {
    unmet.push({ field: "bedrooms", message: "Say how many bedrooms the property has." });
  }
  if ((subject.bathrooms ?? 0) < 1) {
    unmet.push({ field: "bathrooms", message: "Say how many bathrooms the property has." });
  }
  if ((subject.maxGuests ?? 0) < 1) {
    unmet.push({ field: "maxGuests", message: "Say how many guests the property sleeps." });
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
  "A few things are still needed before this listing can go for review.";

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

/** Status colours reuse the existing state tokens. Never a new palette. */
export const STATUS_TONE: Record<
  ListingStatus,
  "neutral" | "brand" | "warning" | "success" | "error"
> = {
  DRAFT: "neutral",
  SUBMITTED: "brand",
  UNDER_REVIEW: "brand",
  MORE_INFO_REQUIRED: "warning",
  APPROVED: "success",
  PUBLISHED: "success",
  REJECTED: "error",
  SUSPENDED: "warning",
};
