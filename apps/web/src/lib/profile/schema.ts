import { z } from "zod";
import { NIGERIAN_STATES } from "../data/nigeria";

/**
 * Profile and settings input schemas.
 *
 * The profiles table carries display_name, avatar_url, phone, locale and a
 * settings jsonb blob. There are no first name, surname, nickname or state
 * columns, so the parts a person types are kept in two coherent places: the
 * composed display_name (what every other surface reads) and the identity
 * block inside settings.profile (what this form reads back so nothing is lost
 * to a lossy name split). Everything a client sends is validated here, on the
 * server, before a single row is touched.
 */

/** Product locales, matching packages/i18n and the public.locale enum. */
export const LOCALE_CODES = ["en", "yo", "ha", "ig"] as const;
export type LocaleCode = (typeof LOCALE_CODES)[number];

export const MAX_NAME_LENGTH = 80;
export const MAX_NICKNAME_LENGTH = 40;
export const MAX_PHONE_LENGTH = 24;

/**
 * Phone numbers as Nigerians actually write them: 0803 123 4567,
 * +234 803 123 4567, 08031234567. Spaces, brackets and hyphens are allowed
 * and the digit count is what is really checked.
 */
const PHONE_SHAPE_RE = /^\+?[\d][\d\s()-]{5,22}$/;

function phoneDigits(value: string): number {
  return value.replace(/\D/g, "").length;
}

const nameField = (label: string) =>
  z
    .string({ message: `Enter your ${label}.` })
    .trim()
    .min(1, `Enter your ${label}.`)
    .max(MAX_NAME_LENGTH, `That ${label} is too long. Keep it under ${MAX_NAME_LENGTH} characters.`);

export const updateProfileSchema = z.object({
  firstName: nameField("first name"),
  surname: nameField("surname"),
  nickname: z
    .string()
    .trim()
    .max(MAX_NICKNAME_LENGTH, `Keep your nickname under ${MAX_NICKNAME_LENGTH} characters.`)
    .optional()
    .default(""),
  phone: z
    .string()
    .trim()
    .max(MAX_PHONE_LENGTH, "That phone number is too long.")
    .optional()
    .default("")
    .refine(
      (value) => value === "" || (PHONE_SHAPE_RE.test(value) && phoneDigits(value) >= 10),
      "Enter a phone number like 0803 123 4567, or leave it empty.",
    ),
  stateCode: z
    .string()
    .trim()
    .optional()
    .default("")
    .refine(
      (value) => value === "" || (NIGERIAN_STATES as readonly string[]).includes(value),
      "Choose a state from the list, or leave it empty.",
    ),
});

export type UpdateProfileInput = z.input<typeof updateProfileSchema>;
export type UpdateProfileValues = z.output<typeof updateProfileSchema>;

/* ------------------------------------------------------------------ settings */

export type NotificationSettings = {
  bookings: boolean;
  messages: boolean;
  wallet: boolean;
  marketing: boolean;
};

export type PrivacySettings = {
  hideActivity: boolean;
};

/** The identity parts the profiles table has no column for. */
export type IdentitySettings = {
  firstName: string;
  surname: string;
  nickname: string;
  stateCode: string;
};

export type ProfileSettings = {
  notifications: NotificationSettings;
  privacy: PrivacySettings;
  locale?: LocaleCode;
  dataSaver?: boolean;
  profile?: IdentitySettings;
};

/** Settings with every optional filled in, which is what the UI renders from. */
export type ResolvedProfileSettings = Required<ProfileSettings>;

export const SETTINGS_DEFAULTS: ResolvedProfileSettings = {
  notifications: { bookings: true, messages: true, wallet: true, marketing: false },
  privacy: { hideActivity: false },
  locale: "en",
  dataSaver: false,
  profile: { firstName: "", surname: "", nickname: "", stateCode: "" },
};

/**
 * Tolerant reader for the stored blob. jsonb can hold anything a past version
 * of the app wrote, so every branch falls back to a default rather than
 * throwing: a malformed settings document must never stop the page rendering.
 */
const storedSettingsSchema = z
  .object({
    notifications: z
      .object({
        bookings: z.boolean(),
        messages: z.boolean(),
        wallet: z.boolean(),
        marketing: z.boolean(),
      })
      .partial()
      .catch({}),
    privacy: z.object({ hideActivity: z.boolean() }).partial().catch({}),
    locale: z.enum(LOCALE_CODES).optional().catch(undefined),
    dataSaver: z.boolean().optional().catch(undefined),
    profile: z
      .object({
        firstName: z.string(),
        surname: z.string(),
        nickname: z.string(),
        stateCode: z.string(),
      })
      .partial()
      .catch({}),
  })
  .partial()
  .catch({});

export function parseSettings(raw: unknown): ResolvedProfileSettings {
  const stored = storedSettingsSchema.parse(raw);
  return {
    notifications: { ...SETTINGS_DEFAULTS.notifications, ...stored.notifications },
    privacy: { ...SETTINGS_DEFAULTS.privacy, ...stored.privacy },
    locale: stored.locale ?? SETTINGS_DEFAULTS.locale,
    dataSaver: stored.dataSaver ?? SETTINGS_DEFAULTS.dataSaver,
    profile: { ...SETTINGS_DEFAULTS.profile, ...stored.profile },
  };
}

/** What a client may change through updateSettings. Identity has its own action. */
export const settingsPatchSchema = z
  .object({
    notifications: z
      .object({
        bookings: z.boolean(),
        messages: z.boolean(),
        wallet: z.boolean(),
        marketing: z.boolean(),
      })
      .partial()
      .optional(),
    privacy: z.object({ hideActivity: z.boolean() }).partial().optional(),
    locale: z.enum(LOCALE_CODES).optional(),
    dataSaver: z.boolean().optional(),
  })
  .refine((patch) => Object.values(patch).some((value) => value !== undefined), {
    message: "Nothing to save. Change a preference first.",
  });

export type SettingsPatch = z.infer<typeof settingsPatchSchema>;

/**
 * Deep merge a patch over the stored document. The merge happens on the
 * server against a fresh read, so two devices changing different toggles at
 * the same time cannot wipe each other's choice.
 */
export function mergeSettings(
  currentRaw: unknown,
  patch: SettingsPatch,
): ResolvedProfileSettings {
  const current = parseSettings(currentRaw);
  return {
    notifications: { ...current.notifications, ...patch.notifications },
    privacy: { ...current.privacy, ...patch.privacy },
    locale: patch.locale ?? current.locale,
    dataSaver: patch.dataSaver ?? current.dataSaver,
    profile: current.profile,
  };
}

/** Merge the identity block without disturbing any other preference. */
export function mergeIdentity(
  currentRaw: unknown,
  identity: IdentitySettings,
): ResolvedProfileSettings {
  const current = parseSettings(currentRaw);
  return { ...current, profile: identity };
}

/* -------------------------------------------------------------------- avatar */

/** The longest edge an avatar is stored at. The client downscales to this. */
export const AVATAR_MAX_EDGE = 512;
/** The largest upload accepted after downscaling. */
export const AVATAR_MAX_BYTES = 1_500_000;
export const AVATAR_BUCKET = "avatars";

const AVATAR_PATH_RE = /^[0-9a-f-]{36}\/[A-Za-z0-9._-]{1,80}\.(jpe?g|png|webp)$/i;

export const setAvatarSchema = z.object({
  storagePath: z
    .string({ message: "The upload did not complete. Try again." })
    .trim()
    .max(200, "That file path is too long.")
    .regex(AVATAR_PATH_RE, "The upload did not complete. Choose the photo again."),
});

export type SetAvatarInput = z.infer<typeof setAvatarSchema>;

/** The public URL a stored avatar is served from. */
export function avatarPublicUrl(supabaseUrl: string, storagePath: string): string {
  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${AVATAR_BUCKET}/${storagePath}`;
}

/* ------------------------------------------------------------------- deletion */

export const DELETE_CONFIRM_PHRASE = "DELETE MY ACCOUNT";

export const deleteAccountSchema = z.object({
  confirmPhrase: z
    .string({ message: `Type ${DELETE_CONFIRM_PHRASE} to confirm.` })
    .trim()
    .refine(
      (value) => value === DELETE_CONFIRM_PHRASE,
      `Type ${DELETE_CONFIRM_PHRASE} exactly, in capitals, to confirm.`,
    ),
});

export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;

/* ---------------------------------------------------------------- name helpers */

/** One display name from the parts, with no stray spacing. */
export function composeDisplayName(firstName: string, surname: string): string {
  return [firstName.trim(), surname.trim()].filter(Boolean).join(" ");
}

/**
 * Best effort split of a stored display name, used only when the identity
 * block is empty (rows the signup trigger created from auth metadata). The
 * first word is the first name and everything after it is the surname, so
 * compound surnames survive the round trip.
 */
export function splitDisplayName(displayName: string | null): {
  firstName: string;
  surname: string;
} {
  const parts = (displayName ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", surname: "" };
  const [first, ...rest] = parts;
  return { firstName: first ?? "", surname: rest.join(" ") };
}
