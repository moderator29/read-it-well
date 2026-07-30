import type { MetadataRoute } from "next";

/**
 * Web app manifest, served by Next at `/manifest.webmanifest`.
 *
 * A typed route rather than a static file so the brand colours, the start URL
 * and the shortcut list stay in the same language as the rest of the app and
 * cannot drift out of sync with the routes they point at.
 *
 * The audience is Nigerian and often on a mid-range Android over a metered
 * data bundle, so an installed home-screen app with an offline shell is real
 * reach, not decoration. Everything referenced here exists on disk under
 * `public/pwa`: the icons are generated from the canonical brand cutout
 * (`/brand/rentme-logo.png`) cropped to the house-and-R mark, centred on the
 * brand navy, and kept deliberately small.
 *
 * Colours are the brand anchors: base navy `#010118`, electric blue `#0C39EF`.
 * Dark is the default theme, so the splash background is navy, never white.
 */

const NAVY = "#010118";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "RentMe",
    short_name: "RentMe",
    description:
      "Find, book and manage homes, hotels, shortlets and experiences across Nigeria. Verified listings, a naira wallet, and an assistant that understands what you actually want.",
    lang: "en-NG",
    dir: "ltr",
    start_url: "/home",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: NAVY,
    theme_color: NAVY,
    categories: ["travel", "lifestyle", "shopping"],
    icons: [
      {
        src: "/pwa/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        // Held inside the 80 per cent safe zone so an aggressive circular or
        // squircle launcher mask cannot clip the roof off the mark.
        src: "/pwa/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Search stays",
        short_name: "Search",
        description: "Find homes, hotels and shortlets across Nigeria",
        url: "/search",
        icons: [{ src: "/pwa/shortcut-search.png", sizes: "96x96", type: "image/png" }],
      },
      {
        name: "My bookings",
        short_name: "Bookings",
        description: "Check your trips and booking references",
        url: "/bookings",
        icons: [{ src: "/pwa/shortcut-bookings.png", sizes: "96x96", type: "image/png" }],
      },
      {
        name: "Wallet",
        short_name: "Wallet",
        description: "Your naira balance and transactions",
        url: "/wallet",
        icons: [{ src: "/pwa/shortcut-wallet.png", sizes: "96x96", type: "image/png" }],
      },
    ],
  };
}
