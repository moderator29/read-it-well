import Image from "next/image";

import type { ListingKind } from "@/lib/listings/types";

/**
 * The one photographic frame on the platform.
 *
 * Every place on Vallo that paints a listing photograph paints it on top of
 * this: the listing card, the gallery hero, the photo grid, the lightbox, the
 * map dock, the featured carousel and the message sheets. What shows through
 * when the photograph has not arrived, or the CDN cannot be reached, is this
 * frame rather than an empty box or a broken image icon.
 *
 * WHY IT EXISTS AS ONE FILE. Six files each carried their own copy of an
 * identical six-pair gradient array and an identical skyline path, and the
 * copies had already begun to disagree: three of them drew the moon and three
 * did not, two ran the silhouette at 0.6 opacity and one at 0.7, and one had
 * dropped `aria-hidden` from the SVG so a screen reader announced a graphic
 * with no name in the middle of a message thread. A fallback that differs by
 * surface is a fallback nobody can reason about.
 *
 * WHY THE COLOURS ARE NOT BRAND COLOURS. The six original pairs were Tailwind's
 * indigo, sky and slate defaults. None of them is a Vallo colour, none came
 * from the token layer, and all six were dark, so in daylight an unloaded
 * photograph punched a navy hole through a white page. The ground reads from
 * `--nf-media-ground-*`, which is a quiet depth of the surface family in each
 * theme: a place with no photograph looks like a place with no photograph, not
 * like a designed feature.
 *
 * ---------------------------------------------------------------------------
 * IT DRAWS THE PROPERTY NOW, AND IT USED TO DRAW ONE GENERIC SKYLINE.
 *
 * THE PROBLEM THIS SOLVES IS NOT COSMETIC. Every published listing in the
 * catalogue today has zero rows in `listing_photos` - checked, all of them -
 * so the fallback is not an edge case that shows up while a CDN is slow, it is
 * WHAT THE ENTIRE PRODUCT LOOKS LIKE. Forty-two properties, and each one was a
 * dark gradient with the same twelve-tower city silhouette across the bottom,
 * so a bungalow in Bodija, a plot of land in Epe and an office floor in Victoria
 * Island were three pictures of the same skyline. Opening a listing showed a
 * near-black panel where the photograph goes, which reads as a page that failed
 * to load rather than as a place.
 *
 * So the frame draws THIS property: nine scenes, chosen by `kind`, each built
 * from the same five tokens. A house gets a pitched roof, a door and lit
 * windows; a terrace gets three of them shoulder to shoulder; land gets a fence
 * line, a survey peg and a treeline with nothing built on it yet; a plot for
 * sale should not be illustrated with a building on it. The hue still varies
 * the sky angle, the sun's position and which windows are lit, so a grid of
 * twenty cards has twenty different pictures rather than twenty copies.
 *
 * AND THEN THE DRAWING STOPPED BEING THE ANSWER FOR MOST KINDS. It was argued
 * for on the grounds that a photograph of somebody else's building is a claim
 * about a property we cannot make, and that reasoning still holds for STOCK
 * photography, which is why none is used. What it got wrong is that we already
 * own two real architectural images, so the choice was never "a drawing or a
 * lie"; it was "a drawing or our own photograph". See the section below.
 *
 * The drawing survives for LAND, where it is not standing in for a photograph
 * at all but stating that there is nothing built to photograph, and as the
 * fallback for any surface that does not know which market it is showing.
 */

/* ========================================================================== */
/* SECTION: the photograph                                                    */
/* ========================================================================== */

/**
 * REAL ARCHITECTURE, FROM OUR OWN ASSETS.
 *
 * The drawn scenes below are honest and they do not look like a property
 * marketplace. Every platform in this market leads with photography, the owner
 * has said so twice, and a flat vector house on a card next to a competitor's
 * photograph loses that comparison before a word is read.
 *
 * WHAT MADE THIS HARD AND HOW IT IS SOLVED. Stock photography cannot be fetched
 * from this environment at all - the network policy answers 403 to every image
 * host - and a photograph of somebody else's building placed on a listing would
 * be a claim about that property we cannot make anyway. But two genuine
 * architectural images are already in this repository and already ours:
 * `vallo-villa.png`, which opens the landing page, and `vallo-city.png`.
 *
 * So a listing with no photograph of its own gets one of those two, chosen by
 * what kind of place it is: the villa for anything somebody lives in, the city
 * for a block, a hotel or an office floor. LAND KEEPS THE DRAWING, because a
 * plot has nothing built on it and putting a house on it would be the picture
 * contradicting the listing.
 *
 * TWENTY CARDS DO NOT LOOK IDENTICAL. The listing's own hue drives the crop, so
 * neighbouring cards frame the same building differently, and a brand-tinted
 * scrim varies with it. That is the same trick the gradient angle already used
 * and it is why `hue` exists on every record.
 *
 * IT IS STILL A STAND-IN AND IS STILL LABELLED. Every one of these rows carries
 * the example mark on the card and the full sentence on its detail page. When
 * an agent uploads real photography of a real property, that photograph is
 * painted on top of this by every call site and none of this is reached.
 */
const STAND_IN: Record<Scene, string | null> = {
  house: "/brand/vallo-villa.png",
  villa: "/brand/vallo-villa.png",
  terrace: "/brand/vallo-villa.png",
  shortlet: "/brand/vallo-villa.png",
  flats: "/brand/vallo-city.png",
  tower: "/brand/vallo-city.png",
  hotel: "/brand/vallo-city.png",
  shop: "/brand/vallo-city.png",
  /* Nothing is built here, so nothing built is shown. */
  land: null,
};

/** Six framings of the same building, so a grid does not repeat one crop. */
const CROPS = ["50% 50%", "30% 60%", "70% 45%", "40% 35%", "60% 70%", "50% 30%"];

/** How many distinct angles a hue can resolve to. */
const ANGLES = [150, 168, 205, 132, 188, 218];

/**
 * Deterministic gradient angle for a listing.
 *
 * Exported because the card and the carousel apply the ground to their own
 * hover-scaling media layer rather than to a child of it, so they need the
 * angle without needing the element.
 */
export function mediaAngle(hue: number, index = 0): number {
  const at = Math.abs(hue + index) % ANGLES.length;
  return ANGLES[at] ?? ANGLES[0]!;
}

/** The ground a photograph sits on, as a CSS `background` value. */
export function mediaGround(hue: number, index = 0): string {
  return `linear-gradient(${mediaAngle(hue, index)}deg, var(--nf-media-ground-from) 0%, var(--nf-media-ground-to) 100%)`;
}

/* ========================================================================== */
/* SECTION: the scene                                                         */
/* ========================================================================== */

/** Where the ground meets the sky, in the 400 by 300 viewBox. */
const HORIZON = 232;

/**
 * The nine scenes, and which market draws which.
 *
 * `restaurant` and `experience` are in `ListingKind` and are not markets this
 * platform sells; both fall back to a frontage and a house respectively rather
 * than getting drawings of their own, because a scene nobody sees is a scene
 * nobody maintains.
 */
type Scene = "flats" | "tower" | "hotel" | "house" | "villa" | "shortlet" | "terrace" | "shop" | "land";

const SCENE_BY_KIND: Record<ListingKind, Scene> = {
  apartment: "flats",
  office: "tower",
  hotel: "hotel",
  home: "house",
  villa: "villa",
  shortlet: "shortlet",
  rental: "terrace",
  shop: "shop",
  land: "land",
  restaurant: "shop",
  experience: "house",
};

/**
 * Whether window `i` of this listing has a light on.
 *
 * Deterministic from the hue, so the same property draws the same windows on
 * the server and on the client and there is no hydration mismatch, and two
 * cards side by side light differently. Roughly two windows in five, which is
 * what an evening block of flats looks like; all of them lit reads as a render
 * bug and none of them reads as abandoned.
 */
function lit(hue: number, i: number): boolean {
  return (Math.abs(hue + 1) * 37 + i * 53) % 7 < 3;
}

/** A grid of windows on a face, as one array of rects. */
function windows(
  hue: number,
  seed: number,
  x: number,
  y: number,
  cols: number,
  rows: number,
  w: number,
  h: number,
  gapX: number,
  gapY: number,
) {
  const out = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const i = seed + r * cols + c;
      out.push(
        <rect
          key={`${seed}-${r}-${c}`}
          x={x + c * (w + gapX)}
          y={y + r * (h + gapY)}
          width={w}
          height={h}
          rx={1.5}
          fill={lit(hue, i) ? "var(--nf-media-glass)" : "var(--nf-media-wall-shade)"}
        />,
      );
    }
  }
  return out;
}

/** One house: body, pitched roof, door, and a lit window either side. */
function house(hue: number, seed: number, x: number, width: number, height: number, door = true) {
  const top = HORIZON - height;
  const eave = top + height * 0.32;
  return (
    <g key={`house-${seed}`}>
      {/* Roof first, so the body's edge sits cleanly under it. */}
      <path
        d={`M${x - 8} ${eave}L${x + width / 2} ${top}L${x + width + 8} ${eave}Z`}
        fill="var(--nf-media-roof)"
      />
      <rect x={x} y={eave} width={width} height={HORIZON - eave} fill="var(--nf-media-wall)" />
      {/* The side the light does not reach. Every scene is lit from the upper
          left, the same direction as the brand icon pack, so a card carrying
          both does not contain two suns. */}
      <rect
        x={x + width * 0.72}
        y={eave}
        width={width * 0.28}
        height={HORIZON - eave}
        fill="var(--nf-media-wall-shade)"
      />
      {door && (
        <rect
          x={x + width / 2 - width * 0.09}
          y={HORIZON - (HORIZON - eave) * 0.52}
          width={width * 0.18}
          height={(HORIZON - eave) * 0.52}
          rx={2}
          fill="var(--nf-media-wall-shade)"
        />
      )}
      {windows(hue, seed, x + width * 0.12, eave + 14, 2, 1, width * 0.2, 16, width * 0.36, 0)}
    </g>
  );
}

/**
 * The property, drawn.
 *
 * Kept as an exported component under its old name so the seven call sites and
 * the `PhotoFrame` re-export do not all have to change at once; `hue` still
 * means what it meant, and `kind` is optional so a surface that genuinely does
 * not know the market still gets a scene rather than an empty box.
 */
export function MediaSkyline({
  hue = 0,
  kind,
  className,
}: {
  hue?: number;
  kind?: ListingKind;
  className?: string;
}) {
  const scene = SCENE_BY_KIND[kind ?? "home"];
  const sunX = 60 + (Math.abs(hue) % 5) * 62;

  return (
    <svg
      viewBox="0 0 400 300"
      className={`absolute inset-0 h-full w-full ${className ?? ""}`}
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      {/* The sun, or the moon. One disc, one token, and the token is the one
          that already changed with the theme. */}
      <circle cx={sunX} cy={58} r={24} fill="var(--nf-media-moon)" />

      {/* The far side of town: a soft band that never competes with the
          subject. Absent on land, because the point of that scene is that
          there is nothing built here. */}
      {scene !== "land" && (
        <path
          d="M0 232V196h30v-22h26v22h34v-34h30v34h26v-18h32v18h30v-28h28v28h34v-16h30v16h34v-24h32v24h34Z"
          fill="var(--nf-media-silhouette)"
          opacity={0.45}
        />
      )}

      {/* --------------------------------------------------------- the subject */}

      {scene === "flats" && (
        <g>
          <rect x={92} y={92} width={100} height={HORIZON - 92} fill="var(--nf-media-wall)" />
          <rect x={164} y={92} width={28} height={HORIZON - 92} fill="var(--nf-media-wall-shade)" />
          {windows(hue, 3, 104, 106, 3, 6, 16, 14, 10, 8)}
          <rect x={206} y={128} width={78} height={HORIZON - 128} fill="var(--nf-media-wall)" />
          <rect x={262} y={128} width={22} height={HORIZON - 128} fill="var(--nf-media-wall-shade)" />
          {windows(hue, 31, 216, 142, 2, 4, 16, 14, 12, 10)}
        </g>
      )}

      {scene === "tower" && (
        <g>
          <rect x={132} y={62} width={112} height={HORIZON - 62} fill="var(--nf-media-wall)" />
          <rect x={214} y={62} width={30} height={HORIZON - 62} fill="var(--nf-media-wall-shade)" />
          {/* Ribbon glazing rather than punched windows: it is the one detail
              that separates an office floor from a block of flats at this
              size, and it is the only thing this scene has to say. */}
          {[0, 1, 2, 3, 4, 5, 6].map((r) => (
            <rect
              key={r}
              x={140}
              y={78 + r * 22}
              width={96}
              height={12}
              rx={2}
              fill={lit(hue, r) ? "var(--nf-media-glass)" : "var(--nf-media-wall-shade)"}
            />
          ))}
        </g>
      )}

      {scene === "hotel" && (
        <g>
          <rect x={64} y={104} width={248} height={HORIZON - 104} fill="var(--nf-media-wall)" />
          <rect x={276} y={104} width={36} height={HORIZON - 104} fill="var(--nf-media-wall-shade)" />
          {windows(hue, 7, 80, 120, 8, 4, 20, 14, 8, 12)}
          {/* The canopy over the door, which is what a hotel has and a block of
              flats does not. */}
          <rect x={158} y={HORIZON - 30} width={84} height={8} rx={3} fill="var(--nf-media-roof)" />
          <rect
            x={176}
            y={HORIZON - 22}
            width={48}
            height={22}
            fill="var(--nf-media-glass)"
            opacity={0.7}
          />
        </g>
      )}

      {scene === "house" && house(hue, 11, 128, 156, 108)}

      {scene === "shortlet" && (
        <g>
          <rect x={140} y={132} width={126} height={HORIZON - 132} fill="var(--nf-media-wall)" />
          <rect x={240} y={132} width={26} height={HORIZON - 132} fill="var(--nf-media-wall-shade)" />
          {windows(hue, 19, 152, 148, 2, 2, 34, 20, 14, 16)}
          {/* Two balcony slabs. A shortlet is one unit in a small block, and
              the balcony is the cheapest way to say "one unit" in a drawing. */}
          <rect x={140} y={186} width={126} height={5} fill="var(--nf-media-roof)" />
          <rect x={140} y={126} width={126} height={6} rx={2} fill="var(--nf-media-roof)" />
        </g>
      )}

      {scene === "villa" && (
        <g>
          <rect x={96} y={124} width={208} height={HORIZON - 124} fill="var(--nf-media-wall)" />
          <rect x={268} y={124} width={36} height={HORIZON - 124} fill="var(--nf-media-wall-shade)" />
          <rect x={90} y={118} width={220} height={7} rx={3} fill="var(--nf-media-roof)" />
          {/* Full-height glazing across the ground floor, which is the one
              thing every villa in the catalogue actually has in common. */}
          <rect x={112} y={176} width={80} height={HORIZON - 176} fill="var(--nf-media-glass)" opacity={0.55} />
          {windows(hue, 23, 116, 138, 3, 1, 40, 22, 16, 0)}
          {/* The pool, in front, on the ground plane. */}
          <ellipse cx={200} cy={262} rx={104} ry={20} fill="var(--nf-media-glass)" opacity={0.32} />
        </g>
      )}

      {scene === "terrace" && (
        <g>
          {house(hue, 41, 60, 96, 92)}
          {house(hue, 47, 152, 96, 92)}
          {house(hue, 53, 244, 96, 92)}
        </g>
      )}

      {scene === "shop" && (
        <g>
          <rect x={104} y={140} width={192} height={HORIZON - 140} fill="var(--nf-media-wall)" />
          {/* The sign board and the awning under it: a frontage, not a home. */}
          <rect x={104} y={140} width={192} height={20} fill="var(--nf-media-wall-shade)" />
          <path
            d="M100 168h200l-14 22H114Z"
            fill="var(--nf-media-roof)"
          />
          <rect x={126} y={196} width={72} height={HORIZON - 196} fill="var(--nf-media-glass)" opacity={0.5} />
          <rect x={214} y={196} width={62} height={HORIZON - 196} fill="var(--nf-media-glass)" opacity={0.5} />
        </g>
      )}

      {scene === "land" && (
        <g>
          {/* Nothing is built here, and the drawing says so: a boundary, a
              survey peg and a treeline. A plot illustrated with a house on it
              would be the picture contradicting the listing. */}
          <path
            d="M0 226q34-16 72-12t74 10 76-8 78-12 100 6"
            fill="none"
            stroke="var(--nf-media-silhouette)"
            strokeWidth={3}
          />
          {[48, 108, 168, 228, 288, 348].map((x, i) => (
            <rect
              key={x}
              x={x}
              y={HORIZON - 34 - (i % 2) * 4}
              width={5}
              height={34 + (i % 2) * 4}
              rx={2}
              fill="var(--nf-media-wall)"
            />
          ))}
          <rect x={40} y={HORIZON - 26} width={320} height={4} fill="var(--nf-media-wall-shade)" />
          <rect x={40} y={HORIZON - 14} width={320} height={4} fill="var(--nf-media-wall-shade)" />
          {/* The peg, and the sightline off it. */}
          <rect x={196} y={HORIZON - 56} width={7} height={56} rx={2} fill="var(--nf-media-roof)" />
          <path d={`M203 ${HORIZON - 56}h34l-10 11 10 11h-34Z`} fill="var(--nf-media-glass)" opacity={0.6} />
        </g>
      )}

      {/* --------------------------------------------------------- the ground */}
      <rect x={0} y={HORIZON} width={400} height={300 - HORIZON} fill="var(--nf-media-land)" />
      <rect x={0} y={HORIZON} width={400} height={2} fill="var(--nf-media-wall-shade)" />
    </svg>
  );
}

/**
 * The full frame: ground plus the drawn property, absolutely positioned to its
 * parent.
 *
 * The parent must be `relative` and clip its own overflow, which every call
 * site already does because it is also positioning a `fill` image.
 */
export function MediaFrame({
  hue,
  /** Position in a run of panes, so neighbours do not share a sky angle. */
  index = 0,
  /** Which market this is, so the picture is of this kind of place. */
  kind,
  className,
}: {
  hue: number;
  index?: number;
  kind?: ListingKind;
  className?: string;
}) {
  const scene = SCENE_BY_KIND[kind ?? "home"];
  const photo = STAND_IN[scene];
  const at = Math.abs(hue + index) % CROPS.length;

  return (
    <div
      aria-hidden="true"
      className={`absolute inset-0 overflow-hidden ${className ?? ""}`}
      style={{ background: mediaGround(hue, index) }}
    >
      {photo ? (
        <>
          <Image
            src={photo}
            alt=""
            fill
            sizes="(max-width: 640px) 50vw, 33vw"
            style={{ objectFit: "cover", objectPosition: CROPS[at] }}
          />
          {/* A brand-tinted wash that varies with the hue, so a run of cards
              reads as a set rather than as the same photograph six times, and
              so white text over the bottom of the frame stays legible. It is a
              token gradient rather than a colour, so it follows the theme. */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(${mediaAngle(hue, index)}deg, transparent 30%, color-mix(in oklab, var(--nf-media-ground-to) ${55 + at * 4}%, transparent) 100%)`,
            }}
          />
        </>
      ) : (
        <MediaSkyline hue={hue + index} kind={kind} />
      )}
    </div>
  );
}
