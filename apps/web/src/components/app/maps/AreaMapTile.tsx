"use client";

import { useAppliedTheme } from "@/lib/theme/theme-client";
import { tileProvider, warnIfNonCommercialTiles } from "@/lib/maps/tiles";
import { useEffect, useState } from "react";
import "@/app/css/map.css";

/**
 * A STILL MAP OF THE AREA, WITH ITS PIN (the founder's travel-app set, 7
 * October: "a small map tile with a pin"; the listing's Map tab).
 *
 * WHERE THE PIN STANDS. At the AREA, never at the address. The search map
 * already places every listing at its locality's centroid and says "Pins show
 * the area, not the address"; the exact place is a separate read that only a
 * party with a confirmed viewing or an agreement may make (`ExactPlace`). A
 * still tile that put the pin on the listing's own coordinate would publish
 * what the live map deliberately does not, so the caller passes the area's
 * centroid (`areaPoint`) and nothing else.
 *
 * HOW IT DRAWS. The same tile server and style the live map uses
 * (`tileProvider`), four tiles at one zoom, laid so the point sits at the
 * centre of the frame; no map engine, no script beyond this. The credit line
 * is the caller's to show once per screen. On a data-saver connection, or if
 * a tile fails, the frame keeps its quiet ground and the pin, which still
 * says where on the screen's own terms.
 */
const TILE = 256;

/** The map data credit for whichever tile server is drawing, as links. */
export function MapCredits({ className }: { className?: string }) {
  const theme = useAppliedTheme();
  const provider = tileProvider(theme === "light" ? "light" : "dark");
  return (
    <span className={className}>
      {provider.credits.map((credit, index) => (
        <span key={credit.href}>
          {index > 0 ? " · " : "© "}
          <a href={credit.href} target="_blank" rel="noreferrer">
            {credit.label}
          </a>
        </span>
      ))}
    </span>
  );
}

function project(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const scale = TILE * 2 ** zoom;
  const x = ((lng + 180) / 360) * scale;
  const s = Math.sin((lat * Math.PI) / 180);
  const y = (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * scale;
  return { x, y };
}

export function AreaMapTile({
  lat,
  lng,
  zoom = 14,
  className,
  label,
  credits = false,
}: {
  lat: number;
  lng: number;
  zoom?: number;
  className?: string;
  /** What the tile shows, for a screen reader: "Map of Lekki Phase 1". */
  label: string;
  /** Draw the map data credit inside the frame (a large tile); a small one
      leaves it to a single credit line elsewhere on the screen. */
  credits?: boolean;
}) {
  const theme = useAppliedTheme();
  const [quiet, setQuiet] = useState(false);
  /* Data saver hides the tiles in CSS (`[data-save-data="on"]`, map.css), and
     a hidden lazy image is never fetched; nothing to decide here. */
  useEffect(() => {
    warnIfNonCommercialTiles();
  }, []);
  const provider = tileProvider(theme === "light" ? "light" : "dark");
  const point = project(lat, lng, zoom);
  /* The 2 x 2 block whose middle is nearest the point. */
  const tx = Math.round(point.x / TILE) - 1;
  const ty = Math.round(point.y / TILE) - 1;
  const left = point.x - tx * TILE;
  const top = point.y - ty * TILE;
  const tiles = [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ] as const;

  return (
    <span className={["nf-area-tile", className ?? ""].filter(Boolean).join(" ")}>
      {!quiet && (
        <span
          className="nf-area-tile__sheet"
          style={{ transform: `translate(${-left}px, ${-top}px)` }}
          aria-hidden="true"
        >
          {tiles.map(([dx, dy]) => (
            // eslint-disable-next-line @next/next/no-img-element -- a raster map tile, not content: next/image would proxy and resize every tile for nothing
            <img
              key={`${dx}${dy}`}
              src={provider.url
                .replace("{z}", String(zoom))
                .replace("{x}", String(tx + dx))
                .replace("{y}", String(ty + dy))
                .replace("{r}", "@2x")}
              alt=""
              width={TILE}
              height={TILE}
              loading="lazy"
              decoding="async"
              className="nf-area-tile__img"
              style={{ left: dx * TILE, top: dy * TILE }}
              /* A tile shows only once it has loaded, so a failed one is the
                 quiet ground rather than a broken-image glyph. Marked on the
                 element, not in state: a tile that loaded before hydration is
                 caught by the ref, one that failed simply never shows. */
              ref={(img) => {
                if (img && img.complete && img.naturalWidth > 0) img.dataset.loaded = "";
              }}
              onLoad={(event) => {
                event.currentTarget.dataset.loaded = "";
              }}
              onError={() => setQuiet(true)}
            />
          ))}
        </span>
      )}
      {/* The pin carries the name, so the credit links beside it stay links. */}
      <span className="nf-area-tile__pin" role="img" aria-label={label} />
      {credits && !quiet ? <MapCredits className="nf-area-tile__credits" /> : null}
    </span>
  );
}
