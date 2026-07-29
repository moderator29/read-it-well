"use server";

/**
 * The profile and settings loop: edit, save, reload the truth.
 *
 * Every write here goes through the caller's own RLS-bound client, so the
 * database decides whose row may change: `profiles_update_own` allows exactly
 * one row, the caller's. Settings are merged server side against a fresh read
 * rather than overwritten from the client, so a toggle flipped on a phone
 * cannot wipe one flipped on a laptop a second earlier. Nothing here writes a
 * notification: a person changing their own preferences already knows.
 *
 * Deletion is the one privileged path. It signs the person out and then asks
 * the auth admin API to remove the user, which cascades every owned row. When
 * the service key is absent the action says so plainly and deletes nothing,
 * because a delete button that quietly does nothing is worse than an honest
 * refusal.
 */

import { revalidatePath } from "next/cache";
import { fail, formDataToObject, ok, validate, type ActionResult } from "../actions/envelope";
import {
  NOT_CONFIGURED_MESSAGE,
  SIGNED_OUT_MESSAGE,
  resolveSession,
} from "../actions/session";
import { createAdminClient } from "../supabase/admin";
import { SUPABASE_URL } from "../supabase/env";
import {
  avatarPublicUrl,
  composeDisplayName,
  deleteAccountSchema,
  mergeIdentity,
  mergeSettings,
  parseSettings,
  setAvatarSchema,
  settingsPatchSchema,
  updateProfileSchema,
  type ResolvedProfileSettings,
  type SettingsPatch,
} from "./schema";

const SUPPORT_EMAIL = "hello@rentme.ng";

const NO_ROW_MESSAGE =
  "We could not find your profile record. Sign out, sign back in, and try again. Your details are still on this screen.";

const SAVE_FAILED_MESSAGE =
  "We could not save that just now. Your details are still on this screen, so try again in a moment.";

const SETTINGS_FAILED_MESSAGE =
  "That preference did not save. It has been put back as it was. Check your connection and try again.";

const AVATAR_FAILED_MESSAGE =
  "The photo uploaded but we could not attach it to your profile. Try choosing it again.";

const AVATAR_FOREIGN_PATH_MESSAGE =
  "That photo was not uploaded to your own folder. Choose the photo again.";

const DELETE_GATED_MESSAGE =
  `Account deletion completes the moment the platform keys land, and nothing has been deleted today. Email ${SUPPORT_EMAIL} and the team will remove your account by hand.`;

const DELETE_FAILED_MESSAGE =
  `We could not complete the deletion just now. Your account is untouched. Try again shortly, or email ${SUPPORT_EMAIL}.`;

/** True when the platform holds a service role key it can act with. */
function hasServiceRoleKey(): boolean {
  return (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").length > 0;
}

/* ------------------------------------------------------------------- profile */

/** What a successful profile save hands back to re-render the card. */
export type ProfileSaved = {
  displayName: string;
  firstName: string;
  surname: string;
  nickname: string;
  phone: string;
  stateCode: string;
};

export async function updateProfile(input: unknown): Promise<ActionResult<ProfileSaved>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  const parsed = validate(updateProfileSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const values = parsed.data;

  const { supabase, user } = session;

  // Read the current blob so the identity block merges into it instead of
  // replacing every other preference the person has set.
  const { data: current, error: readError } = await supabase
    .from("profiles")
    .select("settings")
    .eq("id", user.id)
    .maybeSingle();
  if (readError) return fail(SAVE_FAILED_MESSAGE);
  if (!current) return fail(NO_ROW_MESSAGE);

  const identity = {
    firstName: values.firstName,
    surname: values.surname,
    nickname: values.nickname,
    stateCode: values.stateCode,
  };
  const settings = mergeIdentity(current.settings, identity);
  const displayName = composeDisplayName(values.firstName, values.surname);

  const { data: saved, error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      phone: values.phone === "" ? null : values.phone,
      settings,
    })
    .eq("id", user.id)
    .select("display_name, phone, settings")
    .maybeSingle();

  if (error) return fail(SAVE_FAILED_MESSAGE);
  if (!saved) return fail(NO_ROW_MESSAGE);

  revalidatePath("/profile");
  revalidatePath("/settings");

  const savedIdentity = parseSettings(saved.settings).profile;
  return ok({
    displayName: saved.display_name ?? displayName,
    firstName: savedIdentity.firstName,
    surname: savedIdentity.surname,
    nickname: savedIdentity.nickname,
    phone: saved.phone ?? "",
    stateCode: savedIdentity.stateCode,
  });
}

/** Form binding for useActionState. */
export async function updateProfileAction(
  _prev: ActionResult<ProfileSaved> | null,
  formData: FormData,
): Promise<ActionResult<ProfileSaved>> {
  return updateProfile(formDataToObject(formData));
}

/* ------------------------------------------------------------------ settings */

export async function updateSettings(
  patch: SettingsPatch,
): Promise<ActionResult<ResolvedProfileSettings>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  const parsed = validate(settingsPatchSchema, patch);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const { supabase, user } = session;

  const { data: current, error: readError } = await supabase
    .from("profiles")
    .select("settings")
    .eq("id", user.id)
    .maybeSingle();
  if (readError) return fail(SETTINGS_FAILED_MESSAGE);
  if (!current) return fail(NO_ROW_MESSAGE);

  const merged = mergeSettings(current.settings, parsed.data);

  const { data: saved, error } = await supabase
    .from("profiles")
    .update({ settings: merged })
    .eq("id", user.id)
    .select("settings")
    .maybeSingle();

  if (error) return fail(SETTINGS_FAILED_MESSAGE);
  if (!saved) return fail(NO_ROW_MESSAGE);

  revalidatePath("/settings");
  return ok(parseSettings(saved.settings));
}

/* -------------------------------------------------------------------- avatar */

export async function setAvatar(input: unknown): Promise<ActionResult<{ avatarUrl: string }>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  const parsed = validate(setAvatarSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const { supabase, user } = session;
  const { storagePath } = parsed.data;

  // Storage policy already confines writes to the caller's own folder. This
  // second check means a forged path can never be recorded on the row either.
  if (!storagePath.startsWith(`${user.id}/`)) return fail(AVATAR_FOREIGN_PATH_MESSAGE);

  const avatarUrl = avatarPublicUrl(SUPABASE_URL, storagePath);

  const { data: saved, error } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", user.id)
    .select("avatar_url")
    .maybeSingle();

  if (error) return fail(AVATAR_FAILED_MESSAGE);
  if (!saved) return fail(NO_ROW_MESSAGE);

  revalidatePath("/profile");
  return ok({ avatarUrl: saved.avatar_url ?? avatarUrl });
}

/* ------------------------------------------------------------------ sign out */

export async function signOut(): Promise<ActionResult<null>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return ok(null);

  const { error } = await session.supabase.auth.signOut();
  if (error) {
    return fail("We could not sign you out just now. Check your connection and try again.");
  }

  revalidatePath("/", "layout");
  return ok(null);
}

/* ------------------------------------------------------------------ deletion */

export async function deleteAccount(input: unknown): Promise<ActionResult<null>> {
  const parsed = validate(deleteAccountSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(DELETE_GATED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  if (!hasServiceRoleKey()) return fail(DELETE_GATED_MESSAGE);

  const { supabase, user } = session;

  // Sign out first so the browser is never left holding a session for a user
  // that no longer exists.
  await supabase.auth.signOut();

  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) return fail(DELETE_FAILED_MESSAGE);
  } catch {
    return fail(DELETE_FAILED_MESSAGE);
  }

  revalidatePath("/", "layout");
  return ok(null);
}

/** Form binding for useActionState in the confirmation drawer. */
export async function deleteAccountAction(
  _prev: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null>> {
  return deleteAccount(formDataToObject(formData));
}
