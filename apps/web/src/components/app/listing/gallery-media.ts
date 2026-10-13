import { mergeMedia } from "@/lib/listings/media-order";

/**
 * ONE SLIDE OF A LISTING'S GALLERY: a photo, or a video shown by its still
 * until somebody presses "Watch video".
 *
 * The gallery, the full-screen viewer and the "Show all" grid all take this
 * list, in the order the lister arranged (cover first, always a photo), so a
 * video is a slide among the photos rather than a section of its own
 * (founder, 13 October). The three components still take a plain `photos`
 * list too, which is what the stay and restaurant pages pass.
 */
export type GalleryMedia =
  | { kind: "photo"; src: string }
  | { kind: "video"; src: string; poster: string | null; durationSeconds: number | null };

export function photosAsMedia(photos: readonly string[]): GalleryMedia[] {
  return photos.map((src) => ({ kind: "photo", src }));
}

/**
 * A listing's photos (already in their order) and videos (each with the place
 * in the row the lister gave it, `lib/listings/media-order.ts`) as one row.
 */
export function listingMedia(
  photos: readonly string[],
  videos: readonly { url: string; posterUrl: string | null; durationSeconds: number | null; position?: number }[] | undefined,
): GalleryMedia[] {
  return mergeMedia(
    photos.map((src, position) => ({ src, position })),
    (videos ?? []).map((video, index) => ({ ...video, position: video.position ?? index + 1 })),
  ).map((entry) =>
    entry.kind === "photo"
      ? { kind: "photo", src: entry.item.src }
      : { kind: "video", src: entry.item.url, poster: entry.item.posterUrl, durationSeconds: entry.item.durationSeconds },
  );
}

/** "0:42". */
export function clockOf(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(Math.round(seconds) % 60).padStart(2, "0")}`;
}
