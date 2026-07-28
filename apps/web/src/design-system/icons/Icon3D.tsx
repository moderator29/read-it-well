"use client";

import { useId } from "react";
import { iconRamp, type IconRampName } from "@naijafinds/design-tokens";
import { glyphs, type Glyph, type GlyphName } from "./glyphs";

/**
 * NaijaFinds Signature Object.
 *
 * The tier-two icon system from the design direction: a 3D object on a
 * neumorphic, glass-lit tile. Rendered entirely as vector so it is sharp at any
 * size and on any density, themeable, animatable and about 1KB rather than a
 * sprite sheet.
 *
 * Every object shares one camera angle, one light direction (upper left), one
 * material response and one shadow logic, which is what makes the set read as a
 * family rather than a pile of illustrations.
 */

export type Icon3DProps = {
  name: GlyphName;
  /** Rendered edge length in px. The tile and glyph scale together. */
  size?: number;
  /**
   * Fill the parent box instead of using a fixed px size. Set the size on a
   * wrapping element (for example `h-9 w-9 md:h-12 md:w-12`) so the icon can be
   * smaller on mobile than on desktop without duplicate markup.
   */
  fill?: boolean;
  /** Colour family. Defaults to the semantic mapping in `defaultRamp`. */
  ramp?: IconRampName;
  /** `tile` draws the lit container. `bare` draws only the object. */
  variant?: "tile" | "bare";
  /**
   * Accessible label. Omit for purely decorative icons, which are then hidden
   * from assistive technology instead of announcing a meaningless name.
   */
  label?: string;
  className?: string;
};

/**
 * Semantic colour assignment.
 *
 * Deliberate, not decorative: categories keep a stable hue so users learn them,
 * and money is always amber, trust always emerald, AI always the brand violet.
 */
const defaultRamp: Partial<Record<GlyphName, IconRampName>> = {
  home: "violet",
  search: "cyan",
  explore: "cyan",
  map: "sky",
  location: "rose",
  filter: "violet",

  hotel: "violet",
  apartment: "magenta",
  homes: "sky",
  restaurants: "orange",
  experiences: "magenta",
  services: "cyan",

  bookings: "violet",
  messages: "magenta",
  wallet: "amber",
  "ai-assistant": "violet",
  profile: "sky",
  settings: "slate",

  verified: "emerald",
  secure: "emerald",
  language: "cyan",
  price: "amber",
  instant: "amber",

  bed: "violet",
  bath: "cyan",
  pool: "sky",
  wifi: "cyan",
  parking: "sky",
  kitchen: "orange",

  star: "amber",
  favorite: "rose",
  notification: "amber",
  help: "slate",
  "car-rental": "sky",
  event: "magenta",
  "map-pin-cluster": "violet",
};

export function Icon3D({
  name,
  size = 48,
  fill = false,
  ramp,
  variant = "tile",
  label,
  className,
}: Icon3DProps) {
  const family = ramp ?? defaultRamp[name] ?? "violet";
  const [light, core, dark] = iconRamp[family];
  // Widened to Glyph so the optional `detail` and `shade` layers are visible.
  // `satisfies` on the registry keeps key inference while each member stays
  // assignable here.
  const glyph: Glyph = glyphs[name];

  /*
   * Unique per INSTANCE, not per name. SVG paint servers resolve url(#id)
   * against the whole document, first id wins, and a gradient whose defining
   * instance sits inside a display:none subtree (a hidden responsive rail, a
   * closed drawer) resolves to nothing, silently blanking every visible icon
   * that shares the id. useId is stable across SSR and hydration, so each
   * icon owns its defs outright and hidden duplicates can never steal them.
   */
  const uid = `nf-${useId()}-${family}`;

  const decorative = !label;

  return (
    <svg
      width={fill ? "100%" : size}
      height={fill ? "100%" : size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role={decorative ? undefined : "img"}
      aria-label={label}
      aria-hidden={decorative || undefined}
    >
      <defs>
        {/* Object material: lit from upper left, falling to an occluded lower right */}
        <linearGradient id={`${uid}-body`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={light} />
          <stop offset="52%" stopColor={core} />
          <stop offset="100%" stopColor={dark} />
        </linearGradient>

        {/* Surface detail sits brighter than the body so edges read as facets */}
        <linearGradient id={`${uid}-detail`} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.92" />
          <stop offset="100%" stopColor={light} stopOpacity="0.55" />
        </linearGradient>

        {/* Tile: soft neumorphic slab, not a flat square */}
        <linearGradient id={`${uid}-tile`} x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor={core} stopOpacity="0.30" />
          <stop offset="55%" stopColor={core} stopOpacity="0.14" />
          <stop offset="100%" stopColor={dark} stopOpacity="0.22" />
        </linearGradient>

        {/* Glass specular running off the top left corner */}
        <linearGradient id={`${uid}-spec`} x1="0" y1="0" x2="0.75" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.34" />
          <stop offset="42%" stopColor="#FFFFFF" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>

        {/* Ambient bloom under the object, the thing that sells the depth */}
        <radialGradient id={`${uid}-bloom`} cx="0.5" cy="0.55" r="0.55">
          <stop offset="0%" stopColor={core} stopOpacity="0.55" />
          <stop offset="100%" stopColor={core} stopOpacity="0" />
        </radialGradient>
      </defs>

      {variant === "tile" && (
        <>
          <rect x="1" y="1" width="62" height="62" rx="18" fill={`url(#${uid}-tile)`} />
          <rect
            x="1"
            y="1"
            width="62"
            height="62"
            rx="18"
            stroke="#FFFFFF"
            strokeOpacity="0.14"
            strokeWidth="1"
          />
          <path
            d="M19 1h26a18 18 0 0 1 18 18v6C55 12 40 3 19 1Z"
            fill={`url(#${uid}-spec)`}
          />
        </>
      )}

      <ellipse cx="32" cy="36" rx="19" ry="17" fill={`url(#${uid}-bloom)`} />

      {/* Object drawn on a 24 grid, centred and scaled into the tile */}
      <g transform="translate(14 14) scale(1.5)">
        {glyph.shade?.map((d, i) => (
          <path key={`s${i}`} d={d} fill={dark} fillOpacity="0.55" />
        ))}
        {glyph.body.map((d, i) => (
          <path key={`b${i}`} d={d} fill={`url(#${uid}-body)`} />
        ))}
        {glyph.detail?.map((d, i) => (
          <path key={`d${i}`} d={d} fill={`url(#${uid}-detail)`} />
        ))}
      </g>
    </svg>
  );
}
