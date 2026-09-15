import Link from "next/link";
import type { HomeArea } from "@/lib/app/home-queries";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * The city, and the places open inside it.
 *
 * The card is the supplied city artwork, used as a background image exactly as
 * the brand rules require, with a lit pin for every open place laid over it.
 * Each pin carries the place's name and its real post count from
 * `public.areas`, and each one is a link into that place.
 *
 * Pin positions come from the areas' own coordinates, normalised into a safe
 * band over the artwork's skyline. That means Lekki really does sit east of
 * Surulere and Ikeja really is north of Yaba, so the arrangement carries
 * information instead of being decoration. It is deliberately not called a map:
 * there is no scale and no projection, and claiming otherwise would be a lie a
 * reader could act on.
 *
 * A place with no coordinates is never placed at a guess. It appears in the row
 * of chips underneath, which is also the whole card's answer at the smallest
 * sizes and the reason the pins can stay purely visual for a screen reader.
 */

/**
 * The band of the artwork a pin may sit in, as fractions of the box.
 *
 * Narrower than the card on both axes, and for two different reasons. The top
 * is clear of the city name and the bottom is clear of the summary line. The
 * sides are pulled well in because a pin carries a label beside it, and a label
 * anchored at 88% runs straight off the edge: the first screenshot of this card
 * had "Lekki Phase 1" half outside the frame.
 */
const SAFE = { left: 0.22, right: 0.72, top: 0.32, bottom: 0.84 };

/**
 * The least vertical distance between two pins, as a fraction of the card.
 *
 * Yaba and UNILAG are two kilometres apart, which on a 300 pixel card is eight
 * pixels, and their labels sat on top of each other. Real geography decides the
 * ORDER of the pins; this constant decides that two of them are still legible
 * when the truth puts them in the same place.
 */
const MIN_GAP = 0.11;

type PlacedPin = {
  area: HomeArea;
  /** Percentage across the card. */
  x: number;
  /** Percentage down the card. */
  y: number;
  /** Which side of the dot the label hangs on, alternated to avoid collisions. */
  side: "left" | "right";
};

/**
 * Normalise coordinates into the safe band.
 *
 * North is up and east is right, which is the only arrangement a Nigerian
 * reader will not have to think about. A single place, or several sharing a
 * coordinate, would divide by zero, so a degenerate range collapses to the
 * centre of the band rather than to NaN.
 */
export function placePins(areas: HomeArea[]): PlacedPin[] {
  const placed = areas.filter(
    (area): area is HomeArea & { lat: number; lng: number } =>
      area.lat !== null && area.lng !== null,
  );
  if (placed.length === 0) return [];

  const lats = placed.map((area) => area.lat);
  const lngs = placed.map((area) => area.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latSpan = maxLat - minLat;
  const lngSpan = maxLng - minLng;

  const pins = placed
    .map((area) => {
      const xFraction = lngSpan === 0 ? 0.5 : (area.lng - minLng) / lngSpan;
      const yFraction = latSpan === 0 ? 0.5 : (maxLat - area.lat) / latSpan;
      const x = SAFE.left + xFraction * (SAFE.right - SAFE.left);
      return {
        area,
        x: x * 100,
        y: (SAFE.top + yFraction * (SAFE.bottom - SAFE.top)) * 100,
        // A pin on the right half hangs its label to the left, and the other
        // way round, so no label can ever reach past the card's edge.
        side: (x > 0.5 ? "left" : "right") as "left" | "right",
      };
    })
    .sort((a, b) => a.y - b.y);

  // Push each pin down until it clears the one above it. Order is preserved,
  // so north is still above south; only the spacing is made readable.
  const gap = MIN_GAP * 100;
  const floor = SAFE.bottom * 100;
  for (let index = 1; index < pins.length; index += 1) {
    const previous = pins[index - 1];
    const current = pins[index];
    if (!previous || !current) continue;
    if (current.y - previous.y < gap) current.y = Math.min(previous.y + gap, floor);
  }

  return pins;
}

/**
 * The supplied photograph for this hero, when one exists.
 *
 * **THIS IS THE SLOT. Put a path here and the hero paints it.** Nothing else
 * needs to change: the container, the scrim, the ratio and the type are all
 * below and are unaffected.
 *
 * It was `/brand/vallo-city.png`, a 2.1MB RentMe-era render that was also
 * doing duty as the stand-in for four listing kinds in `MediaFrame`. So the
 * most important image on the product home was the same picture as a listing
 * card for an office floor, and it was the single heaviest asset on the
 * platform.
 *
 * **Null is the correct value today and the hero is designed for it.** With no
 * artwork the container keeps its navy artwork ground, its brand border and
 * its glow, which reads as a deliberate dark panel rather than as a picture
 * that failed to load. That is the rule for every state on this platform: a
 * surface with nothing in it is still designed.
 *
 * `docs/IMAGERY.md` section 5 is the brief for what belongs here, and it is
 * the highest-value single image in the product: an elevated Nigerian city at
 * dusk, warm lights coming on, residential rather than a business district,
 * able to hold legible white type across the middle third under a heavy scrim.
 * Re-encode to AVIF and give it a narrower 390px crop before it ships.
 */
const CITY_HERO_ARTWORK: string | null = null;

export function CityHero({
  cityLabel,
  contextLabel,
  areas,
}: {
  cityLabel: string;
  contextLabel: string;
  areas: HomeArea[];
}) {
  const pins = placePins(areas);
  const totalPosts = areas.reduce((sum, area) => sum + area.postCount, 0);

  return (
    <section aria-label={`Places open in ${cityLabel || "Nigeria"}`}>
      <div
        className="relative isolate overflow-hidden rounded-[var(--nf-radius-2xl)] border border-[var(--nf-border-brand)] shadow-[var(--nf-glow-brand)]"
        /* The hook data-saver.css turns off. Kept for the supplied artwork
           below: a reader on a 2g link needs the prices under this far more
           than the scenery. */
        data-artwork="city"
        style={
          CITY_HERO_ARTWORK
            ? {
                backgroundImage: `url('${CITY_HERO_ARTWORK}')`,
                backgroundSize: "cover",
                backgroundPosition: "center 62%",
                backgroundColor: "var(--nf-surface-artwork)",
              }
            : { backgroundColor: "var(--nf-surface-artwork)" }
        }
      >
        {/*
          The artwork is a night scene in both themes, so this card keeps the
          deep navy ground the render is lit against and the ink on it stays
          pale in daylight too. That is what the `-artwork` and `-on-media`
          tokens are for: thirteen raw literals used to live in these seventy
          lines, which made this the single least theme-aware file on the
          platform even though its treatment was correct.
        */}
        <div className="relative aspect-[7/6] w-full sm:aspect-[16/9]">
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{ background: "var(--nf-scrim-artwork)" }}
          />

          <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4 sm:p-5">
            <div className="min-w-0">
              <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-[var(--nf-content-on-media-accent)]">
                {contextLabel}
              </p>
              <p className="mt-0.5 text-[1.375rem] font-bold leading-tight text-[var(--nf-content-on-media)] sm:text-[1.625rem]">
                {cityLabel || "Nigeria"}
              </p>
            </div>
            <span className="nf-numeric shrink-0 rounded-[var(--nf-radius-control)] border border-[var(--nf-border-on-media)] bg-[var(--nf-overlay-artwork)] px-2.5 py-1 text-[0.6875rem] font-semibold text-[var(--nf-content-on-media-accent)]">
              {areas.length} {areas.length === 1 ? "place" : "places"}
            </span>
          </div>

          {/* Pins. Purely visual: every one of them is repeated as a real link
              in the row beneath, so nothing here is the only way through. */}
          <div aria-hidden="true" className="absolute inset-0">
            {pins.map((pin) => (
              <span
                key={pin.area.id}
                className="absolute flex items-center gap-1.5"
                style={{
                  left: `${pin.x}%`,
                  top: `${pin.y}%`,
                  transform: "translate(-50%, -50%)",
                  flexDirection: pin.side === "left" ? "row-reverse" : "row",
                }}
              >
                <span className="relative grid h-3 w-3 shrink-0 place-items-center">
                  <span className="nf-map-pin-breathe absolute inset-[-6px] rounded-full bg-[var(--nf-halo-on-media)] blur-[6px]" />
                  <span className="relative block h-2.5 w-2.5 rounded-full bg-[var(--nf-content-on-media)] shadow-[var(--nf-glow-on-media)]" />
                </span>
                <span className="whitespace-nowrap rounded-[var(--nf-radius-control)] border border-[var(--nf-border-on-media)] bg-[var(--nf-overlay-artwork)] px-2 py-[3px] text-[0.625rem] font-semibold leading-none text-[var(--nf-content-on-media)] backdrop-blur-sm">
                  {pin.area.name}
                  <span className="nf-numeric ml-1.5 text-[var(--nf-content-on-media-accent)]">
                    {pin.area.postCount}
                  </span>
                </span>
              </span>
            ))}
          </div>

          <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
            <p className="text-[0.8125rem] leading-relaxed text-[var(--nf-content-on-media-accent)]">
              {areas.length === 0
                ? "No places are open here yet. When one opens it appears on this card."
                : totalPosts === 0
                  ? "These places are open and waiting for their first word."
                  : `${totalPosts} ${totalPosts === 1 ? "post" : "posts"} across these places.`}
            </p>
          </div>
        </div>
      </div>

      {/* The real navigation, and the honest home for a place with no pin. */}
      {areas.length > 0 && (
        <ul className="nf-scroll-x -mx-5 mt-3 flex snap-x gap-2 px-5 pb-1 scroll-pl-5 sm:mx-0 sm:flex-wrap sm:px-0">
          {areas.map((area) => (
            <li key={area.id} className="shrink-0 snap-start">
              <Link href={`/around/${area.slug}`} className="nf-chip gap-1.5">
                <UiIcon name="location" size={12} className="shrink-0" />
                {area.name}
                <span className="nf-numeric text-[var(--nf-content-muted)]">{area.postCount}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
