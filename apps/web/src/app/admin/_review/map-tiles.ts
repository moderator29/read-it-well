/**
 * The three-by-three block of map tiles around a point, for the Location panel
 * on the listing under review.
 *
 * A static mosaic rather than the interactive search map: a reviewer needs to
 * see where the pin is, not to pan. The tile URLs come from the product's own
 * provider choice (`lib/maps/tiles.ts`), which also carries the attribution
 * its licence requires. Pure arithmetic, tested; no request is made here.
 */

export type TileMosaic = {
  zoom: number;
  /** Nine tile URLs, row by row. */
  urls: string[];
  /** Where the point sits inside the 768px block, in pixels from its top left. */
  pointX: number;
  pointY: number;
};

export function tileMosaic(
  latitude: number,
  longitude: number,
  template: string,
  zoom = 15,
): TileMosaic | null {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 85 || Math.abs(longitude) > 180) return null;
  const n = 2 ** zoom;
  const x = ((longitude + 180) / 360) * n;
  const rad = (latitude * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n;
  const tx = Math.floor(x);
  const ty = Math.floor(y);
  const urls: string[] = [];
  for (let row = -1; row <= 1; row++) {
    for (let col = -1; col <= 1; col++) {
      const cx = (((tx + col) % n) + n) % n;
      const cy = Math.min(n - 1, Math.max(0, ty + row));
      urls.push(
        template
          .replace("{z}", String(zoom))
          .replace("{x}", String(cx))
          .replace("{y}", String(cy))
          .replace("{r}", ""),
      );
    }
  }
  return {
    zoom,
    urls,
    pointX: Math.round((x - tx + 1) * 256),
    pointY: Math.round((y - ty + 1) * 256),
  };
}
