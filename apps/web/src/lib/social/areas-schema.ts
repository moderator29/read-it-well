/**
 * Around: the shapes and the words for places.
 *
 * Client safe on purpose. Everything a form or a card needs to import lives
 * here, and nothing here imports `server-only`, because a constant exported
 * from a `"use server"` file cannot be imported by a client component and the
 * failure only shows up at build time, never at typecheck.
 *
 * The database is the authority for every rule below. These schemas exist to
 * give a person a useful sentence before the round trip, not to be the check.
 * Where the two could ever disagree, the database wins.
 */

import { z } from "zod";

/** A place is one of four things, and the kind changes nothing but the label. */
export const AREA_KINDS = ["CITY", "AREA", "ESTATE", "CAMPUS"] as const;
export type AreaKind = (typeof AREA_KINDS)[number];

export const AREA_KIND_LABEL: Record<AreaKind, string> = {
  CITY: "City",
  AREA: "Area",
  ESTATE: "Estate",
  CAMPUS: "Campus",
};

export const AREA_KIND_HINT: Record<AreaKind, string> = {
  CITY: "A whole city, like Abuja.",
  AREA: "A neighbourhood people name in conversation, like Yaba or Gwagwalada.",
  ESTATE: "One gated estate, where the gate and the generator are shared.",
  CAMPUS: "A university or polytechnic and the streets around it.",
};

export const AREA_STATUSES = [
  "PROPOSED",
  "ACTIVE",
  "PAUSED",
  "ARCHIVED",
  "REJECTED",
] as const;
export type AreaStatus = (typeof AREA_STATUSES)[number];

export const AREA_ROLES = ["MEMBER", "RESIDENT", "MODERATOR"] as const;
export type AreaRole = (typeof AREA_ROLES)[number];

/**
 * What a moderator may do, stated in the product rather than buried in a policy.
 * The owner's ruling, and the reason the word "admin" is not used for this role
 * anywhere a member can see: an area moderator is not a platform administrator
 * and must never be mistaken for one.
 */
export const MODERATOR_CAN = [
  "Hide a post while a person reviews it",
  "Welcome people and answer questions about the place",
  "Flag a listing or a profile to the RentMe team",
] as const;

export const MODERATOR_CANNOT = [
  "Delete anybody's post, ever",
  "Remove a member from the place",
  "See anyone's bookings, wallet or messages",
] as const;

export const HANDLE_RE = /^[a-z][a-z0-9_]{2,19}$/;
export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Turn a typed place name into a slug. Deliberately lossy and deliberately
 * boring: strip accents, keep letters and digits, collapse everything else to a
 * single hyphen. A person never sees this, and a slug that surprises its author
 * is a slug that gets reported as a bug.
 */
export function slugifyArea(city: string, name: string): string {
  const raw = `${city} ${name}`;
  return raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

export const proposeAreaSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Give the place its name, the one people actually say.")
    .max(60, "That name is too long. Use the short one people say out loud."),
  kind: z.enum(AREA_KINDS),
  stateCode: z.string().trim().min(2, "Choose the state this place is in.").max(8),
  city: z
    .string()
    .trim()
    .min(2, "Which city or town is it in?")
    .max(60, "That city name is too long."),
  blurb: z
    .string()
    .trim()
    .max(200, "Keep it to 200 characters. One line is plenty.")
    .optional()
    .or(z.literal("")),
});

export type ProposeAreaInput = z.infer<typeof proposeAreaSchema>;

/**
 * Forty words is the floor on a moderator application, and it is a real
 * threshold rather than a formality: somebody who will not write four sentences
 * about a place is not going to spend evenings looking after it. The database
 * carries the same bound, so this message is a courtesy, not the gate.
 */
export const MODERATOR_REASON_MIN = 40;
export const MODERATOR_REASON_MAX = 600;

export const moderatorApplicationSchema = z.object({
  areaId: z.string().uuid("Choose a place to look after."),
  reason: z
    .string()
    .trim()
    .min(
      MODERATOR_REASON_MIN,
      "Tell us a bit more. What do you know about this place, and how long have you been around it?",
    )
    .max(MODERATOR_REASON_MAX, "Keep it under 600 characters."),
});

export type ModeratorApplicationInput = z.infer<typeof moderatorApplicationSchema>;

export const areaIdSchema = z.object({
  areaId: z.string().uuid("That place could not be found."),
});

/* ------------------------------------------------------------------ *
 * Copy. Kept here so the same sentence cannot drift between a page, a
 * form and a notification.
 * ------------------------------------------------------------------ */

export const AREA_COPY = {
  /** The one line that explains what Around is, to someone who has never seen it. */
  what: "Places on RentMe, kept by the people who actually live around them.",

  proposePending:
    "Your place is with us. We look at every one by hand, usually within a day, and you will get a notification either way.",

  proposeWhy:
    "We approve places one at a time so every one has somebody watching it. A place nobody is watching becomes a place nobody trusts.",

  joinedNone:
    "You have not joined a place yet. Join the ones you live in, stayed in, or care about, and they show up here.",

  noneOpenYet:
    "No places are open here yet. If you know one worth opening, tell us and we will look at it.",

  paused:
    "This place is paused while we sort something out. Nothing has been deleted and it will be back.",

  moderatorPending:
    "Your application is with us. We read every one, and you will hear either way.",

  slowMode:
    "This place is new, so posting needs a confirmed phone number and a first post is read before it goes up. That lifts once the place finds its feet.",
} as const;

export const AREA_FAILURE = {
  down: "We could not do that just now. Please try again in a moment.",
  gone: "That place is no longer open.",
  notMember: "Join this place first, then you can apply to look after it.",
  duplicate: "Somebody has already suggested that place. We will look at it.",
  alreadyApplied:
    "You already have an application open for this place. We will come back to you on it.",
  alreadyJoined: "You are already in this place.",
} as const;

/**
 * The rate limits, named once. The numbers are argued in
 * docs/SOCIAL_DESIGN.md section 8.4 and the limiter is the durable Postgres one,
 * which fails open by design, so these are a cost on abuse rather than a wall.
 */
export const AREA_LIMITS = {
  propose: { bucket: "social:propose-area", limit: 3, windowSeconds: 86_400 },
  /* Walking through a door is navigation, so the ceiling is set where a script
     hits it and a curious person never does. Somebody who opens sixty local
     governments in a day is exploring Nigeria; somebody who opens six hundred
     is not a person. */
  enter: { bucket: "social:enter-place", limit: 120, windowSeconds: 86_400 },
  join: { bucket: "social:join-area", limit: 20, windowSeconds: 86_400 },
  moderate: { bucket: "social:apply-moderate", limit: 3, windowSeconds: 86_400 },
} as const;
