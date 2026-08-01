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
] as const;

export type BrandIconName = (typeof BRAND_ICONS)[number];

export function BrandIcon({
  name,
  size = 56,
  fill,
  label,
  priority,
  tile = true,
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
  /** Draw the glass chip behind the object. On by default. */
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
   * The object is rendered inside its own tile by default. The artwork is a
   * lit ceramic object photographed on white: without a container it floats
   * with nothing holding it, which is exactly what a bare icon looked like.
   * The tile is the platform's glass chip, so every object sits on the same
   * material as the rest of the design system.
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
    return <span className={className}>{img}</span>;
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
