import Image from "next/image";

import { isOptimisable } from "@/lib/images/optimisable";

/**
 * A photograph or an avatar whose URL came out of the database.
 *
 * ## Why this is not just `<Image>`
 *
 * Two things have to be true at once and `next/image` alone gives only one
 * of them:
 *
 *   1. **It must be sized for the device.** A Nigerian phone on mobile data
 *      fetching a 2000px upload to fill a 40px circle is the difference
 *      between a product that feels instant and one that feels broken, and
 *      it is money out of somebody's pocket. That is what `sizes` buys.
 *   2. **It must never take the screen down.** `next/image` throws on a host
 *      outside `images.remotePatterns`, and a stored URL is whatever a
 *      previous version of the product wrote there.
 *
 * `isOptimisable` decides which of the two paths a given source takes, from
 * the same allowlist `next.config.ts` builds. Known host: optimised, with a
 * srcset and the `sizes` the call site declared. Anything else, including a
 * `blob:` preview and a signed storage URL: still a `next/image`, but
 * `unoptimized`, which is a plain fetch that cannot throw.
 *
 * ## Why `width` and `height` rather than `fill`
 *
 * `fill` needs a positioned ancestor, and the containers these images sit in
 * are styled by CSS files other workers own. Passing the intrinsic shape
 * instead lets the existing `width: 100%; height: 100%; object-fit: cover`
 * rules keep doing exactly what they already do, with no stylesheet touched
 * and no layout to re-prove. The numbers are the ASPECT the box wants, not a
 * promise about pixels.
 *
 * Server safe: no state, no effects, no client boundary.
 */
export function RemoteImage({
  src,
  alt,
  width,
  height,
  sizes,
  className,
  priority,
  loading,
  quality,
}: {
  src: string;
  /** Empty string only where the image is decorative and labelled elsewhere. */
  alt: string;
  width: number;
  height: number;
  /** What the box is actually worth on screen. Required: it is the point. */
  sizes: string;
  className?: string;
  priority?: boolean;
  loading?: "eager" | "lazy";
  quality?: number;
}) {
  const optimisable = isOptimisable(src);
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      className={className}
      priority={priority}
      loading={loading}
      quality={quality}
      unoptimized={!optimisable}
    />
  );
}
