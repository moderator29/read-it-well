/**
 * THE REVIEWER'S ADMISSION CHECKLIST, MEASURED THE WAY THE LISTER WAS.
 *
 * Moved out of `lib/admin/queries.ts` (server-only) so it can be tested, and
 * re-based on the lister's own submit gate (`submitRequirements` in
 * `lib/agent/listings-model.ts`) wherever the two judge the same thing, so a
 * reviewer never sees a red line against something the lister was told passed:
 *
 *   - LAND has no bathroom. The gate exempts a plot and this line did not, so
 *     every land listing reached the desk with a failing "bedrooms and
 *     bathrooms" line it could never have passed.
 *   - THE TITLE is held to the gate's 8 to 80 characters. The line was "title
 *     in title case", a rule nobody tells the lister (the wizard's own example,
 *     "Bright 2 bedroom flat in Lekki Phase 1", fails it), so it marked most
 *     honest submissions as needing a look.
 *   - WORDS are counted by the gate's `countWords`, and the place needs a
 *     state as the gate does, with the same two-character floors.
 *
 * The contact scan stays: it is the reviewer's own check (HYBRID_INVENTORY
 * section 5), never shown to the lister as a requirement. Nothing here blocks a
 * decision; it informs one.
 */

import {
  MAX_TITLE_LENGTH,
  MIN_DESCRIPTION_WORDS,
  MIN_MEDIA,
  MIN_TITLE_LENGTH,
  STATE_CODE_SET,
  collapseSpaces,
  countWords,
} from "@/lib/agent/listings-model";
import { PERIOD_SUFFIX, headlinePeriod, headlinePrice, type PriceColumns } from "@/lib/listings/pricing";

export type QualityCheck = { label: string; pass: boolean; detail: string };

/** The columns the checklist reads, a subset of the console's listing row. */
export type ChecklistRow = PriceColumns & {
  title: string;
  description: string | null;
  property_type: string;
  tenure: string | null;
  area: string | null;
  city: string | null;
  state_code: string | null;
  bedrooms: number;
  bathrooms: number;
  listing_photos: readonly { position: number }[];
  /** Walkthroughs count toward the media minimum with the photos. */
  listing_videos?: readonly unknown[];
  listing_amenities: readonly unknown[];
};

/** The English label of each line, which `CHECK_KEYS` matches to its translation. */
export const CHECK_LABEL = {
  photoCount: "Three photos or videos",
  cover: "Cover photo set",
  titleLength: `Title of ${MIN_TITLE_LENGTH} to ${MAX_TITLE_LENGTH} characters`,
  place: "Area and city recorded",
  price: "Price recorded in naira",
  salePrice: "Asking price recorded",
  deed: "Title deed stated",
  rooms: "Bedrooms and bathrooms recorded",
  amenities: "Amenities chosen",
  description: `Description of ${MIN_DESCRIPTION_WORDS} words or more`,
  clean: "No contact or payment details in the text",
} as const;

const CONTACT_PATTERN = /\d{10}|(?:payment|transfer|pay me|account number|acct|bank)/i;

export function qualityChecks(row: ChecklistRow): QualityCheck[] {
  const photoCount = row.listing_photos.length;
  const videoCount = row.listing_videos?.length ?? 0;
  const hasCover = row.listing_photos.some((photo) => photo.position === 0);
  const words = countWords(row.description);
  const text = `${row.title} ${row.description ?? ""}`;
  const title = collapseSpaces(row.title);
  const land = row.property_type === "land";
  const placeKnown =
    collapseSpaces(row.area ?? "").length >= 2 &&
    collapseSpaces(row.city ?? "").length >= 2 &&
    STATE_CODE_SET.has((row.state_code ?? "").trim().toUpperCase());
  const headline = headlinePrice(row);

  return [
    {
      label: CHECK_LABEL.photoCount,
      pass: photoCount + videoCount >= MIN_MEDIA,
      detail:
        videoCount > 0
          ? `${countWord(photoCount, "photo")} and ${countWord(videoCount, "video")}`
          : countWord(photoCount, "photo"),
    },
    {
      label: CHECK_LABEL.cover,
      pass: photoCount > 0 && hasCover,
      detail: hasCover ? "A photo is first, as the cover" : "No photo in the cover position",
    },
    {
      label: CHECK_LABEL.titleLength,
      pass: title.length >= MIN_TITLE_LENGTH && title.length <= MAX_TITLE_LENGTH,
      detail: row.title,
    },
    {
      label: CHECK_LABEL.place,
      pass: placeKnown,
      detail: [row.area, row.city, row.state_code].filter(Boolean).join(", ") || "Not given",
    },
    {
      /* Three markets, one line. A sale passes on an asking price, a tenancy on
         a rent, a shortlet on a nightly rate, and the detail says which of the
         three the reviewer is looking at so they can tell a 4.5m yearly rent
         from a 4.5m asking price at a glance. */
      label: row.listing_intent === "sale" ? CHECK_LABEL.salePrice : CHECK_LABEL.price,
      pass: headline.minor > 0,
      detail: PERIOD_SUFFIX[headlinePeriod(headline)],
    },
    {
      label: CHECK_LABEL.deed,
      pass: row.listing_intent !== "sale" || row.tenure !== null,
      detail: row.listing_intent !== "sale" ? "Not asked of a listing to let" : (row.tenure ?? "Not stated"),
    },
    {
      label: CHECK_LABEL.rooms,
      pass: land || row.bathrooms > 0,
      detail: land
        ? `${row.bedrooms} bedrooms; a plot is not asked for a bathroom`
        : `${row.bedrooms} bedrooms, ${row.bathrooms} bathrooms`,
    },
    {
      label: CHECK_LABEL.amenities,
      pass: row.listing_amenities.length > 0,
      detail: `${row.listing_amenities.length} selected`,
    },
    {
      label: CHECK_LABEL.description,
      pass: words >= MIN_DESCRIPTION_WORDS,
      detail: `${words} words`,
    },
    {
      label: CHECK_LABEL.clean,
      pass: !CONTACT_PATTERN.test(text),
      detail: CONTACT_PATTERN.test(text)
        ? "The trust scanner matched something in the title or description"
        : "Clean",
    },
  ];
}

/** "1 photo", "3 photos". */
function countWord(count: number, word: string): string {
  return `${count} ${count === 1 ? word : `${word}s`}`;
}
