"use client";

import { UiIcon } from "@/design-system/icons/UiIcon";
import { AreaMapTile } from "@/components/app/maps/AreaMapTile";
import { usePhotoViewer } from "./PhotoViewer";

/**
 * THE LISTING'S MAP TAB (the founder's travel-app set, 7 October: "a route
 * map card, three stat tiles, two media tiles").
 *
 * A still map of the AREA with its pin (never the address; the exact place
 * is `ExactPlace`'s, for a party with a confirmed viewing or an agreement),
 * the place in words, then "getting there" as stat tiles ONLY where both ends
 * are known to us: today the city's airport, as a straight line from the
 * area's centroid, said to be a straight line. The rush-hour bands to the
 * member's own anchors stay in their own section, the one place a travel
 * time is printed. Then Preview (the walkthrough, when there is one) and
 * Photo tour (the lightbox from the first photograph), as two equal tiles.
 * Anything we cannot know is simply not drawn.
 */
export type ListingMapCopy = {
  areaOnly: string;
  mapOf: string;
  airport: string;
  airportBasis: string;
  km: string;
  preview: string;
  previewHint: string;
  photoTour: string;
  photoTourHint: string;
};

export function ListingMapPanel({
  where,
  area,
  point,
  airport,
  hasWalkthrough,
  photoCount,
  copy,
}: {
  where: string;
  area: string;
  point: { lat: number; lng: number } | null;
  airport: { name: string; km: number } | null;
  hasWalkthrough: boolean;
  photoCount: number;
  copy: ListingMapCopy;
}) {
  const viewer = usePhotoViewer();
  return (
    <div className="nf-lmap" data-testid="listing-map">
      {point ? (
        <div className="nf-lmap__card">
          <AreaMapTile
            lat={point.lat}
            lng={point.lng}
            zoom={14}
            className="nf-lmap__map"
            label={copy.mapOf.replace("{area}", area)}
            credits
          />
          <div className="nf-lmap__place">
            <UiIcon name="location" size={16} className="nf-lmap__glyph" />
            <span className="min-w-0">{where}</span>
          </div>
          <p className="nf-lmap__note">{copy.areaOnly}</p>
        </div>
      ) : (
        <div className="nf-lmap__card nf-lmap__place">
          <UiIcon name="location" size={16} className="nf-lmap__glyph" />
          <span className="min-w-0">{where}</span>
        </div>
      )}

      {point && airport ? (
        <div className="nf-lmap__stats" data-testid="listing-getting-there">
          <div className="nf-lmap__stat">
            <p className="nf-lmap__stat-label">{copy.airport.replace("{name}", airport.name)}</p>
            <p className="nf-lmap__stat-figure nf-numeric">
              {airport.km}
              <span className="nf-lmap__unit"> {copy.km}</span>
            </p>
            <p className="nf-lmap__stat-basis">{copy.airportBasis.replace("{area}", area)}</p>
          </div>
        </div>
      ) : null}

      {hasWalkthrough || photoCount > 0 ? (
        <div className="nf-lmap__media">
          {hasWalkthrough ? (
            <a href="#walkthrough" className="nf-lmap__tile nf-tap">
              <span className="nf-lmap__tile-glyph" aria-hidden="true">
                <UiIcon name="circle-play" size={20} />
              </span>
              <span className="nf-lmap__tile-title">{copy.preview}</span>
              <span className="nf-lmap__tile-hint">{copy.previewHint}</span>
            </a>
          ) : null}
          {photoCount > 0 ? (
            <button
              type="button"
              className="nf-lmap__tile nf-tap"
              onClick={(event) => viewer?.open(0, event.currentTarget.getBoundingClientRect())}
              disabled={!viewer}
            >
              <span className="nf-lmap__tile-glyph" aria-hidden="true">
                <UiIcon name="picture" size={20} />
              </span>
              <span className="nf-lmap__tile-title">{copy.photoTour}</span>
              <span className="nf-lmap__tile-hint nf-numeric">
                {copy.photoTourHint.replace("{count}", String(photoCount))}
              </span>
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
