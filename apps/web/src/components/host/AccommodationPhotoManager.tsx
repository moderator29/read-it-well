"use client";

import { addAccommodationPhoto, removeAccommodationPhoto } from "@/lib/host/actions";
import { MAX_BUSINESS_PHOTOS } from "@/lib/host/photos";
import { PhotoManager } from "./PhotoManager";

/**
 * The host's photographs of their PROPERTY, on the `accommodation_photos`
 * spine.
 *
 * THE SURFACE THAT DID NOT EXIST, and whose absence was the hardest dead end
 * in the product: `missingFrom` blocks submission when an accommodation
 * carries no photograph, the table and bucket were built in M3, and no
 * application code ever wrote to them. Every hotel and every shortlet stopped
 * at the review step with a requirement nothing could meet.
 *
 * A named door onto `PhotoManager`, exactly as `BusinessPhotoManager` is. This
 * file decides only which table the photographs land in and the words a
 * property host reads. The guidance is a hotel's and a shortlet's rather than
 * a restaurant's, because the picture that sells a room is not the picture
 * that sells a table.
 */
export function AccommodationPhotoManager({
  accommodationId,
  userId,
  photos,
}: {
  accommodationId: string;
  userId: string;
  /** What is on record, cover first. */
  photos: { id: string; url: string }[];
}) {
  return (
    <PhotoManager
      subjectId={accommodationId}
      userId={userId}
      photos={photos}
      copy={{
        title: "Photographs of the property",
        guidance:
          "The room made up as a guest walks into it, the bathroom, the view from the window, the frontage so somebody can recognise it from the street, and anything a guest uses: the pool, the generator house, the parking. A phone camera in good light beats a bad professional shoot.",
        ofSubject: "of your property",
        fullNote: `That is ${MAX_BUSINESS_PHOTOS} photographs, which is as many as a property carries. Take one down to add another.`,
      }}
      add={({ storagePath }) => addAccommodationPhoto({ accommodationId, storagePath })}
      remove={({ photoId }) => removeAccommodationPhoto({ photoId })}
    />
  );
}
