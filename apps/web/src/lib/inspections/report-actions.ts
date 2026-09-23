"use server";

import { revalidatePath } from "next/cache";
import { resolveSession } from "../actions/session";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { reportStorageLive } from "./report-flag";
import { photoSchema } from "./report-schemas";
import { REPORT_NOT_YET } from "./report";

/**
 * RECORDING A REPORT PHOTO, the one narrow write the report needs beyond
 * Session A's `saveInspectionReport` (lib/inspections/actions.ts, I1).
 *
 * The browser uploads to `inspection-photos` through the signed path from
 * `createInspectionPhotoUpload`, then this inserts the row into
 * `inspection_report_photos`. `inspection_report_photos_write_party` decides
 * who may (a party of a CONFIRMED inspection whose report is not submitted);
 * nothing here re-implements it. Off the flag it refuses and writes nothing.
 */
export async function recordReportPhoto(input: unknown): Promise<ActionResult<null>> {
  const parsed = validate(photoSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  if (!reportStorageLive()) return fail(REPORT_NOT_YET);
  const session = await resolveSession();
  if (session.state !== "signed-in") return fail("Sign in to add photos.");
  const { error } = await session.supabase.from("inspection_report_photos").insert({
    inspection_id: parsed.data.inspectionId,
    item: parsed.data.item ?? null,
    storage_path: parsed.data.storagePath,
  });
  if (error) {
    return fail(
      /row-level security/i.test(error.message)
        ? "Photos can be added while the inspection is scheduled and the report is not yet submitted."
        : "We could not save that photo. Try again in a moment.",
    );
  }
  revalidatePath("/inspections");
  revalidatePath("/agent/inspections");
  return ok(null);
}
