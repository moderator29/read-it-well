"use client";

import Image from "next/image";
import { useState } from "react";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Sheet } from "@/components/ui/Sheet";
import { PhotoFrame } from "./PhotoFrame";
import { usePhotoViewer } from "./PhotoViewer";

/**
 * The photo grid.
 *
 * Reference 3 puts a real gallery grid in the content sheet with a "Show all"
 * action beside the section heading. This platform had neither: the only way to
 * see a listing's photography was to swipe the hero, there was no grid, no
 * count, and tapping a photo did nothing at all.
 *
 * The grid shows the first six frames. When there are more, the last tile
 * carries the remainder as a "+N" cap rather than silently truncating, and the
 * heading's trailing action opens a sheet holding the whole set - the brief's
 * "section header paired with a muted trailing action", which until now existed
 * on exactly one screen.
 *
 * Both the grid and the sheet open the shared lightbox rather than owning one.
 * Picking a photo in the sheet closes the sheet first, so scroll locking and
 * focus restoration never nest.
 */

const PREVIEW = 6;

export function ListingPhotoGrid({
  photos,
  hue,
  /** Only used for the sheet's accessible name. */
  title,
}: {
  photos: string[];
  hue: number;
  title: string;
}) {
  const viewer = usePhotoViewer();
  const [showAll, setShowAll] = useState(false);

  // The hero already is the photograph when there is only one. A grid of one
  // tile states nothing the reader cannot already see.
  if (photos.length < 2) return null;

  const preview = photos.slice(0, PREVIEW);
  const remainder = photos.length - preview.length;

  function open(index: number) {
    setShowAll(false);
    viewer?.open(index);
  }

  return (
    <section data-testid="listing-photo-grid">
      <div className="mb-3.5 flex items-baseline justify-between gap-4">
        <h2 className="nf-h3">Photos</h2>
        <button
          type="button"
          onClick={() => setShowAll(true)}
          data-testid="photos-show-all"
          className="inline-flex min-h-[2.75rem] items-center gap-1.5 text-[0.875rem] font-semibold text-[var(--nf-content-secondary)] transition-colors hover:text-[var(--nf-content-primary)] motion-reduce:transition-none"
        >
          <UiIcon name="grid" size={16} />
          Show all {photos.length}
        </button>
      </div>

      <ul className="grid grid-cols-3 gap-2">
        {preview.map((photo, i) => {
          const last = i === preview.length - 1 && remainder > 0;
          return (
            <li key={`${photo}-${i}`}>
              <button
                type="button"
                onClick={() => open(i)}
                aria-label={
                  last
                    ? `View all ${photos.length} photos`
                    : `View photo ${i + 1} of ${photos.length} full screen`
                }
                className="relative block aspect-square w-full overflow-hidden rounded-[var(--nf-radius-md)] transition-transform active:scale-[0.97] motion-reduce:transition-none"
              >
                <Tile photo={photo} hue={hue} index={i} sizes="(max-width: 640px) 33vw, 220px" />
                {last && (
                  <span className="nf-numeric absolute inset-0 grid place-items-center bg-black/55 text-[1.0625rem] font-bold text-white backdrop-blur-[2px]">
                    +{remainder}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <Sheet open={showAll} onOpenChange={setShowAll} title={`${title} photos`}>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {photos.map((photo, i) => (
            <li key={`all-${photo}-${i}`}>
              <button
                type="button"
                onClick={() => open(i)}
                aria-label={`View photo ${i + 1} of ${photos.length} full screen`}
                className="relative block aspect-[4/3] w-full overflow-hidden rounded-[var(--nf-radius-md)] transition-transform active:scale-[0.97] motion-reduce:transition-none"
              >
                <Tile photo={photo} hue={hue} index={i} sizes="(max-width: 640px) 50vw, 220px" />
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </section>
  );
}

/** One thumbnail, falling back to the listing's branded frame if it will not load. */
function Tile({
  photo,
  hue,
  index,
  sizes,
}: {
  photo: string;
  hue: number;
  index: number;
  sizes: string;
}) {
  const [broken, setBroken] = useState(false);
  return (
    <>
      <PhotoFrame hue={hue} index={index} />
      {!broken && (
        <Image
          src={photo}
          alt=""
          fill
          sizes={sizes}
          onError={() => setBroken(true)}
          className="object-cover"
        />
      )}
    </>
  );
}
