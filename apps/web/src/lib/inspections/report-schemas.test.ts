import { describe, expect, it } from "vitest";
import { photoSchema } from "./report-schemas";

const ID = "00000000-0000-4000-8000-00000000d001";
const PHOTO = "11111111-1111-4111-8111-111111111111";

describe("recording a report photo", () => {
  it("takes a path only inside this inspection's folder, with a bucket extension", () => {
    expect(photoSchema.safeParse({ inspectionId: ID, storagePath: `${ID}/${PHOTO}.jpg` }).success).toBe(true);
    expect(photoSchema.safeParse({ inspectionId: ID, storagePath: `${ID}/${PHOTO}.pdf` }).success).toBe(true);
    expect(photoSchema.safeParse({ inspectionId: ID, storagePath: `other/${PHOTO}.jpg` }).success).toBe(false);
    expect(photoSchema.safeParse({ inspectionId: ID, storagePath: `${ID}/../${PHOTO}.jpg` }).success).toBe(false);
    expect(photoSchema.safeParse({ inspectionId: ID, storagePath: `${ID}/${PHOTO}.exe` }).success).toBe(false);
  });
});
