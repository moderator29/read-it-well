/**
 * Can this URL go through `next/image`'s optimiser without taking the screen
 * down.
 *
 * ## The failure this exists to stop
 *
 * `next/image` THROWS at render on a host that is not in
 * `images.remotePatterns`. Not a broken picture: a throw, which on a server
 * component is a 500 for the whole route. One row in the database holding an
 * avatar on an unexpected host would therefore blank the app header, and the
 * app header is on every screen in the product.
 *
 * That risk is why roughly thirty raw `<img>` tags were written across this
 * codebase, each with an `eslint-disable` and a comment defending it. Several
 * of those comments say the Supabase public bucket is "outside the image
 * optimiser's allowed hosts", and that has NOT been true since the Supabase
 * host was derived into `next.config.ts`. The comments outlived the config,
 * and the product kept serving full resolution photographs to 390px phones on
 * metered data because of a line nobody rechecked.
 *
 * So the question is answered here, in one place, from the same three facts
 * `next.config.ts` builds its allowlist from. A URL we know the optimiser
 * accepts is optimised; anything else still renders through `next/image` with
 * `unoptimized`, which is a plain fetch and cannot throw. The picture always
 * appears. The only thing at stake is whether it was resized first.
 *
 * KEEP THIS IN STEP WITH `images.remotePatterns` IN `next.config.ts`. It is
 * the same list, stated twice, because that file exports a config object and
 * not a predicate. Being wrong in the SAFE direction here costs an
 * unoptimised image; being wrong in the other direction costs a 500, so when
 * in doubt this returns false.
 */

/** Derived from the public project URL, exactly as `next.config.ts` does. */
const SUPABASE_HOST = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (url.length === 0) return "";
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
})();

/**
 * True when `next/image` may optimise this source.
 *
 * Relative paths are always true: they are served by this app, which is what
 * the optimiser is for. Everything else must match the allowlist exactly,
 * path prefix included, because that is what the optimiser itself checks.
 */
export function isOptimisable(src: string): boolean {
  if (src.length === 0) return false;

  // Our own `public/` assets and anything served from this origin.
  if (src.startsWith("/") && !src.startsWith("//")) return true;

  // `blob:` (a local file preview) and `data:` (an inlined icon) have no host
  // and nothing to optimise; the optimiser rejects both.
  if (!src.startsWith("https://")) return false;

  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return false;
  }

  if (url.hostname === "images.unsplash.com") return true;

  // A Google account's own photo. Google serves it from lh3 through lh6 and
  // picks the shard itself, so the pattern is the suffix, pinned to the
  // avatar path prefix exactly as `next.config.ts` pins it.
  if (url.hostname.endsWith(".googleusercontent.com") && url.pathname.startsWith("/a/")) return true;

  /*
   * The Supabase storage CDN, PUBLIC OBJECTS ONLY.
   *
   * A SIGNED url (`/storage/v1/object/sign/...`) is deliberately excluded and
   * this is not an oversight. It is not in `next.config.ts`, so optimising one
   * would throw; and a signed URL carries its token in the query string, which
   * is exactly the thing that should not be handed to a shared image cache.
   * Chat photographs and KYC documents are signed, so they stay unoptimised
   * until it is decided whether that host pattern belongs in the config.
   */
  if (
    SUPABASE_HOST.length > 0 &&
    url.hostname === SUPABASE_HOST &&
    url.pathname.startsWith("/storage/v1/object/public/")
  ) {
    return true;
  }

  return false;
}
