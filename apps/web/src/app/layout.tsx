import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { prefersLessData } from "@/lib/save-data";
import { NONCE_HEADER } from "@/lib/security/csp";
import { ScrollToTop } from "@/components/site/ScrollToTop";
import { LivingCanvas } from "@/components/site/LivingCanvas";
import { ServiceWorkerRegistrar } from "@/components/app/ServiceWorkerRegistrar";
import "./globals.css";
import { siteUrl } from "@/lib/site";
import { CHROME_COLOUR } from "@/lib/theme/chrome";

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
  /*
   * THE FALLBACK WAS `http://localhost:3000`, WRITTEN OUT HERE.
   *
   * metadataBase is what every relative URL in this file resolves against: the
   * Open Graph image, the Twitter card, the canonical. A deployment that
   * forgets one environment variable therefore does not fail, it publishes
   * share cards pointing at localhost, and in a WhatsApp-first market the
   * share card is the first thing most people meet. Nothing breaks loudly, the
   * unfurl is simply blank for everybody.
   *
   * `siteUrl()` in `lib/site.ts` already resolves this properly and this file
   * was not using it: explicit variable first, then Vercel's production domain,
   * then the preview domain, and only then a local port. That is the same
   * ladder `lib/site.ts` wrote for auth redirects after a real sign-up landed a
   * phone on localhost, which is the same fault one layer down.
   */
  metadataBase: new URL(siteUrl()),
  /*
   * THE TITLE IS THE POSITION, NOT THE OLD SLOGAN.
   *
   * It read "Vallo. Real Estate reimagined!" in all three slots below. That
   * line is the old positioning and it told a first time visitor nothing
   * about what Vallo helps them do, which is the founder's own objection of
   * 22 September. It is also the one title a person meets before they have
   * seen a single screen: the browser tab, the search result and every link
   * anybody pastes into a chat. So it says the same thing the landing
   * headline says, and the two move together.
   *
   * The description says what the product IS rather than listing categories.
   * An earlier line described "homes, hotels, restaurants and experiences",
   * which was the travel app this stopped being, and promised "verified
   * listings" while the catalogue holds zero. The line that replaced it swung
   * the other way and described property only, on a product that had grown a
   * second side. It now names both, and names nothing that has no shipped
   * surface. The word verified is deliberately NOT here: it is sanctioned in
   * the founder's approved headline and nowhere else, because on this
   * catalogue it is a claim rather than a description.
   */
  title: {
    default: "Vallo. Rent, buy or stay, without the runaround.",
    template: "%s | Vallo",
  },
  description:
    "Homes, land, hotels and shortlets across Nigeria. See what you will actually pay before you call anybody, know who is behind every listing, and keep the record. Vallo Stays carries hotels, apartments, guest houses, resorts and restaurant tables on the same account and the same naira wallet.",
  applicationName: "Vallo",
  /*
   * BOTH SIDES, because the list carried nine property words and not one
   * word for the half of the product that sells nights (content truth sweep,
   * 19 September). Every term below is a market this platform actually
   * serves; nothing is here for the volume.
   */
  keywords: [
    "Nigeria",
    "rent",
    "property",
    "real estate",
    "apartments",
    "shortlet",
    "land",
    "hotels",
    "guest houses",
    "serviced apartments",
    "restaurants",
    "Vallo Stays",
    "Lagos",
    "Abuja",
    "Port Harcourt",
  ],
  /*
   * The card image is NOT declared here on purpose. `opengraph-image.png` sits
   * beside this file and Next emits og:image and twitter:image for it
   * automatically, at the right URL, with dimensions. Declaring `images` here
   * as well would be a second copy of the same fact that drifts the first time
   * the file changes. `scripts/build-og-image.mjs` is the generator.
   */
  openGraph: {
    title: "Vallo. Rent, buy or stay, without the runaround.",
    description:
      "Homes, land, hotels and shortlets across Nigeria, with the cost of moving in written down before you call anybody. Hotels, apartments and restaurant tables on Vallo Stays. One account, one naira wallet.",
    siteName: "Vallo",
    locale: "en_NG",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vallo. Rent, buy or stay, without the runaround.",
    description:
      "Homes, land, hotels and shortlets across Nigeria, with the cost of moving in written down before you call anybody. Hotels, apartments and restaurant tables on Vallo Stays. One account, one naira wallet.",
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
   * ONE DECLARED VALUE, NOT A PAIR KEYED ON `prefers-color-scheme`.
   *
   * The pair was right while the theme followed the operating system and became
   * wrong the day the default stopped following it. A `media` query answers the
   * OS. This product's theme answers STORAGE. They disagreed for exactly the
   * visitor the dark default was written for: a phone set to light, opening
   * Vallo for the first time, got the dark canvas under a #F4F5F7 browser
   * chrome, which is the hard seam the pair was added to remove, reintroduced
   * by the half of the system that could not be told about the change.
   * Measured across all six combinations of stored choice and OS preference
   * rather than reasoned about; three of the six were mismatched.
   *
   * So dark is declared, because dark is what somebody who has not chosen will
   * see, and the light value is written by the two places that know: the
   * before-paint script below, and `applyThemeColour` in the settings store
   * when somebody moves the setting.
   *
   * IT READS `CHROME_COLOUR.dark` RATHER THAN RESTATING IT. This was the third
   * of four places the same hex was written out by hand, beside the manifest,
   * the before-paint script below and the Capacitor `StatusBar` block. All four
   * are serialised where no CSS has run, so none of them can hold a token, and
   * four literals with no stylesheet between them drift with nothing to report
   * it. `lib/theme/chrome.ts` is the one home, and it carries the measurement
   * showing why this value is not `--nf-surface-canvas`.
   */
  themeColor: CHROME_COLOUR.dark,
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
        {/*
          `suppressHydrationWarning` on all three before-paint scripts, and it
          is the sanctioned suppression rather than a silenced bug.

          React deliberately does not serialise `nonce` to the client: the
          server renders `nonce="uXXrY..."` and the client tree carries
          `nonce=""`, so the two can never agree and every route logged a
          hydration mismatch on these three elements. R1 caught it in the dev
          log and then found it staring out of a shipped proof, as the "2
          Issues" badge in `docs/design/proofs/f5/inbox-390-dark.png`.

          The cost of leaving it was not the warning, it was that a permanent
          false positive hides the real hydration bugs behind it. The
          `suppressHydrationWarning` already on <html> does not reach
          descendants, so each script needs its own.
        */}
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html:
              `try{var t=localStorage.getItem('nf_theme');if(t==='light'||(t==='system'&&matchMedia('(prefers-color-scheme: light)').matches)){document.documentElement.dataset.theme='light';var m=document.querySelector('meta[name=theme-color]');if(m)m.setAttribute('content','${CHROME_COLOUR.light}')}}catch(e){}`,
          }}
        />
        {/*
          THE SIDE, BEFORE PAINT, the same way as the theme.

          Vallo has two sides, Property and Stays, and the shell's accent, its
          navigation and its dock all key off which one is active. The side is
          the `nf_side` cookie, which the server layout already reads, but
          chrome-coloured surfaces are painted from CSS custom properties
          scoped on `[data-side]`, and the attribute has to be on <html>
          before the first frame or the Stays accent flashes Property blue on
          every load. Only the attribute is set here; `sideOfPath` in the
          shell still wins over the cookie for a side-owned URL, and the
          reconciler writes the cookie back the moment the shell mounts.
        */}
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html:
              "try{var s=document.cookie.match(/(?:^|; )nf_side=([^;]*)/);var v=s&&s[1];var p=location.pathname;if(/^\\/(stays|stay|restaurants|restaurant|trips|host)(\\/|$)/.test(p))v='stays';else if(/^\\/(home|search|agent|listing|rent|inspections|bookings)(\\/|$)/.test(p))v='property';if(v==='stays')document.documentElement.dataset.side='stays'}catch(e){}",
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
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html:
              "try{var c=navigator.connection;if(c&&(c.saveData||/^(slow-)?2g$/.test(c.effectiveType||'')))document.documentElement.dataset.saveData='on'}catch(e){}",
          }}
        />
        {/*
          WITHOUT JAVASCRIPT, EVERYTHING BELOW THE FOLD WAS INVISIBLE.

          Reveal renders data-shown="false" on the server and an
          IntersectionObserver flips it, so a reader with no JavaScript, or a
          crawler that does not run it, got a page that faded out one viewport
          down and never came back. The fix costs nothing where JavaScript
          runs: this style exists only inside noscript, so the entrance
          choreography is untouched for everyone who can see it.
        */}
        <noscript>
          <style>{`.nf-reveal { opacity: 1 !important; transform: none !important; }`}</style>
        </noscript>
        {/* The living canvas, mounted once behind every page. */}
        <div className="nf-ambient" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
        <LivingCanvas />
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
