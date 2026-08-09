import Image from "next/image";

/**
 * RentMe brand icon.
 *
 * The commissioned 3D icon pack: white ceramic objects with brand blue
 * accents, each resting on its own soft plinth, lit from the upper left.
 * These are the platform's signature content icons, replacing the vector
 * Icon3D family on every surface where an object is being represented.
 *
 * They are rendered as square images on transparent-friendly white plinths,
 * so they sit naturally on paper in daylight and inside a soft luminous
 * chip at night. Navigation keeps the stroked UiIcon glyphs; these are
 * never used for navigation.
 *
 * THE TILE IS OFF BY DEFAULT, and it used to be on.
 *
 * `tile` defaulted to true, so 144 of the 149 call sites on the platform drew
 * the full glass chip: a gradient shell, an inner well drawn with a second
 * pseudo-element, a four-layer box-shadow and a blue glow, a 1.5px gradient
 * border and a parallax transform. Almost all of those tiles sit INSIDE an
 * `.nf-card`, which already carries a gradient border, its own rim and its own
 * elevation shadow. Two containers deep, six visual layers, around one 24px
 * icon. That is the single largest reason the product reads as choked: not any
 * one screen, but the same nested chrome repeated 144 times.
 *
 * A tile is now something a surface asks for, and the answer is usually no.
 * Ask for it where the object is the SUBJECT rather than an ornament: an empty
 * state whose whole content is one object and a sentence, a category grid
 * where the chip is the tap target, the showcase panel whose job is to display
 * the material itself. An icon beside a heading, inside a button, in a list
 * row or on a stat tile does not get one.
 */

export const BRAND_ICONS = [
  "bell-alert",
  "bell-badge",
  "booking-instant",
  "bot",
  "bot-chat",
  "bot-home",
  "calendar-check",
  "calendar-clock",
  "calendar-home",
  "calendar-time",
  "camera",
  "card-lock",
  "chart-growth",
  "chat",
  "chat-duo",
  "cleaning",
  "clock-check",
  "doc-lock",
  "doc-shield",
  "gift",
  "gift-star",
  "globe-pin",
  "heart-home",
  "home-cam",
  "home-check",
  "home-refresh",
  "home-search",
  "home-swap",
  "homes-sparkle",
  "hotel-star",
  "house-sparkle",
  "key-cycle",
  "keys-home",
  "keys-tag",
  "listing-review",
  "listing-search",
  "luggage-check",
  "luggage-plane",
  "map-route",
  "map-spot",
  "naira-hand",
  "phone-home",
  "pin-map",
  "report-stats",
  "reviews",
  "search-home",
  "shield-check",
  "shield-home",
  "shield-lock",
  "support-chat",
  "support-shield",
  "tag-hash",
  "tag-percent",
  "tour-360",
  "user-check",
  "user-verified",
  "wallet-secure",

  /*
   * ------------------------------------------------- PROPERTY TYPES
   *
   * Thirty objects, one per kind of place somebody can list. Everything above
   * this line is an ACTION or a CONCEPT: a wallet, a shield, a calendar. These
   * are the things themselves.
   *
   * Why it matters that they exist. Until now every property type reached for
   * the same handful of house objects, so a mansion, a mini flat and a
   * warehouse were drawn with the same picture and the icon carried no
   * information at all. A category grid where every tile looks alike is a
   * category grid nobody reads.
   *
   * Cropped from two supplied sheets rather than drawn: 384px square, white
   * paper, the same format as all 57 above, so they sit in a row together
   * without one of them looking imported. The crop finds the blank gap between
   * the object and its caption instead of slicing at a fixed fraction, which
   * is how "Land / Plot" ended up baked into the first attempt at `land-plot`
   * as pixels. See the contact sheet check in the commit for that one.
   */
  "beach-house",
  "bungalow",
  "cluster-home",
  "container-home",
  "coworking-space",
  "duplex",
  "farm-house",
  "hotel",
  "house-boat",
  "lake-house",
  "land-plot",
  "loft",
  "mansion",
  "mini-flat",
  "modern-house",
  "mountain-cabin",
  "office-space",
  "parking-space",
  "penthouse",
  "serviced-apartment",
  "shared-apartment",
  "shop-retail",
  "studio-apartment",
  "swimming-pool",
  "terrace-house",
  "townhouse",
  "tree-house",
  "twin-house",
  "villa",
  "warehouse",
] as const;

export type BrandIconName = (typeof BRAND_ICONS)[number];

export function BrandIcon({
  name,
  size = 56,
  fill,
  label,
  priority,
  tile = false,
  state,
  index,
  className,
}: {
  name: BrandIconName;
  /** Rendered edge length in px. Ignored when `fill` is set. */
  size?: number;
  /** Fill the parent box so a wrapper can size the icon responsively. */
  fill?: boolean;
  /** Accessible name. Omit for decorative icons. */
  label?: string;
  priority?: boolean;
  /**
   * Draw the full glass chip behind the object. OFF by default: see the note
   * at the top of this file. Turn it on only where the object is the subject
   * of the surface rather than an ornament on it.
   */
  tile?: boolean;
  /**
   * React to something real rather than to a loop: "alert" rings the object
   * while something is unread, "confirmed" pops it once when a booking lands,
   * "verified" pulses its inner ring while a check is in force.
   */
  state?: "alert" | "confirmed" | "verified";
  /** Position in a grid, so a row of tiles staggers its light sweep. */
  index?: number;
  className?: string;
}) {
  const decorative = !label;
  /*
   * `fill` here means "fill the wrapper box", implemented with intrinsic
   * dimensions plus width and height of 100 percent rather than Next's
   * absolute fill mode. Absolute fill escapes any wrapper that is not
   * positioned, which silently spills icons across the card they belong to.
   *
   * WHY AN UNTILED OBJECT STILL GETS A GROUND, AND WHY IT IS ONE FLAT PLATE.
   *
   * The artwork is opaque RGB rendered on white, with no alpha channel, and
   * the white is removed at paint time by `mix-blend-mode: multiply` in
   * glass.css. Multiply against the night canvas returns the night canvas, so
   * an object with nothing light behind it is not understated, it is
   * INVISIBLE. Dropping the tile without answering that would have deleted
   * 144 icons from the dark theme, which is the default theme.
   *
   * So an untiled object gets `--nf-icon-ground`: one flat plate, squircle
   * radius, no border, no rim, no shadow, no glow, no parallax. One layer
   * instead of six. In daylight the same token resolves to `transparent`,
   * because multiply is the identity against white and the object genuinely
   * needs nothing there.
   *
   * The ground sits on the WRAPPER rather than on the image. `mix-blend-mode`
   * blends an element together with its own background, so a plate painted on
   * the blended element would multiply itself into the canvas and vanish with
   * everything else.
   *
   * WHY A FIXED-SIZE TILE OVERRIDES ITS OWN PADDING. The tile is styled with
   * `padding: 9%`, and a percentage padding resolves against the width of the
   * CONTAINING BLOCK, never against the element's own width. When the tile
   * fills a sized wrapper that is harmless, because the wrapper is the same
   * small box. But a `size`d tile sitting directly in something wide, a button
   * or a flex row, resolved 9% against that wide parent: a 22px chip inside a
   * 330px button was handed roughly 30px of padding per side, which crushed its
   * content box to zero and rendered a 0 by 0 image. The result was an empty
   * white chip, which is exactly what "Add New Listing" on the agent dashboard
   * was showing, and it affected every non-fill BrandIcon on the platform.
   *
   * So when this component owns the tile's dimensions it also owns its padding,
   * in pixels derived from that size. Same proportion, no dependence on whatever
   * the tile happens to sit inside.
   */
  const tilePadding = Math.max(2, Math.round(size * 0.09));
  const insideTile = tile;
  const img = (
    <Image
      src={`/brand/icons/${name}.png`}
      alt={label ?? ""}
      aria-hidden={decorative || undefined}
      priority={priority}
      width={fill ? 160 : size}
      height={fill ? 160 : size}
      sizes={fill ? "(max-width: 640px) 26vw, 160px" : undefined}
      className={`nf-brand-icon ${fill || insideTile ? "h-full w-full" : ""}`}
    />
  );

  if (!tile) {
    /* The plate hugs the image exactly rather than being sized here: the
       artwork already carries its own white margin, and multiply turns that
       margin into the plate colour, so the ground reads as a soft square with
       the object breathing inside it and no padding of its own. Sizing stays
       wherever the call site already put it. */
    return (
      <span
        className={`nf-brand-icon-ground ${fill ? "block h-full w-full" : "inline-flex"} ${className ?? ""}`}
      >
        {img}
      </span>
    );
  }

  return (
    <span
      data-state={state}
      style={
        {
          ...(fill ? {} : { width: size, height: size, padding: tilePadding }),
          ...(index !== undefined ? { "--tile-i": index } : {}),
        } as React.CSSProperties
      }
      className={`nf-icon-tile ${fill ? "h-full w-full" : ""} ${className ?? ""}`}
    >
      {img}
    </span>
  );
}
