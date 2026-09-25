"use client";

import Image from "next/image";
import { useEffect, useState, type RefObject } from "react";

/**
 * A card's photographs, swipeable where there are several (Track M).
 *
 * NATIVE SCROLL SNAP, NO GESTURE CODE. The track is a horizontal scroller
 * with one photograph per snap point, so a thumb swipes it at the
 * compositor's speed and a tap still opens the listing (a scroll cancels the
 * click, a tap does not). On a pointer, the arrow buttons the card draws
 * outside its link scroll the same track. The dots under the photograph say
 * how many there are and which one is showing.
 *
 * Five at most, and only the first loads eagerly; the rest are lazy and
 * never load until swiped towards. Data saver gets the first only, which is
 * what the card drew before.
 */
export const CARD_PHOTO_MAX = 5;

export function CardPhotos({
  photos,
  sizes,
  trackRef,
  onIndex,
}: {
  photos: string[];
  sizes: string;
  trackRef: RefObject<HTMLDivElement | null>;
  onIndex?: (index: number) => void;
}) {
  const shown = photos.slice(0, CARD_PHOTO_MAX);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || shown.length < 2) return;
    let frame = 0;
    const read = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const next = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
        setIndex(next);
        onIndex?.(next);
      });
    };
    track.addEventListener("scroll", read, { passive: true });
    return () => {
      track.removeEventListener("scroll", read);
      cancelAnimationFrame(frame);
    };
  }, [trackRef, shown.length, onIndex]);

  if (shown.length < 2) {
    const only = shown[0];
    return only ? <Image src={only} alt="" fill sizes={sizes} className="object-cover" /> : null;
  }

  return (
    <>
      <div ref={trackRef} className="nf-card-photos">
        {shown.map((src, i) => (
          <div key={`${src}-${i}`} className="nf-card-photos__slide">
            <Image src={src} alt="" fill sizes={sizes} className="object-cover" loading={i === 0 ? undefined : "lazy"} />
          </div>
        ))}
      </div>
      <span className="nf-card-photos__dots" aria-hidden="true">
        {shown.map((src, i) => (
          <span key={`${src}-dot-${i}`} data-on={i === index ? "true" : undefined} />
        ))}
      </span>
    </>
  );
}
