"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { formatMoney, type Locale } from "@naijafinds/i18n";
import "leaflet/dist/leaflet.css";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Button, ButtonLink } from "@/components/ui/Button";
import { toggleSave } from "@/lib/saved/actions";
import { addLocalSave, readLocalSaves, removeLocalSave } from "@/lib/saved/local";
import { MapDock } from "./MapDock";
import { readViewport, writeViewport } from "./map-viewport";
import {
  clusterByGrid,
  fitProjector,
  inBox,
  type GeoBox,
  type LatLng,
  type PinGroup,
  type ScreenPoint,
} from "./mapGeo";
import type { MapCopy, MapListing } from "./mapTypes";

/**
 * The discovery map.
 *
 * Leaflet is used for exactly one thing: tiles, pan and zoom. Every mark on
 * top of it is an ordinary React button positioned by projecting the listing's
 * coordinate into container space on each frame. That buys three things a
 * divIcon cannot: the pins are real focusable controls with real keyboard
 * behaviour, they carry brand classes rather than injected HTML strings, and
 * the whole surface still works when the tile engine or the tile servers
 * cannot be reached, because the same marks are then projected by a local
 * bounds fitting projector over a branded canvas instead of over a grey void.
 *
 * The docked card is `absolute` inside this frame rather than `fixed`: the map
 * is mounted inside `.nf-card`, whose `backdrop-filter` would become the
 * containing block for any fixed descendant.
 */

const DARK_TILES = "https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const LIGHT_TILES = "https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

/** Grid cell for clustering, in CSS pixels. Roughly two pin widths. */
const CELL = 76;
/** Hard ceiling on drawn marks, so a huge result set cannot stall a phone. */
const MAX_MARKS = 80;
/**
 * Lift, taken from the tokens so daylight gets the paper shadow and night gets
 * the deep one. Applied inline because a bare custom property in an arbitrary
 * Tailwind shadow is ambiguous with a shadow colour.
 */
const LIFT = "var(--nf-shadow-lifted)";
const CARD_LIFT = "var(--nf-shadow-card)";

/** Space kept clear at the foot of the frame for the docked card. */
const DOCK_ROOM = 96;

/** Platform listing ids are uuids; catalogue ids are not. Mirrors the save action. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type LeafletModule = typeof import("leaflet");
type LeafletMap = import("leaflet").Map;
type LeafletTileLayer = import("leaflet").TileLayer;

type LocatePhase = "idle" | "working" | "located" | "denied" | "unavailable" | "failed";
type Locate = { phase: LocatePhase; at?: LatLng };

export type MapCity = { city: string; lat: number; lng: number; count: number };

export function MapCanvas({
  listings,
  cities,
  active,
  locale,
  copy,
  wholeMapHref,
}: {
  listings: MapListing[];
  cities: MapCity[];
  /** The text query behind these results. Sets the opening view when it names a city. */
  active?: string;
  locale: Locale;
  copy: MapCopy;
  /** Where "show every place" goes when a query has emptied the map. */
  wholeMapHref: string;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const leafletRef = useRef<LeafletModule | null>(null);
  const tileRef = useRef<LeafletTileLayer | null>(null);
  const rafRef = useRef(0);
  const tilesLoaded = useRef(0);
  const tilesFailed = useRef(0);
  const locateTimer = useRef<number | null>(null);

  const [size, setSize] = useState({ w: 0, h: 0 });
  const [tick, setTick] = useState(0);
  const [engineReady, setEngineReady] = useState(false);
  const [imagery, setImagery] = useState<"loading" | "ready" | "offline">("loading");
  const [theme, setTheme] = useState<"dark" | "light" | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [soloIds, setSoloIds] = useState<ReadonlySet<string>>(() => new Set<string>());
  const [areaBox, setAreaBox] = useState<GeoBox | null>(null);
  const [panned, setPanned] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [locate, setLocate] = useState<Locate>({ phase: "idle" });

  const [savedIds, setSavedIds] = useState<ReadonlySet<string>>(() => new Set<string>());
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [savePending, startSave] = useTransition();

  /*
   * The city the search landed on. Computed once, from the props the page
   * mounted with, never recomputed as the visitor pans or filters: it marks
   * where the search opened, not whatever happens to be nearest later. Empty
   * when there is no active query or it names a city we have no pin for, so
   * the bloom simply never fires rather than guessing.
   */
  const heroId = useMemo(() => {
    if (!active) return null;
    const city = cities.find((c) => c.city.toLowerCase() === active.trim().toLowerCase());
    if (!city) return null;
    let best: string | null = null;
    let bestDist = Infinity;
    for (const l of listings) {
      const d = (l.lat - city.lat) ** 2 + (l.lng - city.lng) ** 2;
      if (d < bestDist) {
        bestDist = d;
        best = l.id;
      }
    }
    return best;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------------------------------------------------------------ measurement
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const read = () =>
      setSize({ w: frame.clientWidth, h: frame.clientHeight });
    read();
    const observer = new ResizeObserver(read);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  // ------------------------------------------------------------------ theme
  useEffect(() => {
    const root = document.documentElement;
    const read = () => setTheme(root.dataset.theme === "light" ? "light" : "dark");
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  // ------------------------------------------------------------ map engine
  useEffect(() => {
    let disposed = false;
    let map: LeafletMap | undefined;

    const bump = () => {
      if (rafRef.current) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = 0;
        setTick((value) => value + 1);
      });
    };

    void (async () => {
      try {
        const leaflet = (await import("leaflet")).default;
        if (disposed || !canvasRef.current) return;
        map = leaflet.map(canvasRef.current, {
          zoomControl: false,
          // Attribution is rendered by this component instead, so it can sit
          // clear of the docked card rather than underneath it.
          attributionControl: false,
          scrollWheelZoom: true,
        });
        map.setView([9.05, 7.5], 5);
        map.on("move zoom resize", bump);
        map.on("dragend", () => setPanned(true));
        /* Every settled move puts the view back in the address, so the link in
           the address bar is always a link to what is on screen. `moveend`
           fires once a pan or a zoom has come to rest, not per frame. */
        map.on("moveend", () => {
          const centre = map?.getCenter();
          const zoom = map?.getZoom();
          if (!centre || typeof zoom !== "number") return;
          writeViewport({ lat: centre.lat, lng: centre.lng, zoom });
        });
        leafletRef.current = leaflet;
        mapRef.current = map;
        setEngineReady(true);
        bump();
      } catch {
        // The engine itself could not load. Nothing is broken: the marks fall
        // back to the local projector over the branded canvas, and the notice
        // says what was lost.
        setImagery("offline");
      }
    })();

    return () => {
      disposed = true;
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      map?.remove();
      mapRef.current = null;
      leafletRef.current = null;
      tileRef.current = null;
    };
  }, []);

  // Tiles follow the active theme: dark cartography at night, paper by day.
  useEffect(() => {
    const map = mapRef.current;
    const leaflet = leafletRef.current;
    if (!map || !leaflet || !theme) return;
    tileRef.current?.remove();
    const layer = leaflet.tileLayer(theme === "light" ? LIGHT_TILES : DARK_TILES, {
      maxZoom: 19,
      minZoom: 4,
    });
    layer.on("tileload", () => {
      tilesLoaded.current += 1;
      setImagery("ready");
    });
    layer.on("tileerror", () => {
      tilesFailed.current += 1;
      if (tilesLoaded.current === 0 && tilesFailed.current >= 3) setImagery("offline");
    });
    layer.addTo(map);
    tileRef.current = layer;
  }, [theme, engineReady]);

  // No tile has painted after a fair wait: say so rather than wait forever.
  useEffect(() => {
    if (imagery !== "loading") return;
    const timer = window.setTimeout(() => {
      if (tilesLoaded.current === 0) setImagery("offline");
    }, 6000);
    return () => window.clearTimeout(timer);
  }, [imagery]);

  /**
   * Opening view: the places themselves.
   *
   * Fitting the results rather than centring on a city coordinate is what
   * makes a city search land on price pins instead of count bubbles. A search
   * for Lagos returns places in Victoria Island, Lekki and Ikoyi, which sit
   * about ten kilometres from the city's own point; centring on the point
   * would push half of them off the frame. Padding keeps the lowest pins clear
   * of the docked card. With nothing to fit, the named city carries the view,
   * and Nigeria carries it when even that is unknown.
   */
  const fitToPlaces = useCallback(() => {
    const map = mapRef.current;
    const leaflet = leafletRef.current;
    if (!map || !leaflet) return;
    const first = listings[0];
    if (!first) {
      const focus = active
        ? cities.find((city) => city.city.toLowerCase() === active.trim().toLowerCase())
        : undefined;
      map.setView(focus ? [focus.lat, focus.lng] : [9.05, 7.5], focus ? 12 : 5);
      return;
    }
    if (listings.length === 1) {
      map.setView([first.lat, first.lng], 13);
      return;
    }
    map.fitBounds(
      leaflet.latLngBounds(listings.map((l) => [l.lat, l.lng] as [number, number])),
      { paddingTopLeft: [48, 56], paddingBottomRight: [48, DOCK_ROOM + 40] },
    );
  }, [listings, cities, active]);

  /**
   * An address that names a viewport is an instruction, and it outranks
   * fitting to the results. That is the whole point of a shared map link: the
   * person who sent it chose that view, and re-fitting to the results on
   * arrival would throw their choice away and show the recipient something
   * different from what the sender was looking at.
   *
   * Read once, on the first fit only. Later fits (a new query, a category
   * change) are the results genuinely changing underneath, and at that point
   * the URL's opening position is stale and must not keep reasserting itself.
   */
  const openedFromUrl = useRef(false);
  useEffect(() => {
    if (!engineReady) return;
    if (!openedFromUrl.current) {
      openedFromUrl.current = true;
      const asked = readViewport(window.location.search);
      if (asked) {
        mapRef.current?.setView([asked.lat, asked.lng], asked.zoom);
        return;
      }
    }
    fitToPlaces();
  }, [engineReady, fitToPlaces]);

  // ------------------------------------------------------------ device saves
  useEffect(() => {
    setSavedIds(new Set(readLocalSaves().map((save) => save.id)));
  }, []);

  useEffect(
    () => () => {
      if (locateTimer.current !== null) window.clearTimeout(locateTimer.current);
    },
    [],
  );

  // ------------------------------------------------------------- projection
  const visible = useMemo(
    () => (areaBox ? listings.filter((l) => inBox(l, areaBox)) : listings),
    [listings, areaBox],
  );

  const points = useMemo<(MapListing & ScreenPoint)[]>(() => {
    // `tick` is the reprojection signal: the engine moved, so every screen
    // position is stale even though not one listing changed.
    void tick;
    const map = mapRef.current;
    if (map && engineReady) {
      return visible.map((l) => {
        const at = map.latLngToContainerPoint([l.lat, l.lng]);
        return { ...l, x: at.x, y: at.y };
      });
    }
    const project = fitProjector(
      visible,
      { w: size.w, h: Math.max(size.h - DOCK_ROOM, 80) },
      56,
    );
    return visible.map((l) => ({ ...l, ...project(l) }));
  }, [visible, engineReady, size.w, size.h, tick]);

  const marks = useMemo(() => {
    const loose: (MapListing & ScreenPoint)[] = [];
    const grouped: (MapListing & ScreenPoint)[] = [];
    for (const point of points) {
      if (soloIds.has(point.id) || point.id === selectedId) loose.push(point);
      else grouped.push(point);
    }

    const bubbles: PinGroup<MapListing & ScreenPoint>[] = [];
    for (const group of clusterByGrid(grouped, CELL)) {
      const only = group.items.length === 1 ? group.items[0] : undefined;
      if (only) loose.push(only);
      else bubbles.push(group);
    }

    // The ceiling is applied to single pins only: a count bubble stands for
    // many listings, so dropping one would hide more than it saves.
    const room = Math.max(MAX_MARKS - bubbles.length, 0);
    if (loose.length <= room) return { pins: loose, bubbles, hidden: 0 };
    const kept = [...loose].sort((a, b) => b.rating - a.rating).slice(0, room);
    return { pins: kept, bubbles, hidden: loose.length - kept.length };
  }, [points, soloIds, selectedId]);

  const selected = useMemo(
    () => visible.find((l) => l.id === selectedId) ?? null,
    [visible, selectedId],
  );

  const userPoint = useMemo<ScreenPoint | null>(() => {
    void tick;
    const at = locate.at;
    const map = mapRef.current;
    if (!at || !map || !engineReady) return null;
    const point = map.latLngToContainerPoint([at.lat, at.lng]);
    return { x: point.x, y: point.y };
  }, [locate.at, engineReady, tick]);

  // ----------------------------------------------------------------- actions
  const choose = useCallback(
    (listing: MapListing) => {
      setSaveMessage(null);
      setSelectedId(listing.id);
      mapRef.current?.panTo([listing.lat, listing.lng], { animate: true });
    },
    [],
  );

  const expand = useCallback((group: PinGroup<MapListing & ScreenPoint>) => {
    setSoloIds((previous) => {
      const next = new Set(previous);
      for (const item of group.items) next.add(item.id);
      return next;
    });
    const map = mapRef.current;
    const leaflet = leafletRef.current;
    if (!map || !leaflet) return;
    map.flyToBounds(
      leaflet.latLngBounds(group.items.map((item) => [item.lat, item.lng] as [number, number])),
      { paddingTopLeft: [56, 56], paddingBottomRight: [56, DOCK_ROOM + 24], maxZoom: 16 },
    );
  }, []);

  const searchThisArea = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const bounds = map.getBounds();
    setAreaBox({
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest(),
    });
    setPanned(false);
    setSoloIds(new Set<string>());
  }, []);

  const clearArea = useCallback(() => {
    setAreaBox(null);
    setPanned(false);
    setSoloIds(new Set<string>());
  }, []);

  const locateMe = useCallback(() => {
    if (locate.phase === "working") return;
    const geolocation =
      typeof navigator === "undefined" ? undefined : navigator.geolocation;
    if (!geolocation) {
      setLocate({ phase: "unavailable" });
      return;
    }
    setLocate({ phase: "working" });
    if (locateTimer.current !== null) window.clearTimeout(locateTimer.current);
    // A guaranteed end to the wait. A control that spins for ever is a lie.
    locateTimer.current = window.setTimeout(() => {
      setLocate((previous) => (previous.phase === "working" ? { phase: "failed" } : previous));
    }, 11_000);

    geolocation.getCurrentPosition(
      (position) => {
        if (locateTimer.current !== null) window.clearTimeout(locateTimer.current);
        const at = { lat: position.coords.latitude, lng: position.coords.longitude };
        setLocate({ phase: "located", at });
        mapRef.current?.setView([at.lat, at.lng], 13);
      },
      (error) => {
        if (locateTimer.current !== null) window.clearTimeout(locateTimer.current);
        setLocate({ phase: error.code === error.PERMISSION_DENIED ? "denied" : "failed" });
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }, [locate.phase]);

  const fitAll = useCallback(() => {
    setSoloIds(new Set<string>());
    setSelectedId(null);
    setPanned(false);
    fitToPlaces();
  }, [fitToPlaces]);

  const save = useCallback(
    (listing: MapListing) => {
      const wasSaved = savedIds.has(listing.id);
      const onDevice = !UUID_RE.test(listing.id);
      setSaveMessage(null);
      setSavedIds((previous) => {
        const next = new Set(previous);
        if (wasSaved) next.delete(listing.id);
        else next.add(listing.id);
        return next;
      });
      if (onDevice) {
        if (wasSaved) removeLocalSave(listing.id);
        else addLocalSave(listing.id);
      }

      startSave(async () => {
        const result = await toggleSave({ listingId: listing.id });
        if (result.ok) {
          if (result.data.mode === "db") {
            // The database, not the tap, decides what the shortlist holds.
            const truth = result.data.saved;
            setSavedIds((previous) => {
              const next = new Set(previous);
              if (truth) next.add(listing.id);
              else next.delete(listing.id);
              return next;
            });
          }
          return;
        }
        if (onDevice) {
          if (wasSaved) addLocalSave(listing.id);
          else removeLocalSave(listing.id);
        }
        setSavedIds((previous) => {
          const next = new Set(previous);
          if (wasSaved) next.add(listing.id);
          else next.delete(listing.id);
          return next;
        });
        setSaveMessage(result.error);
      });
    },
    [savedIds],
  );

  // -------------------------------------------------------------------- copy
  const countNoun = visible.length === 1 ? "place" : "places";
  const countLabel = areaBox
    ? `${visible.length} ${countNoun} in this area`
    : `${visible.length} ${countNoun} on this map`;
  const hiddenLabel = marks.hidden > 0 ? ` (${marks.hidden} not drawn at this zoom)` : "";
  // Without the engine there is nothing to recentre, so the success line must
  // not claim the map moved.
  const locateMessage =
    locate.phase === "located" && !engineReady
      ? "Your location was found, but the map cannot recentre without imagery."
      : LOCATE_MESSAGES[locate.phase];
  const approximate = listings.some((l) => !l.byArea);

  return (
    <div
      ref={frameRef}
      data-testid="map-view"
      role="region"
      aria-label="Map of places. Every pin is a button, and the list control opens the same places as text."
      className="relative h-[440px] w-full overflow-hidden sm:h-[560px]"
      onKeyDown={(event) => {
        if (event.key === "Escape" && selectedId) {
          event.stopPropagation();
          setSelectedId(null);
        }
      }}
    >
      {/*
        The branded canvas. It sits under the tile panes, so it is invisible
        the moment imagery paints and it is the whole surface when imagery
        cannot be reached. Flat neutral ground, a fine graticule on the
        hairline token and, at night only, one soft brand bloom: never a grey
        void, and never a blue wash on paper.
      */}
      <div
        data-testid="map-surface"
        aria-hidden="true"
        className="absolute inset-0 bg-[var(--nf-surface-inset)]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, var(--nf-border-subtle) 0 1px, transparent 1px 48px), repeating-linear-gradient(90deg, var(--nf-border-subtle) 0 1px, transparent 1px 48px)",
        }}
      />
      {theme === "dark" && (
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 80% at 50% 25%, color-mix(in oklab, var(--nf-electric-500) 16%, transparent) 0%, transparent 68%)",
          }}
        />
      )}

      {/* Leaflet mounts here. Transparent, so the canvas above shows through. */}
      <div
        ref={canvasRef}
        className="absolute inset-0"
        style={{ background: "transparent" }}
        aria-hidden="true"
      />

      {/* ------------------------------------------------------------- marks */}
      <div className="pointer-events-none absolute inset-0 z-[1000]">
        {marks.bubbles.map((group, i) => (
          <button
            key={group.key}
            type="button"
            data-testid="map-cluster"
            onClick={() => expand(group)}
            style={
              {
                left: group.x,
                top: group.y,
                boxShadow: LIFT,
                "--pin-i": i,
              } as React.CSSProperties
            }
            className="nf-numeric nf-map-cluster-drop nf-tap pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--nf-border-brand)] bg-[var(--nf-brand-primary)] px-3 py-2 text-[0.8125rem] font-bold text-[var(--nf-content-on-brand)] transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--nf-focus-ring)] active:scale-95 motion-reduce:transition-none"
          >
            <span className="nf-map-pin-breathe inline-block">{group.items.length}</span>
            <span className="sr-only"> places grouped here, open them</span>
          </button>
        ))}

        {marks.pins.map((pin, i) => {
          const chosen = pin.id === selectedId;
          return (
            <button
              key={pin.id}
              type="button"
              data-testid="map-pin"
              data-selected={chosen ? "true" : undefined}
              data-hero={pin.id === heroId ? "true" : undefined}
              aria-pressed={chosen}
              onClick={() => choose(pin)}
              style={
                {
                  left: pin.x,
                  top: pin.y,
                  zIndex: chosen ? 2 : 1,
                  boxShadow: LIFT,
                  "--pin-i": i,
                } as React.CSSProperties
              }
              className={`nf-numeric nf-map-pin-drop pointer-events-auto absolute -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-[var(--nf-radius-pill)] px-2.5 py-1.5 text-[0.75rem] font-bold transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--nf-focus-ring)] active:scale-95 motion-reduce:transition-none ${
                chosen
                  ? "scale-110 border border-[var(--nf-brand-primary)] bg-[var(--nf-brand-primary)] text-[var(--nf-content-on-brand)]"
                  : "border border-[var(--nf-border-default)] bg-[var(--nf-surface-elevated)] text-[var(--nf-content-primary)] hover:border-[var(--nf-brand-primary)]"
              }`}
            >
              {/* Idle pins breathe on their own inner span, so the slow scale
                  loop never fights the button's own position or selection
                  transform (see the CSS comment by nf-map-pin-breathe). */}
              <span
                className={`inline-flex items-center gap-1 ${chosen ? "" : "nf-map-pin-breathe"}`}
              >
                {/* Partner stock never carries the verified badge, here or anywhere. */}
                {pin.verified && !pin.partner && (
                  <UiIcon
                    name="verified"
                    size={12}
                    className={chosen ? undefined : "text-[var(--nf-brand-primary)]"}
                  />
                )}
                {pin.priceMinor > 0
                  ? formatMoney(pin.priceMinor, locale, pin.currency, { compact: true })
                  : pin.kindLabel}
              </span>
              <span className="sr-only">
                {`, ${pin.title}, ${pin.area}`}
              </span>
            </button>
          );
        })}

        {userPoint && (
          <span
            aria-hidden="true"
            style={{ left: userPoint.x, top: userPoint.y, boxShadow: LIFT }}
            className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--nf-content-on-brand)] bg-[var(--nf-brand-primary)]"
          />
        )}
      </div>

      {/* ------------------------------------------------------------ chrome */}
      <div className="pointer-events-none absolute inset-0 z-[1100] flex flex-col">
        <div className="flex items-start gap-2 p-3">
          <p
            data-testid="map-count"
            role="status"
            aria-live="polite"
            className="nf-chip pointer-events-auto min-w-0 max-w-[62%] shrink text-[0.75rem]"
          >
            <UiIcon name="map" size={12} className="shrink-0 opacity-70" />
            {/* "23 places on this map" is a sentence, and it was being clipped
                to "23 places on this ma" by two pixels. It wraps now. */}
            <span>
              {countLabel}
              {hiddenLabel}
            </span>
          </p>

          {panned && !areaBox && (
            <Button
              variant="primary"
              size="sm"
              data-testid="map-search-area"
              onClick={searchThisArea}
              leadingIcon="search"
              className="pointer-events-auto ml-auto shrink-0 whitespace-nowrap"
            >
              Search this area
            </Button>
          )}
          {areaBox && (
            <button
              type="button"
              data-testid="map-clear-area"
              onClick={clearArea}
              className="nf-chip pointer-events-auto ml-auto h-8 shrink-0 whitespace-nowrap text-[0.75rem]"
            >
              <UiIcon name="arrow-left" size={12} />
              All places
            </button>
          )}
        </div>

        {/* Empty state. Honest about why, and it offers the way back. */}
        {visible.length === 0 && (
          <div
            style={{ boxShadow: CARD_LIFT }}
            className="pointer-events-auto mx-auto mt-6 w-[min(20rem,86%)] rounded-[var(--nf-radius-lg)] border border-[var(--nf-border-subtle)] bg-[var(--nf-surface-primary)] p-5 text-center"
          >
            <BrandIcon name="map-spot" size={56} className="mx-auto" />
            <p className="mt-3 font-semibold text-[var(--nf-content-primary)]">
              No places here
            </p>
            <p className="mt-1 text-[0.8125rem] text-[var(--nf-content-muted)]">
              {areaBox
                ? "No place sits inside this part of the map."
                : "This search matched no place we can put on the map."}
            </p>
            {areaBox ? (
              <Button variant="secondary" onClick={clearArea} className="mt-4">
                Show every place
              </Button>
            ) : (
              <ButtonLink href={wholeMapHref} variant="secondary" className="mt-4">
                Show every place
              </ButtonLink>
            )}
          </div>
        )}

        <div className="flex-1" />

        {/* Attribution and the state of the imagery, always clear of the dock. */}
        <p className="pointer-events-auto px-3 pb-1 text-[0.625rem] leading-tight text-[var(--nf-content-muted)]">
          {imagery === "offline" ? (
            <span data-testid="map-imagery-note">
              Map imagery could not load. Every place is still placed by its area.
            </span>
          ) : (
            <>
              <a
                href="https://www.openstreetmap.org/copyright"
                target="_blank"
                rel="noopener noreferrer"
                className="underline-offset-2 hover:underline"
              >
                OpenStreetMap
              </a>
              {" and "}
              <a
                href="https://carto.com/attributions"
                target="_blank"
                rel="noopener noreferrer"
                className="underline-offset-2 hover:underline"
              >
                CARTO
              </a>
            </>
          )}
          {approximate && <span>{" · Pins show the area, not the address."}</span>}
        </p>

        {/* Controls. They sit above the dock in the same column, so a docked
            card can never cover the locate control. */}
        <div className="flex items-end justify-end gap-2 px-3 pb-2">
          {locateMessage && (
            <p
              role="status"
              aria-live="polite"
              data-testid="map-locate-message"
              style={{ boxShadow: CARD_LIFT }}
              className="pointer-events-auto mr-auto max-w-[62%] rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] bg-[var(--nf-surface-primary)] px-2.5 py-1.5 text-[0.6875rem] leading-snug text-[var(--nf-content-secondary)]"
            >
              {locateMessage}
            </p>
          )}
          <button
            type="button"
            data-testid="map-list-toggle"
            aria-expanded={listOpen}
            aria-label={listOpen ? "Close the list of places" : "Browse these places as a list"}
            onClick={() => setListOpen((open) => !open)}
            className="nf-icon-btn pointer-events-auto h-10 w-10 bg-[var(--nf-surface-primary)]"
          >
            <UiIcon name="grid" size={16} />
          </button>
          <button
            type="button"
            data-testid="map-fit"
            aria-label="Fit every place in view"
            onClick={fitAll}
            className="nf-icon-btn pointer-events-auto h-10 w-10 bg-[var(--nf-surface-primary)]"
          >
            <UiIcon name="compass" size={16} />
          </button>
          <button
            type="button"
            data-testid="map-locate"
            aria-label="Centre the map on my location"
            aria-busy={locate.phase === "working"}
            onClick={locateMe}
            className="nf-icon-btn pointer-events-auto h-10 w-10 bg-[var(--nf-surface-primary)]"
          >
            <UiIcon
              name="location"
              size={16}
              className={
                locate.phase === "located" ? "text-[var(--nf-brand-primary)]" : undefined
              }
            />
          </button>
        </div>

        {listOpen ? (
          <div
            data-testid="map-list"
            style={{ boxShadow: LIFT }}
            className="pointer-events-auto mx-3 mb-3 max-h-[46%] overflow-hidden rounded-[var(--nf-radius-lg)] border border-[var(--nf-border-subtle)] bg-[var(--nf-surface-primary)]"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[var(--nf-border-subtle)] px-3 py-2">
              <h2 className="text-[0.8125rem] font-semibold text-[var(--nf-content-primary)]">
                Places on this map
              </h2>
              <button
                type="button"
                aria-label="Close the list of places"
                onClick={() => setListOpen(false)}
                className="nf-icon-btn h-7 w-7"
              >
                <UiIcon name="chevron-down" size={16} />
              </button>
            </div>
            <ul className="max-h-[14rem] overflow-y-auto">
              {visible.map((listing) => (
                <li key={listing.id}>
                  <button
                    type="button"
                    onClick={() => {
                      choose(listing);
                      setListOpen(false);
                    }}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-[var(--nf-surface-raised)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[color:var(--nf-focus-ring)]"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.8125rem] font-semibold text-[var(--nf-content-primary)]">
                        {listing.title}
                      </span>
                      <span className="block truncate text-[0.6875rem] text-[var(--nf-content-muted)]">
                        {listing.area}, {listing.city}
                      </span>
                    </span>
                    <span className="nf-numeric shrink-0 text-[0.8125rem] font-bold text-[var(--nf-content-primary)]">
                      {listing.priceMinor > 0
                        ? formatMoney(listing.priceMinor, locale, listing.currency, {
                            compact: true,
                          })
                        : listing.kindLabel}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : selected ? (
          <MapDock
            listing={selected}
            locale={locale}
            copy={copy}
            saved={savedIds.has(selected.id)}
            saveBusy={savePending}
            saveMessage={saveMessage}
            onSave={() => save(selected)}
            onDismiss={() => setSelectedId(null)}
          />
        ) : null}
      </div>
    </div>
  );
}

/**
 * What the locate control says. Every branch ends: there is no state in which
 * the control keeps working with nothing to show for it.
 */
const LOCATE_MESSAGES: Record<LocatePhase, string | null> = {
  idle: null,
  working: "Finding your location.",
  located: "Centred on your location.",
  denied:
    "Location permission is off for this site. Turn it on in your browser settings to centre the map on you.",
  unavailable: "This browser does not offer location, so the map cannot centre on you.",
  failed: "Your location could not be found. Try again.",
};
