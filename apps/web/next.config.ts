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
  transpilePackages: ["@vallo/design-tokens", "@vallo/i18n"],

  // Three image sources, all explicitly allowed through the optimiser and
  // nothing else: the seed catalogue's Unsplash photography, the Supabase
  // storage CDN that serves agent-uploaded listing photos and avatars once
  // real supply lands, and Google's avatar CDN. The Supabase host is derived
  // from the project URL so it follows the environment rather than being
  // hardcoded, and the pattern is omitted entirely when the URL is absent,
  // which keeps the allowlist tight in a build without keys.
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      /*
       * The photo a Google account already has.
       *
       * Somebody who signs up with Google has a face on file, and until this
       * was here it was discarded and they were drawn as a grey disc with a
       * letter in it. `next/image` THROWS on a host it was not told about, so
       * an avatar reaching an optimised image on an unlisted host is a 500 on
       * whatever screen drew it rather than a missing picture.
       *
       * Every avatar in the product is a plain img tag today, so nothing
       * currently needs this. It is here because Google hands the same photo
       * out from lh3 through lh6 and picks the shard itself, and a future
       * `<Image>` on any of them must not be able to take a screen down. The
       * path is pinned to the avatar prefix, which is the only thing on this
       * host we would ever render.
       */
      {
        protocol: "https",
        hostname: "**.googleusercontent.com",
        pathname: "/a/**",
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

  /**
   * BECOME AN AGENT IS NOT A DESTINATION ANY MORE.
   *
   * There used to be a `/agents` pitch page, an `/agents/apply` wizard and an
   * `/agents/status` screen: a separate marketing funnel, in the public site
   * chrome, for something that is not a separate product. It is one account
   * with three profiles on it. You switch to the Seller or the Realtor profile
   * from the switch-profile sheet, and if that profile is not set up the sheet
   * explains what it is and starts the setup. So the three routes are gone and
   * these three redirects put anything still pointing at them where the thing
   * actually lives now.
   *
   * WHY REDIRECTS RATHER THAN JUST DELETING THEM. Three groups of links are
   * outside this change's reach: the marketing pages under `(site)`, which
   * another owner holds; the help centre and the docs chapters, which quote
   * the address in prose; and anything a person has already shared. A 404 on
   * "become an agent" is the worst possible answer for somebody who wants to
   * list a property, and it is the one visitor the business most wants.
   *
   * `/agents` lands on the profile with `?switch=owner`, which opens the
   * switch-profile sheet on the Seller explanation. That is the replacement,
   * exactly: the pitch is now the thing that starts the setup.
   *
   * All three are 307, not 308. A permanent redirect is cached by the browser
   * forever and these addresses may yet be wanted for something else.
   */
  async redirects() {
    return [
      { source: "/agents", destination: "/profile?switch=owner", permanent: false },
      { source: "/agents/apply", destination: "/profile/setup/owner", permanent: false },
      { source: "/agents/status", destination: "/profile/application", permanent: false },
    ];
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
