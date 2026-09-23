import { getDictionary, formatNumber, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { RESTAURANT_PLATES } from "@/components/app/stays/restaurant-plates";
import { RestaurantFace } from "@/app/(app)/restaurant/[id]/RestaurantFace";

/**
 * `/restaurant/[id]` on fixture props: the route's own `RestaurantFace`, so
 * this proof is the route and cannot drift from it. It used to re-export the
 * F3 harness, which writes its own lead card on the pre-sweep 22px glass (the
 * second audit's S-B). The venue is the F3 fixture restaurant: a catalogue
 * listing with a stated price per head, real-looking reviews, service windows
 * and a host row, so every part of the face is drawn. Fixture-backed: the
 * proof of the look, never of the wiring.
 */
export default async function SweepStaysRestaurant() {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  const copy = t.restaurantPage;
  const id = "00000000-0000-4000-8000-00000000f351";
  const messageHref = `/messages/new?listing=${id}`;

  return (
    <RestaurantFace
      locale={locale}
      t={t}
      gallery={{
        listingId: id,
        title: "The Lagoon Kitchen",
        hue: 0,
        kind: "restaurant",
        photos: [],
        plates: RESTAURANT_PLATES as string[],
        backFallback: "/preview/session-b/sweep-stays/restaurants",
        /* Verified, as the route draws a verified listing. With no photographs
           the gallery's Verified chip overlaps "No photographs yet" at 390:
           a ListingGallery defect recorded in ledger 13.A2.5, left visible. */
        mark: { label: t.stays.restaurantsTitle, icon: "utensils", verified: true, verifiedLabel: t.common.verified },
      }}
      title="The Lagoon Kitchen"
      where="Ikoyi, Lagos"
      hours={{ openNow: true, label: "Open until 23:00" }}
      specPairs={[
        { key: "cuisine", icon: "utensils", label: "Nigerian" },
        { key: "dress", icon: "user", label: "Smart casual" },
        { key: "covers", icon: "grid", label: copy.covers.replace("{count}", "80") },
      ]}
      price={{ minor: 25_000_00, currency: "NGN" }}
      rating={{
        average: formatNumber(4.7, locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
        reviews: t.catalogue.stays.reviews.replace("{count}", formatNumber(64, locale)),
      }}
      capsules={[
        { key: "parking", icon: "parking", label: copy.parking },
        { key: "power", icon: "bolt", label: copy.backupPower },
        { key: "outdoor", icon: "map", label: copy.outdoor },
        { key: "grill", icon: "utensils", label: "Grill" },
      ]}
      aboutParagraphs={[
        "The Lagoon Kitchen is in Ikoyi and serves Nigerian cooking over the water, with an open grill and a terrace that seats eighty.",
      ]}
      host={{
        name: "Lagoon Hospitality",
        role: t.stays.restaurantsTitle,
        verified: true,
        verifiedLabel: t.catalogue.detail.verifiedHost,
        messageHref,
        messageLabel: t.catalogue.detail.message,
      }}
      reserve={{ listingId: id, messageHref }}
      windows={[
        { id: "w1", weekday: 4, opens: "12:00", closes: "23:00" },
        { id: "w2", weekday: 5, opens: "12:00", closes: "23:30" },
        { id: "w3", weekday: 6, opens: "10:00", closes: "23:30" },
      ]}
      messageHref={messageHref}
    />
  );
}
