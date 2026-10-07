import { getDictionary } from "@vallo/i18n";

import { ListingCard } from "@/app/admin/listings/ListingCard";
import { adminUi } from "@/app/admin/_components/ui";
import { getLocale } from "@/lib/locale";
import type { ListingReviewView } from "@/lib/admin/queries";

/**
 * THE REVIEWER'S CARD, WHICH COULD NOT BE PHOTOGRAPHED.
 *
 * `/admin/listings` gates on `requireAdmin`, and the existing admin preview
 * draws the queue FRAME from fixture rows rather than this card, so the
 * reviewer's console was the one surface on this track with no proof of what
 * it looks like. That is not a coincidence: a screen nobody can photograph is
 * a screen whose missing half goes unnoticed, and the missing half here was
 * every answer the lister gave about light and water.
 *
 * The fixture is deliberately awkward rather than tidy. It carries a Band A
 * claim with generator hours beside it, a plot size, a gate block that was
 * answered but is NOT quoted, a walkthrough that could not be signed, and a
 * sale cost model whose total is stated rather than summed, because those are
 * the five things this card learnt to show and every one of them has an
 * "unstated" twin that must not read as zero.
 *
 * Nothing here reaches a database and no decision can be taken: the fixture
 * status is PUBLISHED, which is the one status `ListingCard` draws without its
 * decision controls.
 */
export const dynamic = "force-dynamic";

const LISTING: ListingReviewView = {
  id: "00000000-0000-4000-8000-0000000000c1",
  reference: "VL-7K4MQP",
  title: "Two Bedroom Flat, Herbert Macaulay Way, Yaba",
  status: "PUBLISHED",
  propertyType: "apartment",
  intent: "sale",
  pricePeriod: "sale",
  priceMinor: 18_000_000_000,
  moveIn: null,
  purchase: {
    parts: [
      { key: "price", label: "Asking price", minor: 18_000_000_000 },
      { key: "agency", label: "Agency fee", minor: 900_000_000 },
      { key: "legal", label: "Legal fee", minor: 900_000_000 },
      { key: "consent", label: "Governor's consent", minor: 1_400_000_000 },
      { key: "stamp", label: "Stamp duty", minor: 144_000_000 },
      { key: "registration", label: "Survey and registration", minor: 90_000_000 },
    ],
    totalMinor: 21_500_000_000,
    totalStated: true,
  },
  tenure: "certificate_of_occupancy",
  saleStatus: "available",
  city: "Lagos",
  area: "Yaba",
  stateCode: "LA",
  address: "12 Herbert Macaulay Way",
  description:
    "A two bedroom flat on the second floor of a four storey block, newly built, with a fitted kitchen and a balcony over the street. The estate has a gate and a security desk. Water is treated mains with a borehole behind it, and the block sits on a Band A feeder with a generator for the hours it is not.",
  bedrooms: 2,
  bathrooms: 2,
  agentName: "Chidi Okeke",
  photos: [],
  /* A walkthrough that exists and could not be signed, because the card has to
     say so in words rather than draw a black box. */
  videos: [{ url: null, posterUrl: null, durationSeconds: 64 }],
  utilities: {
    powerGrid: "BAND_A",
    powerBackup: "GENERATOR",
    powerBackupHours: 18,
    waterSupply: "TREATED_MAINS",
    prepaidMeter: true,
  },
  facts: {
    sizeSqm: 96,
    toilets: 3,
    parkingSpaces: 1,
    floor: 2,
    totalFloors: 4,
    condition: "newly_built",
    yearBuilt: 2024,
    /* Unstated, so the row must read as unanswered and never as unfurnished. */
    furnished: null,
  },
  access: { estateName: "Sabo Court", answered: 3 },
  amenityCount: 7,
  submittedAt: "2026-09-18T09:12:00.000Z",
  reviewedAt: "2026-09-19T11:30:00.000Z",
  reviewNotes: "Photographs were re-taken after the first pass. Utilities check out.",
  createdAt: "2026-09-17T18:00:00.000Z",
  checks: [
    { label: "Four photos or more", pass: false, detail: "0 photos" },
    { label: "Cover photo set", pass: false, detail: "No cover" },
    { label: "Title in title case", pass: true, detail: "Reads as a title" },
    { label: "Area and city recorded", pass: true, detail: "Yaba, Lagos" },
    { label: "Price recorded in naira", pass: true, detail: "Asking price stated" },
    { label: "Title deed stated", pass: true, detail: "Certificate of occupancy" },
    { label: "Bedrooms and bathrooms recorded", pass: true, detail: "2 bed, 2 bath" },
    { label: "Amenities chosen", pass: true, detail: "7 chosen" },
    { label: "Description of 40 words or more", pass: true, detail: "58 words" },
    { label: "No contact or payment details in the text", pass: true, detail: "Clean" },
  ],
};

export default async function PreviewListingReview() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const ui = adminUi(t, locale);

  return (
    <div className="nf-console">
      <ul className="nf-queue-list">
        <ListingCard
          listing={LISTING}
          copy={t.admin.listings}
          common={t.admin.common}
          ui={ui}
          locale={locale}
          sqm={t.catalogue.card.sqm}
        />
      </ul>
    </div>
  );
}
