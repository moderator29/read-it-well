import type { Metadata, Viewport } from "next";
import { Inter, Poppins } from "next/font/google";
import { getDictionary } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
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
    default: "NaijaFinds. Find it. Book it. Live it.",
    template: "%s | NaijaFinds",
  },
  description:
    "Discover and book homes, hotels, restaurants and experiences across Nigeria. Verified listings, secure payments and an assistant that understands what you actually want.",
  applicationName: "NaijaFinds",
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
    title: "NaijaFinds. Find it. Book it. Live it.",
    description:
      "Your all-in-one platform for homes, hotels, restaurants, experiences and more, across Nigeria.",
    siteName: "NaijaFinds",
    locale: "en_NG",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#06040E",
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
        {/* Apply the stored theme before first paint, so light mode never flashes dark. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('nf_theme');if(t==='light'||(!t&&matchMedia('(prefers-color-scheme: light)').matches))document.documentElement.dataset.theme='light'}catch(e){}",
          }}
        />
        {/* The living canvas, mounted once behind every page. */}
        <div className="nf-ambient" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        {/* Film grain over everything, so surfaces feel physical, not printed. */}
        <div className="nf-grain" aria-hidden="true" />
        <a href="#main" className="nf-skip-link">
          {t.common.skipToContent}
        </a>
        {children}
      </body>
    </html>
  );
}
