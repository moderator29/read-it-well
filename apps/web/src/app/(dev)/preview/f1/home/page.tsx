import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { daypartFor, lagosHour, type HomeOverview } from "@/lib/app/home-queries";
import { HomeScreen } from "@/components/app/home/HomeScreen";
import type { HomeCity, InvestFeature, MarketCounts } from "@/components/app/home/markets";
import { PERSON } from "../../_fixtures/people";
import { LISTINGS } from "../listings";

/**
 * The in-app home as a signed-in person sees it, with the identity and the
 * listings from fixtures. The route itself needs a session, and the
 * catalogue cannot be read from this sandbox, so this renders the same
 * screen on the same shell width from fixture rows so the look can be
 * screenshotted here. Never the proof of the writes.
 */
export const dynamic = "force-dynamic";

export default async function PreviewHome() {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  const listings = LISTINGS;

  const overview: HomeOverview = {
    daypart: daypartFor(lagosHour()),
    firstName: PERSON.name.split(" ")[0] ?? "",
    avatarUrl: PERSON.avatarUrl,
    unreadNotifications: 2,
    signedIn: true,
    place: {
      stateCode: "LA",
      stateName: "Lagos",
      lgaCode: "la_eti_osa",
      lgaName: "Lekki",
      label: "Lekki",
      context: "Lagos",
      isOwn: true,
    },
    areas: [],
    trending: [],
    askIntent: false,
  };

  /*
   * The market numbers the route reads from the catalogue, as fixtures for the
   * same reason the listings are: this sandbox cannot reach the database, and
   * a screenshot of the tiles has to show the count line that ships. These are
   * the shapes of the live catalogue recorded in the ledger's baseline, and
   * nothing in this folder renders on a product route.
   */
  const counts: MarketCounts = {
    rent: 8,
    buy: 16,
    shortlet: 8,
    hotel: 2,
    villa: 3,
    apartment: 16,
    restaurant: 2,
    office: 3,
    land: 3,
  };

  const cities: HomeCity[] = [
    {
      name: "Lagos",
      href: "/search?q=Lagos",
      count: 48,
      src: "/brand/photos/skyline-bridge-dusk.jpg",
      position: "center",
    },
    {
      name: "Abuja",
      href: "/search?q=Abuja",
      count: 9,
      src: "/brand/photos/villa-exterior-sunset.jpg",
      position: "center",
    },
    {
      name: "Port Harcourt",
      href: "/search?q=Port%20Harcourt",
      count: 4,
      src: "/brand/photos/skyline-waterfront-dusk.jpg",
      position: "left center",
    },
    {
      name: "Ibadan",
      href: "/search?q=Ibadan",
      count: 3,
      src: "/brand/photos/tower-entrance-dusk.jpg",
      position: "center",
    },
  ];

  const invest: InvestFeature = {
    href: `/listing/${listings[0]!.id}`,
    title: listings[0]!.title,
    photo: "/brand/photos/villa-pool-terrace.jpg",
    verified: true,
  };

  return (
    <main id="main" className="min-h-dvh pb-4xl">
      <div className="nf-shell py-section-tight">
        <HomeScreen
          t={t}
          locale={locale}
          overview={overview}
          listings={listings}
          roles={[]}
          counts={counts}
          cities={cities}
          invest={invest}
        />
      </div>
    </main>
  );
}
