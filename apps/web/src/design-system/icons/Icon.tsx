import { Icon3D } from "./Icon3D";
import type { GlyphName } from "./glyphs";
import type { IconRampName } from "@naijafinds/design-tokens";

/**
 * NaijaFinds icon.
 *
 * The platform icon is a vector signature object rendered by Icon3D: a 3D glyph
 * on a glass-lit tile, one camera angle, one light direction, sharp at any size
 * and density. This replaced the raster pack, which softened badly below 64px
 * and could not be recoloured or animated. The public name set is kept stable
 * so every call site upgrades without change; a small alias table maps the
 * historical singular or shorthand names onto the canonical glyph keys.
 */

export const ICONS = [
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

/** Historical names that differ from the canonical glyph key. */
const ALIAS: Partial<Record<IconName, GlyphName>> = {
  restaurant: "restaurants",
  experience: "experiences",
  booking: "bookings",
  chat: "messages",
  favorites: "favorite",
  service: "services",
};

export type IconProps = {
  name: IconName;
  /** Rendered edge length in px. Ignored when `fill` is set. */
  size?: number;
  /** Fill the parent box so the icon can be sized responsively by a wrapper. */
  fill?: boolean;
  /** Override the semantic colour family. */
  ramp?: IconRampName;
  /**
   * Accessible label. Omit for decorative icons, which are then hidden from
   * assistive technology rather than announcing a meaningless name.
   */
  label?: string;
  className?: string;
  /** Accepted for API compatibility with the former raster icon. No effect. */
  priority?: boolean;
};

export function Icon({ name, size = 48, fill, ramp, label, className }: IconProps) {
  const glyph = (ALIAS[name] ?? name) as GlyphName;
  return (
    <Icon3D name={glyph} size={size} fill={fill} ramp={ramp} label={label} className={className} />
  );
}
