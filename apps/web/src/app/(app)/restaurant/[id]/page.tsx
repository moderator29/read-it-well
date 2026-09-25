import type { Metadata } from "next";
import { isPropertyMarket, marketOf } from "@/lib/listings/market";
import { notFound, redirect } from "next/navigation";
import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { getListingRepository } from "@/lib/listings/repository";
import { formatNumber } from "@vallo/i18n";
import type { UiIconName } from "@/design-system/icons/UiIcon";
import type { SpecPair } from "@/components/app/listing/DetailAnatomy";
import { getRestaurantDetail } from "@/lib/stays/queries";
import { listBusinessPhotos } from "@/lib/stays/business-photos";
import { listSavedPlaces } from "@/lib/saved/places-actions";
import { isSaved, savedKeySet } from "@/lib/saved/places";
import { RESTAURANT_PLATES } from "@/components/app/stays/restaurant-plates";
import { siteUrl } from "@/lib/site";
import { resolveSession } from "@/lib/actions/session";
import { RestaurantFace } from "./RestaurantFace";

/**
 * A restaurant, on its own surface.
 *
 * `/restaurant/[id]` used to re-export the listing page, which meant a table
 * was booked inside a screen built to sell a flat: the reservation sat in a
 * right-hand panel under a property's fact grid, below the fold on a phone.
 *
 * THE RESERVATION IS THE PAGE. On a restaurant the only thing most people came
 * to do is hold a table, so it is the first thing under the name rather than a
 * panel beside the description. Everything else on this screen is what somebody
 * checks BEFORE they tap it: where it is, what a head costs, and a way to ask a
 * question.
 *
 * ---------------------------------------------------------------------------
 * THE ANATOMY IS B047A0CE'S, THE FOOT IS THIS MARKET'S.
 *
 * The lead card, the bordered spec strip, the blue figure with its unit and
 * rating, the capsule row and the About card with its host row are the same
 * five parts the stay face draws, from `components/app/listing/DetailAnatomy`.
 * What a restaurant does not share is the decision: a table, not a night. So
 * the reservation control opens the run below the card, and the page closes on
 * the hours and the open-now line that `lib/stays/hours` computes on the Lagos
 * clock from this venue's own `service_windows` rows.
 *
 * A venue that has published no windows still gets no badge. `openState` is
 * only ever asked about rows that exist, and the hours card says plainly that
 * there are none rather than implying availability nobody can check.
 *
 * ---------------------------------------------------------------------------
 * THE THREAD THE RESERVATION LANDS IN.
 *
 * `ThreadContextBanner`'s `ReservationFace` is built and shipping: a
 * reservation-bound conversation already renders its state, its Lagos-time sub
 * line and its cancel control. What does not exist is the WRITE that binds the
 * two: `reserveTable` in `lib/reservations/actions.ts` inserts the reservation
 * and creates no conversation, so there is no thread for the face to occupy.
 * That action is another worker's file. When it creates (or finds) a
 * conversation with `reservation_id` set and returns its id, the confirmation
 * below gains "Message the restaurant" pointing at `/messages/<id>` and the
 * whole reservation lives inside its own thread, which is the shape the
 * research asks for. Until then the message link opens an ordinary listing
 * thread, which is what it has always done and is honest about what it is.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListingRepository().byId(id);
  const restaurant = listing && listing.kind === "restaurant" ? listing : null;
  /* The business-grade venue answers here too, or every M7 restaurant would
     carry the fallback title in the tab and in a shared link. */
  const venue = restaurant ?? (await getRestaurantDetail(id));
  if (!venue) {
    return { title: getDictionary(await getLocale()).restaurantPage.fallbackTitle };
  }
  const name = "business" in venue ? venue.business.name : venue.title;
  const area = "business" in venue ? venue.business.area : venue.area;
  const city = "business" in venue ? venue.business.city : venue.city;
  const where = [area, city].filter(Boolean).join(", ");
  const title = where ? `${name}, ${where}` : name;
  const description = where
    ? `${name}, ${where}. Ask for a table on Vallo.`
    : `${name}. Ask for a table on Vallo.`;
  const url = `${siteUrl().replace(/\/+$/, "")}/restaurant/${id}`;
  /* A listing-backed restaurant carries photographs; an M7 business row does
     not expose one here, and a card with no image is better than a card
     pointing at nothing. */
  const cover = restaurant && restaurant.photos.length > 0 ? restaurant.photos[0] : undefined;
  return {
    title,
    /*
     * STILL NOINDEX, AND THE SHARE CARD IS NOT A CONTRADICTION. `robots`
     * speaks to a crawler deciding what to put in an index; Open Graph speaks
     * to a messenger drawing a preview of a link somebody has already been
     * sent. This page keeps the first and gains the second (R3 finding F-10):
     * a restaurant forwarded into WhatsApp unfurled as the generic site card.
     */
    robots: { index: false, follow: false },
    openGraph: {
      type: "website",
      title,
      description,
      url,
      ...(cover ? { images: [cover] } : {}),
    },
    twitter: {
      card: cover ? "summary_large_image" : "summary",
      title,
      description,
      ...(cover ? { images: [cover] } : {}),
    },
  };
}

export default async function RestaurantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  const copy = t.restaurantPage;

  /*
   * TWO KINDS OF RESTAURANT REACH THIS URL, AND ONE OF THEM USED TO 404.
   *
   * The catalogue holds restaurants twice over: as first-party `listings`
   * rows, which the repository resolves, and as `businesses` of kind
   * restaurant, which is what M7 onboards and what `listRestaurants` reads.
   * `/restaurants` and the stays shelf both link a business-grade venue to
   * `/restaurant/<businessId>`, and this route asked the LISTING repository
   * only: `byId` returned null for every one of them and the page called
   * `notFound()`. A venue we list, with hours we compute and a reservation
   * table the database is ready to accept, opened a not-found screen.
   *
   * So the id is resolved against both, listing first because that is the
   * older and larger half, and the face below is drawn from whichever
   * answered. Nothing else about the listing path changes.
   */
  const listing = await getListingRepository().byId(id);
  /* UI-P2-03: premises let on a rent or sold are Property, not a place to
     book a table; they move to the rental template. */
  if (listing && isPropertyMarket(marketOf(listing))) redirect(`/listing/${id}`);
  const listingFace = listing && marketOf(listing) === "dining" ? listing : null;
  const detail = await getRestaurantDetail(listingFace ? listingFace.id : id);

  /* This route is for restaurants. Anything else is served by the surface built
     for it, so a stay or a flat that arrived here is not found rather than
     drawn in the wrong clothes. */
  if (!listingFace && !detail) notFound();

  /*
   * THE VENUE'S OWN PHOTOGRAPHS, which until P3 could not exist.
   *
   * There was no photo table on the business spine, so this page hard-coded an
   * empty list and the gallery drew a Vallo category plate under a "No
   * photographs yet" chip. `business_photos` is that table, and the read is the
   * caller's own: `business_photos_select` shows a published venue's pictures
   * to anybody and an unpublished venue's only to its owner and to an admin.
   * A venue that still has none keeps the honest plate, because the gallery
   * only draws a stand-in when the list is empty.
   */
  const venuePhotos = detail ? await listBusinessPhotos(detail.business.id) : [];

  /*
   * ONE FACE, TWO READS. The page below speaks about a venue, not about a
   * row shape, so the two reads are flattened here and nowhere else. A
   * business states no price and carries no reviews of its own yet, so those
   * cells are simply absent rather than zeroed: a venue with no stated cover
   * charge must not be drawn as costing nothing.
   */
  const venue = listingFace
    ? {
        id: listingFace.id,
        isBusiness: false as const,
        isExample: listingFace.isDemo === true,
        title: listingFace.title,
        area: listingFace.area,
        city: listingFace.city,
        photos: listingFace.photos ?? [],
        verified: listingFace.verified,
        priceMinor: listingFace.priceMinor,
        currency: listingFace.currency,
        rating: listingFace.reviewCount > 0 && listingFace.rating > 0
          ? { average: listingFace.rating, count: listingFace.reviewCount }
          : null,
      }
    : {
        id: detail!.business.id,
        isBusiness: true as const,
        isExample: detail!.business.is_demo === true,
        title: detail!.business.name,
        area: detail!.business.area,
        city: detail!.business.city,
        photos: venuePhotos.map((photo) => photo.url),
        /* `businesses.source` says first party or partner; the verified mark
           means a human was checked, which is not what that column records,
           so a venue carries none until it earns one. */
        verified: false,
        priceMinor: 0,
        currency: "NGN",
        rating: null,
      };

  const where = [venue.area, venue.city].filter(Boolean).join(", ");
  /* A listing thread is bound to a LISTING (`startConversation({ listingId })`),
     so this link exists only for a catalogue restaurant. A business venue is
     messaged through the host row's `messageVenue` instead (track F). */
  const messageHref =
    venue.isBusiness || venue.isExample ? null : `/messages/new?listing=${venue.id}`;

  /* The hours, when the venue has published them through lib/stays
     (service windows on the business-grade schema). A listing with none
     keeps the honest line below rather than a guessed badge. */
  const hours = detail ? { openNow: detail.open_now, label: detail.hours_label } : null;

  /* A business venue's shortlist is `saved_places` under the restaurant kind,
     keyed on the business id exactly as `catalogue_entries` files it; a
     catalogue listing stays on `saved_items` and needs no target. Read here so
     the heart is lit before hydration. */
  const savedPlaces = venue.isBusiness ? await listSavedPlaces() : null;
  const savedVenue =
    savedPlaces !== null &&
    isSaved(savedKeySet(savedPlaces.ok ? savedPlaces.data : []), "restaurant", venue.id);

  /*
   * THE SPEC STRIP, THE CAPSULES AND THE HOST, from `restaurant_profiles`.
   *
   * Every cell below is a column the venue filled in itself: the cuisines it
   * serves, the dress code it asks for, the covers its busiest service seats,
   * and the three facility booleans. A venue that filled none of them draws
   * an empty strip and no capsules, which is the honest shape for a record
   * that has not been completed, and is why none of these has a default.
   */
  const profile = detail?.profile ?? null;
  const specPairs: SpecPair[] = [];
  const firstCuisine = profile?.cuisines?.[0];
  if (firstCuisine) {
    specPairs.push({ key: "cuisine", icon: "utensils", label: firstCuisine });
  }
  if (profile?.dress_code) {
    specPairs.push({ key: "dress", icon: "user", label: profile.dress_code });
  }
  const covers = Math.max(0, ...(detail?.windows ?? []).map((window) => window.covers));
  if (covers > 0) {
    specPairs.push({
      key: "covers",
      icon: "grid",
      label: copy.covers.replace("{count}", formatNumber(covers, locale)),
    });
  }

  const capsules: { key: string; icon: UiIconName; label: string }[] = [];
  if (profile?.parking) capsules.push({ key: "parking", icon: "parking", label: copy.parking });
  if (profile?.power_backup) capsules.push({ key: "power", icon: "bolt", label: copy.backupPower });
  if (profile?.outdoor) capsules.push({ key: "outdoor", icon: "map", label: copy.outdoor });
  for (const cuisine of profile?.cuisines?.slice(1) ?? []) {
    capsules.push({ key: `cuisine-${cuisine}`, icon: "utensils", label: cuisine });
  }

  /* The one paragraph this page can write without inventing anything: the
     venue's own words where the business wrote some, and otherwise a sentence
     assembled from fields that exist. */
  const aboutParagraphs = [
    detail?.business.description ??
      [venue.title, where ? `is in ${where}` : null, firstCuisine ? `and serves ${firstCuisine}` : null]
        .filter(Boolean)
        .join(" ")
        .concat("."),
  ];

  const signedIn = (await resolveSession()).state === "signed-in";

  /* The face itself is `RestaurantFace`, so the sweep's fixture harness draws
     exactly what this route draws (the second audit's S-B). */
  return (
    <RestaurantFace
      locale={locale}
      t={t}
      gallery={{
        listingId: venue.id,
        title: venue.title,
        hue: 0,
        kind: "restaurant",
        photos: venue.photos,
        plates: RESTAURANT_PLATES as string[],
        backFallback: "/restaurants",
        mark: { label: t.stays.restaurantsTitle, icon: "utensils", verified: venue.verified, verifiedLabel: t.common.verified },
        /* The heart, on the shelf this venue actually lives on. A business is
           a `saved_places` row under the restaurant kind; a catalogue listing
           keeps the `saved_items` path and passes no target. It refused every
           tap on a venue until now. */
        ...(venue.isBusiness
          ? { place: { kind: "restaurant" as const, id: venue.id }, initialSaved: savedVenue }
          : {}),
      }}
      title={venue.title}
      where={where}
      hours={hours}
      specPairs={specPairs}
      price={venue.priceMinor > 0 ? { minor: venue.priceMinor, currency: venue.currency } : null}
      rating={
        venue.rating
          ? {
              average: formatNumber(venue.rating.average, locale, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              }),
              reviews: t.catalogue.stays.reviews.replace("{count}", formatNumber(venue.rating.count, locale)),
            }
          : null
      }
      capsules={capsules}
      aboutParagraphs={aboutParagraphs}
      host={
        detail
          ? {
              name: detail.business.name,
              role: t.stays.restaurantsTitle,
              verified: venue.verified,
              verifiedLabel: t.catalogue.detail.verifiedHost,
              messageHref,
              /* Track F: a business venue has no listing thread, so it is
                 messaged through the business itself (`MessageVenue`). */
              messageVenue:
                venue.isBusiness && !venue.isExample
                  ? { businessId: venue.id, venueName: detail.business.name }
                  : null,
              messageLabel: t.catalogue.detail.message,
            }
          : null
      }
      /* A reservation names exactly one venue and the database says which
         column it lands in: `business_id` for an M7 venue, `listing_id` for a
         catalogue restaurant. */
      reserve={{ ...(venue.isBusiness ? { businessId: venue.id } : { listingId: venue.id }), messageHref }}
      windows={detail ? detail.windows : null}
      messageHref={messageHref}
      isExample={venue.isExample}
      report={{
        targetType: venue.isBusiness ? "business" : "listing",
        targetId: venue.id,
        signedIn,
      }}
    />
  );
}
