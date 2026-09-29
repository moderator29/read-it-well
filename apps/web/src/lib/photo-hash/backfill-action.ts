"use server";

import { revalidatePath } from "next/cache";
import { getDictionary } from "@vallo/i18n";
import { fail, ok, type ActionResult } from "../actions/envelope";
import { adminRefusal, requireAdmin } from "../admin/guard";
import { backfillPhotoHashes } from "./hash-server";

/** V-45: staff hash the next batch of photographs uploaded before hashing existed. */
export async function runPhotoBackfill(): Promise<ActionResult<{ hashed: number }>> {
  const desk = getDictionary("en").trustVisible.desk;
  /* Listing-approval staff see the provenance panel, so they can run the backfill that fills it. */
  const access = await requireAdmin("listing_approval");
  if (access.state !== "admin") return fail(adminRefusal(access));
  const hashed = await backfillPhotoHashes();
  if (hashed === null) return fail(desk.photosNotCompared);
  revalidatePath("/admin/listings");
  return ok({ hashed });
}
