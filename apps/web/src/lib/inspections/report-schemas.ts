import { z } from "zod";
import { ROOM_ITEMS } from "./report";

/**
 * The one shape the report surface writes itself: recording a photo the
 * browser uploaded to `inspection-photos` through the signed path from
 * `createInspectionPhotoUpload` (lib/inspections/actions.ts, Session A's I1).
 * The path must sit inside this inspection's folder, which is also what the
 * bucket's own policy reads.
 */
export const photoSchema = z
  .object({
    inspectionId: z.string().uuid("That inspection could not be found."),
    storagePath: z.string().min(1),
    item: z.enum(ROOM_ITEMS).optional(),
  })
  .refine(
    (value) =>
      new RegExp(`^${value.inspectionId}/[0-9a-f-]{36}\\.(jpg|png|webp|heic|pdf)$`, "i").test(value.storagePath),
    { message: "That photo is not in this inspection's folder.", path: ["storagePath"] },
  );
