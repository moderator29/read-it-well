import Image from "next/image";

/**
 * NaijaFinds 3D icon.
 *
 * These are the real pack assets, cut from the supplied sheets with their alpha
 * preserved, not redrawn approximations. Every glyph keeps the pack's own
 * neumorphic tile, lighting and material, so the set on screen is the set that
 * was designed (Master Rule 28).
 *
 * Source resolution is roughly 91 x 100 per icon, so the sensible display
 * ceiling is about 64px. Above that they soften. `size` is capped in review
 * rather than in code, because a hero treatment at 96px is a legitimate choice
 * when the surrounding art is also photographic.
 */

/**
 * Primary set: the 20 icon "3D ICON STYLE" sheet, cut at roughly 91 x 100.
 * Secondary set: ten slots the primary sheet does not cover, taken from the
 * owner's larger 192 icon pack and rescaled to match. Both are the same brand,
 * so the family stays coherent; the secondary source resolution is lower, which
 * is why those slots are only used at 40px and below.
 */
export const ICONS = [
  // primary sheet
  "home",
  "hotel",
  "apartment",
  "restaurant",
  "experience",
  "car-rental",
  "service",
  "event",
  "favorites",
  "wallet",
  "booking",
  "chat",
  "ai-assistant",
  "map",
  "filter",
  "notification",
  "profile",
  "language",
  "settings",
  "help",
  // secondary, small sizes only
  "verified",
  "secure",
  "search",
  "star",
  "bed",
  "bath",
  "pool",
  "wifi",
  "parking",
  "location",
  "kitchen",
] as const;

export type IconName = (typeof ICONS)[number];

export type IconProps = {
  name: IconName;
  /** Rendered edge length in px. */
  size?: number;
  /**
   * Accessible label. Omit for decorative icons, which are then hidden from
   * assistive technology rather than announcing a meaningless filename.
   */
  label?: string;
  className?: string;
  priority?: boolean;
};

export function Icon({ name, size = 48, label, className, priority }: IconProps) {
  return (
    <Image
      src={`/icons/${name}.png`}
      alt={label ?? ""}
      aria-hidden={label ? undefined : true}
      width={size}
      height={size}
      priority={priority}
      className={className}
      style={{ width: size, height: "auto", objectFit: "contain" }}
      // The pack ships at roughly 2x the largest display size we use.
      sizes={`${size}px`}
    />
  );
}
