/**
 * Where the map's imagery comes from, and who has to be credited for it.
 *
 * THIS IS A LICENSING MODULE BEFORE IT IS A RENDERING ONE.
 *
 * The map has always drawn on CARTO's public basemaps, which are free and
 * **non-commercial use only**. A marketplace taking a booking fee is a
 * commercial use, so shipping on those tiles is not a performance problem or a
 * design problem, it is a term-of-service problem that arrives as an email
 * rather than as a bug report. `NEXT_PUBLIC_MAPTILER_KEY` has sat in the
 * environment template for months with nothing reading it, so the documented
 * escape hatch did not exist.
 *
 * It exists now. Set the key and the map moves to MapTiler, on a paid plan,
 * with MapTiler's own attribution. Leave it unset and nothing changes: CARTO,
 * CARTO's attribution, and a console warning naming the licence so the state
 * is visible to whoever is running the build rather than only to whoever reads
 * this file.
 *
 * ATTRIBUTION IS NOT DECORATION. Both providers require it in their terms, and
 * it differs between them, so it travels WITH the tile URL here rather than
 * being hard-coded beside the map. A provider swap that silently kept the
 * wrong credit would replace one licence breach with another.
 */

export type MapTheme = "light" | "dark";

export type TileProvider = {
  /** `maptiler` once a key is present, `carto` otherwise. */
  id: "maptiler" | "carto";
  /** Leaflet URL template, `{z}/{x}/{y}` with `{r}` for retina. */
  url: string;
  /** Everyone who must be credited, in the order their terms ask for. */
  credits: { label: string; href: string }[];
  /** Deepest zoom the provider actually serves. */
  maxZoom: number;
  /**
   * True while the map is on tiles that may not be used commercially. The
   * surface does not shout about it - a visitor is not the audience - but it
   * is here so a pre-launch check can read one boolean instead of a URL.
   */
  nonCommercial: boolean;
};

const OSM = {
  label: "OpenStreetMap",
  href: "https://www.openstreetmap.org/copyright",
};

/**
 * MapTiler's `dataviz` styles are the closest match to what the platform
 * already draws: muted land, no shouting labels, a genuine dark variant rather
 * than an inverted light one. Anything busier fights the pins, which are the
 * only thing on this map anybody came to look at.
 */
const MAPTILER_STYLE: Record<MapTheme, string> = {
  light: "dataviz-light",
  dark: "dataviz-dark",
};

const CARTO_STYLE: Record<MapTheme, string> = {
  light: "light_all",
  dark: "dark_all",
};

/** Read once. A key that appears mid-session is not a case worth handling. */
const MAPTILER_KEY = (process.env.NEXT_PUBLIC_MAPTILER_KEY ?? "").trim();

export function hasCommercialTiles(): boolean {
  return MAPTILER_KEY.length > 0;
}

export function tileProvider(theme: MapTheme): TileProvider {
  if (MAPTILER_KEY.length > 0) {
    return {
      id: "maptiler",
      url: `https://api.maptiler.com/maps/${MAPTILER_STYLE[theme]}/{z}/{x}/{y}{r}.png?key=${MAPTILER_KEY}`,
      /* MapTiler's terms require both marks, theirs first. */
      credits: [{ label: "MapTiler", href: "https://www.maptiler.com/copyright/" }, OSM],
      maxZoom: 20,
      nonCommercial: false,
    };
  }

  return {
    id: "carto",
    url: `https://basemaps.cartocdn.com/${CARTO_STYLE[theme]}/{z}/{x}/{y}{r}.png`,
    credits: [OSM, { label: "CARTO", href: "https://carto.com/attributions" }],
    maxZoom: 19,
    nonCommercial: true,
  };
}

/**
 * Say it once, where somebody running the build will see it.
 *
 * Not a thrown error: the map working on free tiles is the right behaviour for
 * every environment that is not production, and a platform that refuses to
 * render a map because a paid key is absent is worse than one that renders it
 * and says what it is standing on.
 */
let warned = false;

export function warnIfNonCommercialTiles(): void {
  if (warned || hasCommercialTiles()) return;
  warned = true;
  console.warn(
    "[maps] Drawing on CARTO basemaps, which are licensed for NON-COMMERCIAL use only. " +
      "Set NEXT_PUBLIC_MAPTILER_KEY before taking money through this deployment. " +
      "See docs/ENVIRONMENT.md.",
  );
}
