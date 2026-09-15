import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { prefersLessData } from "@/lib/save-data";
import { NONCE_HEADER } from "@/lib/security/csp";
import { ScrollToTop } from "@/components/site/ScrollToTop";
import { LivingCanvas } from "@/components/site/LivingCanvas";
import { TiltField } from "@/components/site/TiltField";
import { ServiceWorkerRegistrar } from "@/components/app/ServiceWorkerRegistrar";
import "./globals.css";

/*
 * The fonts are declared in `css/fonts.css` and served from `public/fonts`,
 * not through next/font. That file explains which subsets ship and why; this
 * one decides which of them the browser is told to fetch before it needs them.
 *
 * Inter is chosen for coverage, not fashion. It carries the naira sign
 * (U+20A6), the Yoruba and Igbo dotted vowels (ẹ ọ ṣ ị ụ), the Hausa hooked
 * letters (ɓ ɗ ƙ ƴ) and the combining tone marks that stack on top of those
 * vowels. Most display faces break on that last requirement.
 *
 * Preload is per locale, because the face a locale reads is per locale.
 * `tokens.css` swaps the display stack to Inter for Yoruba and Igbo, since
 * Poppins cannot draw their vowels, so on those two locales Poppins is never
 * painted at all and preloading it would be a download nobody uses. In its
 * place they get the vietnamese subset, which is the only one carrying
 * U+1EA0-1EF9, and on those locales it is needed by the first heading.
 *
 * Everything in these lists was measured, not assumed: a browser sweep of six
 * routes at 390px and at 1280px fetched Inter latin, Inter latin-ext and both
 * Poppins subsets on every single load.
 */
const PRELOADED_FONTS: Record<string, readonly string[]> = {
  yo: ["inter-latin", "inter-latin-ext", "inter-vietnamese"],
  ig: ["inter-latin", "inter-latin-ext", "inter-vietnamese"],
  default: [
    "inter-latin",
    "inter-latin-ext",
    "poppins-700-latin",
    "poppins-700-latin-ext",
    "poppins-600-latin",
    "poppins-600-latin-ext",
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Vallo. Find it. Rent it. Love it.",
    template: "%s | Vallo",
  },
  description:
    "Discover and book homes, hotels, restaurants and experiences across Nigeria. Verified listings, secure payments and an assistant that understands what you actually want.",
  applicationName: "Vallo",
  keywords: [
    "Nigeria",
    "shortlet",
    "apartments",
    "hotels",
    "restaurants",
    "experiences",
    "booking",
    "Lagos",
    "Abuja",
  ],
  openGraph: {
    title: "Vallo. Find it. Rent it. Love it.",
    description:
      "Your all-in-one platform for homes, hotels, restaurants, experiences and more, across Nigeria.",
    siteName: "Vallo",
    locale: "en_NG",
    type: "website",
  },
  robots: { index: true, follow: true },

  /*
   * Installable app metadata. Emitted by Next rather than hand written tags:
   * the manifest link points at the typed route in `app/manifest.ts`, and
   * `appleWebApp` produces apple-mobile-web-app-capable plus the status bar
   * style. `black-translucent` is the right pairing with the viewport's
   * `viewportFit: "cover"` already set below, so the navy canvas runs under
   * the status bar instead of leaving a pale strip above the brand.
   * Next renders `appleWebApp.capable` as the standards-track
   * `mobile-web-app-capable`, not the apple-prefixed name, so the Apple tag is
   * added through `other`. iOS Safari still reads the apple-prefixed tag to
   * decide whether an installed page opens standalone, and without it an iPhone
   * install would open in a browser chrome instead of as an app. Setting
   * `mobile-web-app-capable` here as well would emit it twice.
   */
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Vallo",
    statusBarStyle: "black-translucent",
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
  /*
   * The platform previously shipped no favicon at all: the smallest declared
   * icon was 192px, so every browser tab downscaled it 12:1 and rendered a
   * blurred smear at 16px. The set now starts at the sizes tabs actually
   * request and keeps the large ones for install surfaces.
   */
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48" },
      { url: "/pwa/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/pwa/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/pwa/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/pwa/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  /*
   * One theme-color per theme.
   *
   * This used to be a single navy for both, so a user on the light theme got a
   * near-black browser chrome above a #F4F5F7 canvas, a hard seam exactly
   * where the reference set expects the chrome to disappear into the page.
   * The dark value still matches `background_color` and `theme_color` in the
   * manifest, so install, splash and canvas remain one continuous colour.
   */
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#010118" },
    { media: "(prefers-color-scheme: light)", color: "#F4F5F7" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  /* Read before a byte is rendered, because that is the only point at which a
     background image can be prevented rather than merely hidden. */
  const lessData = await prefersLessData();

  /* This request's Content Security Policy nonce, minted in middleware.

     The two scripts below run before first paint and are the reason this is
     read at all: without the nonce they are exactly what the policy is designed
     to stop, an inline script in the document, and the theme would flash on
     every first load. Undefined when the middleware did not run, which is every
     path its matcher excludes; React omits the attribute entirely rather than
     writing `nonce="undefined"`, and no policy is being served on those paths
     either, so the two absences agree. */
  const nonce = (await headers()).get(NONCE_HEADER) ?? undefined;

  return (
    <html
      lang={locale}
      dir={t.meta.dir}
      data-save-data={lessData ? "on" : undefined}
      suppressHydrationWarning
    >
      <head>
        {/*
          The face arrives with the stylesheet rather than after it. `crossorigin`
          is not optional even though these are our own files: a font is always
          fetched in CORS mode, so a preload without it is a second, separate
          request and the first one is thrown away.
        */}
        {(PRELOADED_FONTS[locale] ?? PRELOADED_FONTS.default ?? []).map((name) => (
          <link
            key={name}
            rel="preload"
            as="font"
            type="font/woff2"
            href={`/fonts/${name}.woff2`}
            crossOrigin="anonymous"
          />
        ))}
      </head>
      <body>
        {/*
          Apply the stored theme before first paint, so a chosen light mode
          never flashes dark.

          DARK IS THE DEFAULT AND NOTHING OVERRIDES IT SILENTLY. This used to
          fall back to the operating system when nothing was stored, which meant
          almost every first-time visitor opened Vallo in light: phones ship
          set to light, so the brand's own theme was the one people saw least.
          Now only an explicit choice moves it. No key, or "dark", is dark.
          "light" is light. "system" follows the OS, and it is something someone
          has to go into Settings and ask for.
        */}
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('nf_theme');if(t==='light'||(t==='system'&&matchMedia('(prefers-color-scheme: light)').matches))document.documentElement.dataset.theme='light'}catch(e){}",
          }}
        />
        {/*
          The other half of the data-saver signal (inbox item 246).

          `Save-Data: on` is a header and only Chromium sends it, and only when
          the reader has switched data saver on. This covers the reader nobody
          asked: somebody on a 2g or slow-2g link, which on a lot of this
          market is simply what the connection is. Runs before first paint, in
          front of the ambient layer below it, so the 3.5MB of background
          artwork is never requested rather than requested and hidden.

          Only ever sets the flag. It cannot clear one the server set, because
          the header is the reader saying so outright and a connection reading
          does not overrule that.
        */}
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html:
              "try{var c=navigator.connection;if(c&&(c.saveData||/^(slow-)?2g$/.test(c.effectiveType||'')))document.documentElement.dataset.saveData='on'}catch(e){}",
          }}
        />
        {/* The living canvas, mounted once behind every page. */}
        <div className="nf-ambient" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
        <LivingCanvas />
        <TiltField />
        {/* Film grain over everything, so surfaces feel physical, not printed. */}
        <div className="nf-grain" aria-hidden="true" />
        <ScrollToTop />
        {/* Installs the offline shell after load, in production only. Renders nothing. */}
        <ServiceWorkerRegistrar />
        <a href="#main" className="nf-skip-link">
          {t.common.skipToContent}
        </a>
        {children}
      </body>
    </html>
  );
}
