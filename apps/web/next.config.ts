import type { NextConfig } from "next";

/**
 * The Supabase storage hostname, taken from the public project URL. Returns
 * an empty string when the URL is missing or malformed, so a build without
 * keys never throws and simply serves the seed catalogue.
 */
const supabaseImageHost = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (url.length === 0) return "";
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
})();

const nextConfig: NextConfig = {
  reactStrictMode: true,

  /**
   * Where the build output goes. `.next` unless something asks otherwise.
   *
   * This exists because more than one person builds this app at once. Two
   * concurrent `next build` runs share one `.next`, and the second one's
   * `rm -rf` deletes `build-manifest.json` out from under the first, which
   * fails as "ENOENT ... build-manifest.json" during page collection, or as a
   * running server suddenly 500ing on every route with a missing
   * `required-server-files.json`. Both failures point at a file rather than at
   * the cause, and both cost real time before anyone suspects the other build.
   *
   * Setting NEXT_DIST_DIR gives a parallel worker its own output directory, so
   * `NEXT_DIST_DIR=.next-a2 npx next build` and the matching `next start` never
   * touch the shared one. The deploy path sets nothing and behaves exactly as
   * before.
   */
  distDir: process.env.NEXT_DIST_DIR || ".next",

  // Workspace packages ship raw TypeScript, so Next compiles them in place.
  transpilePackages: ["@naijafinds/design-tokens", "@naijafinds/i18n"],

  // Two image sources, both explicitly allowed through the optimiser and
  // nothing else: the seed catalogue's Unsplash photography, and the Supabase
  // storage CDN that serves agent-uploaded listing photos and avatars once
  // real supply lands. The Supabase host is derived from the project URL so it
  // follows the environment rather than being hardcoded, and the pattern is
  // omitted entirely when the URL is absent, which keeps the allowlist tight
  // in a build without keys.
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      ...(supabaseImageHost
        ? ([
            {
              protocol: "https" as const,
              hostname: supabaseImageHost,
              pathname: "/storage/v1/object/public/**",
            },
          ])
        : []),
    ],
  },

  // Security headers. Applied at the edge for every route.
  async headers() {
    return [
      /*
       * The self-hosted faces. Everything under /public is served with
       * `max-age=0` by default, which for a font means a revalidation request
       * on every navigation for bytes that will never change. These seven files
       * are immutable by construction: the name IS the version, and replacing
       * one means giving it a new name. See public/fonts/README.md.
       */
      {
        source: "/fonts/:file*.woff2",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      /*
       * The Apple app site association file, which is the iOS half of the deep
       * link contract and the one piece of it that a correct file on disk is
       * not enough for.
       *
       * Apple requires the file to be served with no extension, at exactly
       * `/.well-known/apple-app-site-association`, AND as `application/json`.
       * A file with no extension has nothing for a MIME lookup to work from, so
       * the static handler falls back to `application/octet-stream`, Apple's
       * CDN discards it, and Universal Links fail with no error anywhere: the
       * link simply keeps opening in the browser. The sibling file
       * `assetlinks.json` needs none of this, because its extension answers the
       * question by itself.
       *
       * This also has to be a real header rather than a guess, because the
       * catch-all block below sends `X-Content-Type-Options: nosniff` on every
       * response, so nothing downstream is permitted to correct a wrong type.
       *
       * Both files are static under `public/` and `src/middleware.ts` lets
       * `/.well-known` through untouched, which is what the fetchers need:
       * Apple and Google both read these anonymously, over https, with no
       * redirect allowed.
       */
      {
        source: "/.well-known/apple-app-site-association",
        headers: [{ key: "Content-Type", value: "application/json" }],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self), interest-cohort=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
