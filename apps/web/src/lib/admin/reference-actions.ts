"use server";

/**
 * The platform's own vocabulary, editable.
 *
 * `public.occupations` and `public.local_governments` are closed lists every
 * profile picks from, which is what makes "Architect" one value the whole
 * platform can filter on instead of four spellings. A closed list nobody can
 * edit is a list that goes stale: a state creates a local government, a trade
 * appears that nobody had a word for in 2026, and there is no way to add either
 * without a migration and a deploy.
 *
 * Both tables carry `for all` admin policies, so every write here goes through
 * the admin's own RLS-bound client and Postgres re-checks the role. The service
 * role does one thing only: append the audit line, because `audit_log` has no
 * insert policy for anybody, deliberately.
 *
 * Deleting is deliberately not offered. Both columns are referenced by
 * `public.profiles` with `on delete set null`, so a delete would quietly empty
 * the answer of every person who had chosen it, with no way to tell who. A
 * wrong row is renamed, not removed.
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, formDataToObject, ok, validate, type ActionResult } from "../actions/envelope";
import { writeAudit } from "./audit";
import { adminRefusal, requireAdmin } from "./guard";
import { createAdminClient } from "../supabase/admin";

const SERVICE_DOWN =
  "The console could not reach the platform data just now. Nothing was changed. Please try again.";
const DUPLICATE_CODE =
  "That code is already taken. Codes are the value stored on every profile, so each one has to be unique.";
const DUPLICATE_NAME =
  "That state already has a local government by that name. Two rows with one name cannot be told apart in a picker.";
const UNKNOWN_STATE = "That is not one of the 37 states. Choose one from the list.";
const GONE = "That row is no longer there. Refresh the page to see the current list.";

const CODE_RE = /^[a-z0-9_]{2,60}$/;
const LGA_CODE_RE = /^[a-z]{2}_[a-z0-9_]{2,60}$/;

const occupationSchema = z.object({
  code: z
    .string()
    .trim()
    .toLowerCase()
    .regex(CODE_RE, "Codes are lower case letters, numbers and underscores, 2 to 60 characters."),
  name: z.string().trim().min(2, "Give it a name.").max(80, "Keep the name under 80 characters."),
  category: z
    .string()
    .trim()
    .min(2, "Give it a category. The picker groups by this.")
    .max(80, "Keep the category under 80 characters."),
  sortOrder: z.coerce
    .number()
    .int("Sort order is a whole number.")
    .min(0, "Sort order cannot be negative.")
    .max(9999, "Sort order tops out at 9999.")
    .default(0),
});

const localGovernmentSchema = z.object({
  code: z
    .string()
    .trim()
    .toLowerCase()
    .regex(LGA_CODE_RE, "Codes look like la_ikeja: the state code, an underscore, then the name."),
  stateCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, "Choose a state from the list."),
  name: z.string().trim().min(2, "Give it a name.").max(80, "Keep the name under 80 characters."),
});

/* ------------------------------------------------------------ occupations */

export async function saveOccupation(
  _prev: ActionResult<{ code: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ code: string }>> {
  const access = await requireAdmin();
  if (access.state !== "admin") return fail(adminRefusal(access));

  const raw = formDataToObject(formData);
  const mode = raw.mode === "edit" ? "edit" : "create";
  const parsed = validate(occupationSchema, raw);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const { code, name, category, sortOrder } = parsed.data;

  try {
    if (mode === "edit") {
      const { data, error } = await access.supabase
        .from("occupations")
        .update({ name, category, sort_order: sortOrder })
        .eq("code", code)
        .select("code")
        .maybeSingle();
      if (error) return fail(SERVICE_DOWN);
      if (!data) return fail(GONE);
    } else {
      const { error } = await access.supabase
        .from("occupations")
        .insert({ code, name, category, sort_order: sortOrder });
      if (error) {
        if (error.code === "23505") return fail(DUPLICATE_CODE, { code: DUPLICATE_CODE });
        return fail(SERVICE_DOWN);
      }
    }
  } catch {
    return fail(SERVICE_DOWN);
  }

  await writeAudit(createAdminClient(), {
    actorId: access.user.id,
    action: mode === "edit" ? "reference.occupation.update" : "reference.occupation.create",
    entityType: "occupation",
    entityId: code,
    detail: { name, category, sortOrder },
  });

  revalidatePath("/admin/reference");
  return ok({ code });
}

/* ------------------------------------------------------ local governments */

export async function saveLocalGovernment(
  _prev: ActionResult<{ code: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ code: string }>> {
  const access = await requireAdmin();
  if (access.state !== "admin") return fail(adminRefusal(access));

  const raw = formDataToObject(formData);
  const mode = raw.mode === "edit" ? "edit" : "create";
  const parsed = validate(localGovernmentSchema, raw);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const { code, stateCode, name } = parsed.data;

  try {
    if (mode === "edit") {
      const { data, error } = await access.supabase
        .from("local_governments")
        .update({ state_code: stateCode, name })
        .eq("code", code)
        .select("code")
        .maybeSingle();
      if (error) return fail(referenceError(error));
      if (!data) return fail(GONE);
    } else {
      const { error } = await access.supabase
        .from("local_governments")
        .insert({ code, state_code: stateCode, name });
      if (error) return fail(referenceError(error));
    }
  } catch {
    return fail(SERVICE_DOWN);
  }

  await writeAudit(createAdminClient(), {
    actorId: access.user.id,
    action:
      mode === "edit" ? "reference.local_government.update" : "reference.local_government.create",
    entityType: "local_government",
    entityId: code,
    detail: { stateCode, name },
  });

  revalidatePath("/admin/reference");
  return ok({ code });
}

/**
 * Two unique constraints and one foreign key, each with its own sentence.
 *
 * `local_governments_pkey` is the code, `local_governments_state_code_name_key`
 * is the pairing, and 23503 is a state that does not exist. Telling an operator
 * "duplicate key value violates unique constraint" would be telling them
 * nothing they can act on.
 */
function referenceError(error: { code?: string; message?: string }): string {
  if (error.code === "23505") {
    return (error.message ?? "").includes("name") ? DUPLICATE_NAME : DUPLICATE_CODE;
  }
  if (error.code === "23503") return UNKNOWN_STATE;
  return SERVICE_DOWN;
}
