import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { daypartFor, lagosHour, type HomeOverview } from "@/lib/app/home-queries";
import type { Listing } from "@/lib/listings/types";
import { HomeScreen } from "@/components/app/home/HomeScreen";
import {
  BestMatchesAsk,
  BestMatchesNone,
  BestMatchesRow,
  HomeListSkeleton,
  NewListings,
  bestMatchRows,
} from "@/components/app/home/HomeLists";
import { newestFirst } from "@/components/app/home/new-listings";
import { pickBestMatches } from "@/components/app/home/best-matches";
import { PERSON } from "../_fixtures/people";
import { ChromePreview } from "../f1/ChromePreview";

/**
 * Home with its four sections, under the real shell (header and dock), from
 * fixtures: the catalogue cannot be read from this sandbox, so every listing
 * here is a fixture and the harness never proves a read. Never rendered on a
 * product route.
 *
 *   ?signed=0     a signed-out visitor: Premium, Featured and New listings
 *   ?state=empty  the empty states (nothing said or kept; nothing new)
 *   ?state=none   signals exist but nothing in the catalogue fits them
 *   ?state=wait   each streamed list as its loading skeleton
 *   ?drawer / ?route  the shell's own preview switches stay in `ChromePreview`
 */
export const dynamic = "force-dynamic";

const PHOTOS = [
  "/brand/photos/bathroom-01.jpg",
  "/brand/photos/living-room-dusk.jpg",
  "/brand/photos/villa-exterior-gate.jpg",
  "/brand/photos/villa-pool-skyline-01.jpg",
  "/brand/photos/bedroom-01.jpg",
  "/brand/photos/tower-entrance-dusk.jpg",
  "/brand/photos/living-room-day.jpg",
  "/brand/photos/villa-exterior-sunset.jpg",
  "/brand/photos/bedroom-02.jpg",
  "/brand/photos/villa-pool-terrace.jpg",
  "/brand/photos/skyline-waterfront-dusk.jpg",
  "/brand/photos/terrace-lounge-night.jpg",
];

const ROWS: Pick<Listing, "title" | "kind" | "area" | "city" | "state" | "bedrooms" | "bathrooms" | "sizeSqm" | "priceMinor" | "moveInCostMinor" | "moveInCostStated" | "intent" | "pricePeriod" | "publishedAt">[] = [
  { title: "Two bedroom flat in Bodija", kind: "rental", area: "Bodija", city: "Ibadan", state: "Oyo", bedrooms: 2, bathrooms: 2, sizeSqm: 96, priceMinor: 90_000_000, moveInCostMinor: 130_000_000, moveInCostStated: true, intent: "rent", pricePeriod: "year", publishedAt: "2026-10-12T08:00:00Z" },
  { title: "Luxury 4 bedroom with BQ", kind: "home", area: "Lekki Phase 1", city: "Lagos", state: "Lagos", bedrooms: 4, bathrooms: 5, sizeSqm: 320, priceMinor: 1_200_000_000, moveInCostMinor: 1_480_000_000, moveInCostStated: false, intent: "rent", pricePeriod: "year", publishedAt: "2026-10-11T09:00:00Z" },
  { title: "Three bedroom duplex, Ikoyi", kind: "apartment", area: "Ikoyi", city: "Lagos", state: "Lagos", bedrooms: 3, bathrooms: 3, sizeSqm: 210, priceMinor: 950_000_000, moveInCostMinor: 1_150_000_000, moveInCostStated: true, intent: "rent", pricePeriod: "year", publishedAt: "2026-10-10T09:00:00Z" },
  { title: "Terraced house for sale in Maitama", kind: "home", area: "Maitama", city: "Abuja", state: "FCT", bedrooms: 4, bathrooms: 4, sizeSqm: 280, priceMinor: 420_000_000_00, intent: "sale", publishedAt: "2026-10-09T09:00:00Z" },
  { title: "Self-contained flat, Yaba", kind: "rental", area: "Yaba", city: "Lagos", state: "Lagos", bedrooms: 1, bathrooms: 1, sizeSqm: 38, priceMinor: 70_000_000, moveInCostMinor: 98_000_000, moveInCostStated: true, intent: "rent", pricePeriod: "year", publishedAt: "2026-10-08T09:00:00Z" },
  { title: "Three bedroom flat, Gwarinpa", kind: "apartment", area: "Gwarinpa", city: "Abuja", state: "FCT", bedrooms: 3, bathrooms: 3, sizeSqm: 140, priceMinor: 450_000_000, moveInCostMinor: 590_000_000, moveInCostStated: true, intent: "rent", pricePeriod: "year", publishedAt: "2026-10-07T09:00:00Z" },
  { title: "Two bedroom flat, Osapa London", kind: "apartment", area: "Osapa London", city: "Lagos", state: "Lagos", bedrooms: 2, bathrooms: 2, sizeSqm: 130, priceMinor: 185_000_000, moveInCostMinor: 240_000_000, moveInCostStated: true, intent: "rent", pricePeriod: "year", publishedAt: "2026-10-06T09:00:00Z" },
  { title: "Five bedroom villa for sale, Banana Island", kind: "villa", area: "Banana Island", city: "Lagos", state: "Lagos", bedrooms: 5, bathrooms: 6, sizeSqm: 620, priceMinor: 2_400_000_000_00, intent: "sale", publishedAt: "2026-10-05T09:00:00Z" },
  { title: "Mini flat, Wuse 2", kind: "rental", area: "Wuse 2", city: "Abuja", state: "FCT", bedrooms: 1, bathrooms: 1, priceMinor: 120_000_000, moveInCostMinor: 165_000_000, moveInCostStated: true, intent: "rent", pricePeriod: "year", publishedAt: "2026-10-04T09:00:00Z" },
  { title: "Four bedroom home, Magodo", kind: "home", area: "Magodo", city: "Lagos", state: "Lagos", bedrooms: 4, bathrooms: 4, sizeSqm: 300, priceMinor: 680_000_000, moveInCostMinor: 820_000_000, moveInCostStated: true, intent: "rent", pricePeriod: "year", publishedAt: "2026-10-03T09:00:00Z" },
  { title: "Two bedroom flat, Jabi", kind: "apartment", area: "Jabi", city: "Abuja", state: "FCT", bedrooms: 2, bathrooms: 2, sizeSqm: 110, priceMinor: 350_000_000, moveInCostMinor: 460_000_000, moveInCostStated: true, intent: "rent", pricePeriod: "year", publishedAt: "2026-10-02T09:00:00Z" },
  { title: "Office suite, Victoria Island", kind: "office", area: "Victoria Island", city: "Lagos", state: "Lagos", bedrooms: 0, bathrooms: 2, sizeSqm: 85, priceMinor: 900_000_000, intent: "rent", pricePeriod: "year", publishedAt: "2026-10-01T09:00:00Z" },
];

const FIXTURES: Listing[] = ROWS.map((row, i) => ({
  id: `00000000-0000-4000-8000-0000000b${String(i).padStart(4, "0")}`,
  slug: `fixture-${i}`,
  currency: "NGN",
  rating: 0,
  reviewCount: 0,
  verified: true,
  isDemo: false,
  instantBook: false,
  amenities: [],
  photos: [PHOTOS[i % PHOTOS.length]!],
  hue: i % 6,
  ...row,
}));

export default async function PreviewHomeDock({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const signed = query.signed !== "0";
  const state = typeof query.state === "string" ? query.state : "full";
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);

  const overview: HomeOverview = {
    daypart: daypartFor(lagosHour()),
    firstName: signed ? (PERSON.name.split(" ")[0] ?? "") : "",
    avatarUrl: PERSON.avatarUrl,
    unreadNotifications: 2,
    signedIn: signed,
    place: { stateCode: "LA", stateName: "Lagos", lgaCode: "la_eti_osa", lgaName: "Lekki", label: "Lekki", context: "Lagos", isOwn: signed },
    areas: [],
    trending: [],
    askIntent: false,
  };

  const premium = FIXTURES.slice(0, 6);
  const featured = state === "empty" ? [] : FIXTURES.slice(6, 12);
  const saved = [FIXTURES[2]!];
  const matches = pickBestMatches({
    pool: FIXTURES,
    interests: ["rental", "apartment"],
    searches: [{ label: "3 bed flats in Jabi", listings: [FIXTURES[10]!] }],
    saved,
    onScreen: new Set([...premium, ...featured].map((l) => l.id)),
  });

  const wait = state === "wait";
  const bestMatches = !signed ? null : wait ? (
    <HomeListSkeleton shape="tiles" title={t.homeV2.bestTitle} label={t.homeV2.loadingBest} />
  ) : (
    <BestMatchesRow
      rows={state === "empty" || state === "none" ? [] : bestMatchRows(matches, t, locale)}
      t={t}
      locale={locale}
      empty={state === "none" ? <BestMatchesNone t={t} /> : <BestMatchesAsk t={t} />}
    />
  );
  const newListings = wait ? (
    <HomeListSkeleton shape="rows" title={t.homeV2.newTitle} label={t.homeV2.loadingNew} />
  ) : (
    <NewListings listings={state === "empty" ? [] : newestFirst(FIXTURES, 6)} t={t} locale={locale} />
  );

  return (
    <ChromePreview t={t} route="/home" signedIn={signed}>
      <HomeScreen
        t={t}
        locale={locale}
        overview={overview}
        listings={premium}
        roles={[]}
        manageHref="/profile/setup"
        interests={signed ? ["rental", "apartment"] : []}
        intentApplied={signed}
        featuredMore={featured}
        bestMatches={bestMatches}
        newListings={newListings}
      />
    </ChromePreview>
  );
}
