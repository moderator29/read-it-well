import { z } from "zod";

/**
 * The social profile's shape, and the constants both the form and the action
 * share.
 *
 * Client-safe on purpose: nothing here imports a server-only module, so the
 * editor can read the character limits, the contact policy labels and the
 * handle rules without dragging the server into the browser bundle. A client
 * component importing a value from a `"use server"` file typechecks cleanly and
 * fails the build, which is exactly the trap this split exists to avoid.
 *
 * Every limit below mirrors a constraint that the database already enforces.
 * The database is the authority; these exist so a person is told what is wrong
 * while they are typing rather than after a round trip.
 */

/* ------------------------------------------------------------------ limits */

export const HANDLE_MIN = 3;
export const HANDLE_MAX = 20;
/** `check (handle ~ '^[a-z][a-z0-9_]{2,19}$')` on public.social_profiles. */
export const HANDLE_PATTERN = /^[a-z][a-z0-9_]{2,19}$/;
export const BIO_MAX = 240;
export const PRONOUNS_MAX = 24;
export const LINK_MAX = 120;

export const HANDLE_HELP =
  "3 to 20 characters. Letters, numbers and underscores, starting with a letter.";

/* ------------------------------------------------------------------ policy */

export const CONTACT_POLICIES = ["REQUEST", "OPEN"] as const;
export type ContactPolicy = (typeof CONTACT_POLICIES)[number];

/**
 * Who may open a chat with you. The default is REQUEST, because a stranger
 * being able to message anyone by default is how a social layer becomes a
 * harassment surface.
 */
export const CONTACT_POLICY_COPY: Record<ContactPolicy, { title: string; detail: string }> = {
  REQUEST: {
    title: "Ask me first",
    detail: "Someone new has to send a request before they can message you.",
  },
  OPEN: {
    title: "Anyone can message me",
    detail: "People around you can open a chat without asking first.",
  },
};

export const PIDGIN_COPY = {
  title: "Pidgin is welcome",
  detail: "Tells people, and the assistant, that they can reply to you in Pidgin.",
};

/* ------------------------------------------------------------------ fields */

/**
 * A handle, normalised the same way the database normalises it
 * (`new.handle := lower(btrim(new.handle))`) so what the person sees in the
 * field is what the unique index will actually hold.
 */
export const handleSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(HANDLE_MIN, `A handle is at least ${HANDLE_MIN} characters.`)
  .max(HANDLE_MAX, `A handle is at most ${HANDLE_MAX} characters.`)
  .regex(HANDLE_PATTERN, HANDLE_HELP);

/**
 * A link, kept deliberately forgiving at the front and strict at the back.
 *
 * People type `myshop.ng`, not `https://myshop.ng`, so the scheme is optional
 * on the way in and added on the way out. Anything that is not plausibly a web
 * address is refused rather than stored and rendered as a dead link.
 */
const LINK_PATTERN = /^(https?:\/\/)?[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9-]+)+(\/\S*)?$/i;

export function normaliseLink(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/** What a link should read as on a profile: no scheme, no trailing slash. */
export function linkLabel(link: string): string {
  return link.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

/* ------------------------------------------------------------------ covers */

/** The public bucket a cover photo is stored in. */
export const COVER_BUCKET = "social-covers";

/** The longest edge a cover is re-encoded to before it is uploaded. */
export const COVER_MAX_EDGE = 1600;

/** The biggest file we will even try to re-encode. */
export const COVER_MAX_BYTES = 10 * 1024 * 1024;

/**
 * A cover's public URL.
 *
 * The bucket is public, so an object serves straight from its public URL with
 * no signed request. A stored value that is already a URL is returned
 * untouched, which keeps this safe if the projection ever hands one over.
 */
export function coverPublicUrl(supabaseUrl: string, storagePath: string): string {
  if (storagePath.length === 0) return "";
  if (/^https?:\/\//i.test(storagePath)) return storagePath;
  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${COVER_BUCKET}/${storagePath}`;
}

const optionalText = (max: number, tooLong: string) =>
  z
    .string()
    .trim()
    .max(max, tooLong)
    .optional()
    .transform((v) => v ?? "");

export const socialProfileInputSchema = z.object({
  handle: handleSchema,
  bio: optionalText(BIO_MAX, `Keep your bio under ${BIO_MAX} characters.`),
  pronouns: optionalText(PRONOUNS_MAX, `Keep pronouns under ${PRONOUNS_MAX} characters.`),
  link: z
    .string()
    .trim()
    .max(LINK_MAX, `Keep the link under ${LINK_MAX} characters.`)
    .optional()
    .transform((v) => v ?? "")
    .refine((v) => v.length === 0 || LINK_PATTERN.test(v), {
      message: "That does not look like a web address. Try something like myshop.ng.",
    })
    .transform(normaliseLink)
    .refine((v) => v.length <= LINK_MAX, {
      message: `Keep the link under ${LINK_MAX} characters.`,
    }),
  contactPolicy: z.enum(CONTACT_POLICIES),
  /* Checkboxes post a value or nothing at all, so the form pairs each one with
     a hidden "off" field ahead of it and the last value wins. */
  pidginOk: z
    .enum(["on", "off"])
    .optional()
    .transform((v) => v === "on"),
  homeAreaId: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export type SocialProfileInput = z.infer<typeof socialProfileInputSchema>;

/* ------------------------------------------------------------------- state */

/** The three states a bio can be in, mirroring public.social_status. */
export type BioStatus = "LIVE" | "HELD" | "REMOVED";

/**
 * Why a bio is held, said plainly.
 *
 * A trigger holds a bio or link carrying a ten digit run or payment language
 * before it is ever public. The owner of the bio is told exactly that; everyone
 * else is shown a profile with no bio at all, never a blurred teaser.
 */
export const BIO_HELD_TITLE = "Your bio is under review";
export const BIO_HELD_DETAIL =
  "It looked like it carried a phone number, an account number or a payment ask. Nobody else can see it while we check. Edit it to something without those and it goes live again straight away.";

/** What the saved result hands back to the surface that asked for it. */
export type SocialProfileSaved = {
  handle: string;
  bioStatus: BioStatus;
  /** True when this save created the profile rather than editing one. */
  claimed: boolean;
};
