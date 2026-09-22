import { z } from "zod";
import { STAY_FACILITY_CODES } from "./facilities";
import { normalisePhone } from "../phone";
import { CAC_NUMBER_RE, CONSENTS, HOST_DOCUMENT_KINDS, HOST_TYPES } from "./onboarding";

/**
 * Host onboarding input schemas.
 *
 * Every field is optional on the draft schema and that is deliberate: the
 * wizard saves after every step, so a save must never refuse a half-filled
 * application. What each field must LOOK LIKE when present is checked here,
 * once, with the same rules the database's own CHECKs carry, so a person is
 * told about a malformed CAC number beside the box rather than by a refusal
 * after ten more minutes of typing. What must be PRESENT to submit is
 * `missingFrom`'s job, not this file's.
 */

const trimmed = (max: number) => z.string().trim().max(max);

/** A Nigerian phone in any of the six forms people write it, or nothing. */
const phone = z
  .string()
  .trim()
  .transform((value, ctx) => {
    if (value.length === 0) return "";
    const normalised = normalisePhone(value);
    if (normalised === null) {
      ctx.addIssue({
        code: "custom",
        message: "That does not look like a Nigerian mobile number. Enter it as 0803 123 4567.",
      });
      return z.NEVER;
    }
    return normalised;
  });

export const hostDraftSchema = z.object({
  hostType: z.enum(HOST_TYPES).optional(),
  kind: z.string().trim().min(1).optional(),
  name: trimmed(120).optional(),
  description: trimmed(4000).optional(),
  phone: phone.optional(),
  email: z
    .string()
    .trim()
    .max(160)
    .refine(
      (value) => value.length === 0 || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value),
      "Enter an email address we can actually write to.",
    )
    .optional(),
  address: trimmed(300).optional(),
  area: trimmed(120).optional(),
  city: trimmed(120).optional(),
  stateCode: trimmed(10).optional(),
  registeredName: trimmed(160).optional(),
  cacNumber: z
    .string()
    .trim()
    .max(20)
    .refine(
      (value) => value.length === 0 || CAC_NUMBER_RE.test(value),
      "That is not an RC or BN number. It is the one on your CAC certificate, like RC 1234567.",
    )
    .optional(),
  tin: z
    .string()
    .trim()
    .max(20)
    .refine(
      (value) => value.length === 0 || /^[0-9-]{8,20}$/.test(value),
      "A TIN is digits, with or without dashes.",
    )
    .optional(),
  representativeName: trimmed(120).optional(),
  representativePhone: phone.optional(),
  /** The consents ticked on this save. Each becomes its own timestamp. */
  consents: z.array(z.enum(CONSENTS.map((consent) => consent.id))).optional(),
  /** The two attestations, each stamped with the moment it was made. */
  hygieneAttested: z.boolean().optional(),
  licenceAttested: z.boolean().optional(),
});

export type HostDraftInput = z.infer<typeof hostDraftSchema>;

export const hostDocumentSchema = z.object({
  businessId: z.uuid("That application could not be identified."),
  kind: z.enum(HOST_DOCUMENT_KINDS, { message: "That is not a document we ask for." }),
  storagePath: z
    .string()
    .trim()
    .min(1, "That upload could not be identified.")
    .max(400, "That upload could not be identified."),
});

export const accommodationDraftSchema = z.object({
  name: z.string().trim().min(2, "Give the property a name.").max(120),
  description: trimmed(6000).optional(),
  starRating: z.number().int().min(1).max(5).nullable().optional(),
  checkInFrom: z
    .string()
    .trim()
    .regex(/^\d{2}:\d{2}$/, "Use a time like 14:00.")
    .optional(),
  checkOutBy: z
    .string()
    .trim()
    .regex(/^\d{2}:\d{2}$/, "Use a time like 11:00.")
    .optional(),
  houseRules: trimmed(4000).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  cancellationPolicyId: z.uuid().optional(),
});

export const roomTypeDraftSchema = z.object({
  accommodationId: z.uuid("That property could not be identified."),
  name: z.string().trim().min(2, "Name the room type, for example Deluxe Double.").max(80),
  category: z.enum(["single", "double", "twin", "suite", "family", "dorm"], {
    message: "Pick what kind of room this is.",
  }),
  description: trimmed(2000).optional(),
  sleeps: z.number().int().min(1, "A room sleeps at least one.").max(20),
  unitsTotal: z.number().int().min(1, "You have at least one of this room."),
  /** Integer kobo. The naira boundary is the form's, never this schema's. */
  baseRateMinor: z.number().int().min(0, "A rate cannot be negative."),
  sizeSqm: z.number().positive().nullable().optional(),
});

export const ratePlanDraftSchema = z.object({
  roomTypeId: z.uuid("That room type could not be identified."),
  name: z.string().trim().min(2, "Name the rate, for example Standard.").max(80),
  mealPlan: z.enum(["room_only", "breakfast", "half_board", "full_board"]).optional(),
  cancellationPolicyId: z.uuid("Pick a cancellation policy."),
  rateMinor: z.number().int().min(0, "A rate cannot be negative."),
  minStayNights: z.number().int().min(1).optional(),
  maxStayNights: z.number().int().min(1).nullable().optional(),
});

export const serviceWindowDraftSchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    opens: z.string().trim().regex(/^\d{2}:\d{2}$/, "Use a time like 12:00."),
    lastSeating: z.string().trim().regex(/^\d{2}:\d{2}$/, "Use a time like 21:30."),
    closes: z.string().trim().regex(/^\d{2}:\d{2}$/, "Use a time like 22:00."),
    covers: z.number().int().min(1, "Say how many people you can seat.").max(2000),
  })
  .refine((value) => value.opens < value.closes, {
    message: "A service closes after it opens.",
    path: ["closes"],
  })
  .refine((value) => value.lastSeating >= value.opens && value.lastSeating <= value.closes, {
    message: "The last seating falls inside the service.",
    path: ["lastSeating"],
  });

export const restaurantProfileDraftSchema = z.object({
  cuisines: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
  priceBand: z.number().int().min(1).max(4).nullable().optional(),
  menuUrl: z
    .string()
    .trim()
    .max(500)
    .refine(
      (value) => value.length === 0 || value.startsWith("https://"),
      "A menu link starts with https://",
    )
    .optional(),
  dressCode: trimmed(120).optional(),
  parking: z.boolean().optional(),
  powerBackup: z.boolean().optional(),
  outdoor: z.boolean().optional(),
});

/* ---------------------------------------------------------- photographs */

/**
 * One photograph of the venue, already uploaded to the public bucket.
 *
 * The same shape as `hostDocumentSchema` above and for the same reason: the
 * browser puts the object in storage under its own uid prefix, which storage
 * RLS enforces, and hands the server the path. The server trusts none of it.
 */
export const businessPhotoSchema = z.object({
  businessId: z.uuid("That venue could not be identified."),
  storagePath: z
    .string()
    .trim()
    .min(1, "That upload could not be identified.")
    .max(400, "That upload could not be identified."),
});

/** One photograph already on record, named for removal. */
export const businessPhotoIdSchema = z.object({
  photoId: z.uuid("That photograph could not be identified."),
});

/**
 * One photograph of an accommodation, already uploaded to the public bucket.
 *
 * The accommodation twin of `businessPhotoSchema`, same shape and same
 * reasoning. The two spines are separate tables with separate owner helpers
 * (`private.owns_accommodation` against `private.owns_business`), so they are
 * separate schemas rather than one with an optional key: a call that named
 * neither, or both, would have to be refused at runtime by an action instead
 * of at the boundary by a type.
 */
export const accommodationPhotoSchema = z.object({
  accommodationId: z.uuid("That property could not be identified."),
  storagePath: z
    .string()
    .trim()
    .min(1, "That upload could not be identified.")
    .max(400, "That upload could not be identified."),
});

/** One accommodation photograph already on record, named for removal. */
export const accommodationPhotoIdSchema = z.object({
  photoId: z.uuid("That photograph could not be identified."),
});

/* ------------------------------------------------------------- facilities */

/**
 * What a stay offers, as exactly the codes the facilities surface knows.
 *
 * The whitelist is here rather than a regex, because `accommodation_amenities`
 * joins `amenities` by id and a code the table does not carry would be dropped
 * silently on the way through: a host would tick a box, see nothing refused
 * and have nothing saved. Anything not on the list is refused in words.
 */
export const accommodationFacilitiesSchema = z.object({
  accommodationId: z.uuid("That property could not be identified."),
  codes: z
    .array(
      z.string().refine((code) => STAY_FACILITY_CODES.includes(code), {
        message: "That is not a facility we can record.",
      }),
    )
    .max(STAY_FACILITY_CODES.length, "That is more facilities than there are."),
});

/* ------------------------------------------------------- nightly inventory */

/** A date the way `room_inventory.date` stores it, and nothing looser. */
const isoDay = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "That is not a date. Use the date picker.");

/**
 * How many of a room type are on sale across a run of nights.
 *
 * `unitsOpen` of zero is a closure rather than a missing value, which is why
 * it is a number with a floor of zero and never an optional. The ceiling is
 * checked by the database against the room type's own `units_total`, because
 * only the database knows that number at the moment of the write; 500 here is
 * a sanity bound on what a form may post, not a product rule.
 */
export const roomNightsSchema = z
  .object({
    roomTypeId: z.uuid("That room type could not be identified."),
    from: isoDay,
    to: isoDay,
    unitsOpen: z
      .number()
      .int("Rooms come in whole numbers.")
      .min(0, "That cannot be fewer than none.")
      .max(500, "That is more rooms than any one type holds."),
  })
  .refine((value) => value.to >= value.from, {
    message: "The last night cannot come before the first.",
    path: ["to"],
  });
