import type { Metadata, Viewport } from "next";
import { Inter, Poppins } from "next/font/google";
import { getDictionary } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { ScrollToTop } from "@/components/site/ScrollToTop";
import { LivingCanvas } from "@/components/site/LivingCanvas";
import { TiltField } from "@/components/site/TiltField";
import { ServiceWorkerRegistrar } from "@/components/app/ServiceWorkerRegistrar";
import "./globals.css";

/*
 * Inter is chosen for coverage, not fashion. It carries the naira sign (U+20A6),
 * the Yoruba and Igbo dotted vowels (ẹ ọ ṣ ị ụ), the Hausa hooked letters
 * (ɓ ɗ ƙ ƴ) and the combining tone marks that stack on top of those vowels.
 * Most display faces break on that last requirement.
 */
const inter = Inter({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--nf-font-inter",
});

/*
 * Display face, per the design system sheet. Poppins does not carry the Yoruba
 * and Igbo dotted vowels, so `tokens.css` swaps the display stack to Inter for
 * those two locales rather than letting a heading render half in each face.
 */
const poppins = Poppins({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
  variable: "--nf-font-poppins",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "RentMe. Find it. Rent it. Love it.",
    template: "%s | RentMe",
  },
  description:
    "Discover and book homes, hotels, restaurants and experiences across Nigeria. Verified listings, secure payments and an assistant that understands what you actually want.",
  applicationName: "RentMe",
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
    title: "RentMe. Find it. Rent it. Love it.",
    description:
      "Your all-in-one platform for homes, hotels, restaurants, experiences and more, across Nigeria.",
    siteName: "RentMe",
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
    title: "RentMe",
    statusBarStyle: "black-translucent",
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
  icons: {
    icon: [
      { url: "/pwa/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/pwa/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/pwa/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  // The brand base navy, matching `background_color` and `theme_color` in the
  // manifest so the Android status bar, the splash screen and the app canvas
  // are one continuous colour instead of three near-misses.
  themeColor: "#010118",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const t = getDictionary(locale);

  return (
    <html
      lang={locale}
      dir={t.meta.dir}
      className={`${inter.variable} ${poppins.variable}`}
      suppressHydrationWarning
    >
      <body>
        {/*
          Apply the stored theme before first paint, so a chosen light mode
          never flashes dark.

          DARK IS THE DEFAULT AND NOTHING OVERRIDES IT SILENTLY. This used to
          fall back to the operating system when nothing was stored, which meant
          almost every first-time visitor opened RentMe in light: phones ship
          set to light, so the brand's own theme was the one people saw least.
          Now only an explicit choice moves it. No key, or "dark", is dark.
          "light" is light. "system" follows the OS, and it is something someone
          has to go into Settings and ask for.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('nf_theme');if(t==='light'||(t==='system'&&matchMedia('(prefers-color-scheme: light)').matches))document.documentElement.dataset.theme='light'}catch(e){}",
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
