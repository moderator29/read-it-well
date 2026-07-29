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
