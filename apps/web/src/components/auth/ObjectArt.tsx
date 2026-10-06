import Image from "next/image";
import { TIERED_OBJECTS, tieredSrc, type TieredObjectName } from "@/design-system/icons/object-assets";

/**
 * ONE ACCEPTED OBJECT, DRAWN BIG (W11, 6 October 2026).
 *
 * The hero-scale companion of `BrandIcon`: the focal object on an auth door,
 * the verified shield on the arrival moment, the objects on a tour page. It
 * reads the same two-tier map (`object-assets.ts`, D29) and draws the same
 * files; it differs in one thing, which is the point of it. `BrandIcon` is an
 * ICON: in Light it stands every object on a radius-14 paper plate with a blue
 * contact shadow (north star 14.7), which is right for a row or a tile and
 * wrong for a 120px object that IS the picture, where a plate behind it reads
 * as a sticker. Here the object sits on whatever ground the screen gave it,
 * with a soft drop shadow of its own that the surface chooses (`className`).
 *
 * Decorative by default (`alt=""`): the words on the screen carry the meaning.
 * Pass `label` only when the object stands alone. The `@2x` file is always
 * used (the optimiser resizes it for the drawn size and the device), because a
 * hero object at 1x is soft on a phone.
 */
export function ObjectArt({
  name,
  size,
  priority,
  label,
  className,
}: {
  name: TieredObjectName;
  /** The drawn edge in CSS pixels; CSS may still resize the box. */
  size: number;
  priority?: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <Image
      src={tieredSrc(TIERED_OBJECTS[name])}
      alt={label ?? ""}
      aria-hidden={label ? undefined : true}
      width={size}
      height={size}
      sizes={`${size}px`}
      draggable={false}
      {...(priority ? { priority: true } : {})}
      className={className ? `nf-object-art ${className}` : "nf-object-art"}
      data-object={name}
    />
  );
}
