import { ListingGallery } from "@/components/app/listing/ListingGallery";
import { ListingPhotoGrid } from "@/components/app/listing/ListingPhotoGrid";
import { PhotoViewerProvider } from "@/components/app/listing/PhotoViewer";
import { listingMedia } from "@/components/app/listing/gallery-media";
import { RENTAL } from "../fixtures";

/**
 * A MIXED GALLERY: five photos and two videos in the lister's order, cover
 * first, as the listing page draws them (founder, 13 October). The videos'
 * stills are fixture photos; their files do not exist, so pressing "Watch
 * video" here shows the player over the still and nothing more.
 */
const PHOTOS = RENTAL.photos.slice(0, 5);
const VIDEOS = [
  { url: "/preview/walkthrough-a.mp4", posterUrl: RENTAL.photos[6]!, durationSeconds: 42, position: 1 },
  { url: "/preview/walkthrough-b.mp4", posterUrl: RENTAL.photos[7]!, durationSeconds: 18, position: 4 },
];

export default function ListingMediaPreview() {
  const media = listingMedia(PHOTOS, VIDEOS);
  return (
    <PhotoViewerProvider title={RENTAL.title} photos={PHOTOS} media={media} hue={RENTAL.hue} kind={RENTAL.kind}>
      <div className="mx-auto max-w-5xl">
        <ListingGallery
          listingId={RENTAL.id}
          title={RENTAL.title}
          hue={RENTAL.hue}
          kind={RENTAL.kind}
          photos={PHOTOS}
          media={media}
          backFallback="/preview/f3"
        />
        <div className="relative z-10 mt-lg">
          <ListingPhotoGrid photos={PHOTOS} media={media} hue={RENTAL.hue} kind={RENTAL.kind} title={RENTAL.title} />
        </div>
      </div>
    </PhotoViewerProvider>
  );
}
