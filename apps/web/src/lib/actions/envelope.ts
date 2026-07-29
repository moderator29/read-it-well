import { z } from "zod";

/**
 * The one result shape every server action returns.
 *
 * A mutation either succeeded with data, or failed with a plain-language
 * message and, when a form was involved, per-field errors keyed by input name.
 * Uniformity is the point: thirty forms stay honest because they all speak
 * this envelope, and the UI never has to guess what an error looks like.
 * Error messages state what happened and what to do next, never raw codes.
 */
export type ActionResult<T = null> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail<T = null>(
  error: string,
  fieldErrors?: Record<string, string>,
): ActionResult<T> {
  return { ok: false, error, ...(fieldErrors ? { fieldErrors } : {}) };
}

/**
 * Validate unknown input against a Zod schema into the envelope. On failure
 * the first issue per field becomes that field's message, so forms can light
 * up exactly the inputs that need attention.
 */
export function validate<S extends z.ZodType>(
  schema: S,
  input: unknown,
): { ok: true; data: z.infer<S> } | { ok: false; error: string; fieldErrors: Record<string, string> } {
  const parsed = schema.safeParse(input);
  if (parsed.success) return { ok: true, data: parsed.data };

  const fieldErrors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "_";
    if (!(key in fieldErrors)) fieldErrors[key] = issue.message;
  }
  return {
    ok: false,
    error: "Please check the highlighted fields and try again.",
    fieldErrors,
  };
}

/** Read FormData into a plain object Zod can parse (multi-values join last-wins). */
export function formDataToObject(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") out[key] = value.trim();
  }
  return out;
}
