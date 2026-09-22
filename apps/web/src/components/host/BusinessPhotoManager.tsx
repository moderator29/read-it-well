"use client";

import { addBusinessPhoto, removeBusinessPhoto } from "@/lib/host/actions";
import { MAX_BUSINESS_PHOTOS } from "@/lib/host/photos";
import { PhotoManager } from "./PhotoManager";

/**
 * The owner's photographs of their VENUE, on the `business_photos` spine.
 *
 * A named door onto `PhotoManager`, which carries the whole argument for the
 * anatomy, the upload and the cover. This file decides only two things: which
 * table the photographs land in, and the words a venue owner reads. The
 * accommodation twin is `AccommodationPhotoManager`, and they share one body
 * so the two surfaces cannot come to disagree about the cover, the ceiling or
 * a refusal.
 */
export function BusinessPhotoManager({
  businessId,
  userId,
  photos,
}: {
  businessId: string;
  userId: string;
  /** What is on record, cover first. */
  photos: { id: string; url: string }[];
}) {
  return (
    <PhotoManager
      subjectId={businessId}
      userId={userId}
      photos={photos}
      copy={{
        title: "Photographs of the venue",
        guidance:
          "The room as a guest first sees it, a table laid, the frontage so somebody can recognise it from the street, and two or three plates you are known for. A phone camera in good light beats a bad professional shoot.",
        ofSubject: "of your venue",
        fullNote: `That is ${MAX_BUSINESS_PHOTOS} photographs, which is as many as a venue carries. Take one down to add another.`,
      }}
      add={({ storagePath }) => addBusinessPhoto({ businessId, storagePath })}
      remove={({ photoId }) => removeBusinessPhoto({ photoId })}
    />
  );
}
