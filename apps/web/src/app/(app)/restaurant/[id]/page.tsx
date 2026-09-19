import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { getListingRepository } from "@/lib/listings/repository";
import { formatNumber } from "@vallo/i18n";
import { Amount } from "@/components/ui/Amount";
import { ButtonLink } from "@/components/ui/Button";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { ListingGallery } from "@/components/app/listing/ListingGallery";
import {
  DetailAboutCard,
  DetailCapsules,
  DetailPriceRow,
  DetailSpecStrip,
  type SpecPair,
} from "@/components/app/listing/DetailAnatomy";
import { ICON, Section, Stack, Surface, TYPE } from "@/components/app/Screen";
import { ReserveTable } from "../../listing/[id]/ReserveTable";
import { getRestaurantDetail } from "@/lib/stays/queries";
import { listSavedPlaces } from "@/lib/saved/places-actions";
import { isSaved, savedKeySet } from "@/lib/saved/places";
import { RESTAURANT_PLATES } from "@/components/app/stays/restaurant-plates";
import { siteUrl } from "@/lib/site";

const WEEKDAY: Record<number, string> = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

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
  const listingFace = listing && listing.kind === "restaurant" ? listing : null;
  const detail = await getRestaurantDetail(listingFace ? listingFace.id : id);

  /* This route is for restaurants. Anything else is served by the surface built
     for it, so a stay or a flat that arrived here is not found rather than
     drawn in the wrong clothes. */
  if (!listingFace && !detail) notFound();

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
        title: detail!.business.name,
        area: detail!.business.area,
        city: detail!.business.city,
        photos: [] as string[],
        /* `businesses.source` says first party or partner; the verified mark
           means a human was checked, which is not what that column records,
           so a venue carries none until it earns one. */
        verified: false,
        priceMinor: 0,
        currency: "NGN",
        rating: null,
      };

  const where = [venue.area, venue.city].filter(Boolean).join(", ");
  /* A thread is bound to a LISTING (`startConversation({ listingId })`), so a
     business venue has no thread to open and the control is not drawn for it
     rather than drawn and refusing. Reported, not worked around. */
  const messageHref = venue.isBusiness ? null : `/messages/new?listing=${venue.id}`;

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

  return (
    <div className="nf-cat-surface">
      <ListingGallery
        listingId={venue.id}
        title={venue.title}
        hue={0}
        kind="restaurant"
        photos={venue.photos}
        plates={RESTAURANT_PLATES as string[]}
        backFallback="/restaurants"
        mark={{ label: t.stays.restaurantsTitle, icon: "utensils", verified: venue.verified, verifiedLabel: t.common.verified }}
        /* The heart, on the shelf this venue actually lives on. A business is
           a `saved_places` row under the restaurant kind; a catalogue listing
           keeps the `saved_items` path and passes no target. It refused every
           tap on a venue until now. */
        {...(venue.isBusiness
          ? { place: { kind: "restaurant" as const, id: venue.id }, initialSaved: savedVenue }
          : {})}
      />

      {/* The third face of the one detail anatomy (B047A0CE): the same lit
          lead card over the photograph, the same bordered spec strip under
          the pin line, the same blue figure with its unit and its rating, the
          same capsule row, and the same About card with its host row. What
          differs is the foot: a restaurant's decision is a table, so the
          reservation control and the week's hours close the page. */}
      <div className="mx-auto max-w-2xl px-gutter pb-section">
        <div className="nf-glass nf-glass--card nf-detail-lead relative z-10 -mt-xl sm:-mt-2xl">
        <div className="flex flex-wrap items-center gap-xs empty:hidden">
          {hours && (
            <span className={`nf-reg-open ${hours.openNow ? "nf-reg-open--open" : "nf-reg-open--closed"}`} data-testid="open-now">
              <UiIcon name="history" size={12} />
              {hours.label}
            </span>
          )}
        </div>
        <h1 className="nf-h2 mt-row [text-wrap:balance]">{venue.title}</h1>
        {where && (
          <p className={`mt-inline-tight flex items-center gap-inline-tight ${TYPE.body}`}>
            <UiIcon name="location" size={ICON.inline} className="shrink-0 text-[var(--nf-brand-secondary)]" />
            {where}
          </p>
        )}

        <DetailSpecStrip pairs={specPairs} />

        {venue.priceMinor > 0 && (
          <DetailPriceRow
            figure={
              <Amount minorUnits={venue.priceMinor} locale={locale} currency={venue.currency} />
            }
            unit={copy.perHead}
            /* Real rows only: the rating is averaged from `reviews` and is
               zero on an example row, so this is absent until somebody has
               actually reviewed the venue. */
            rating={
              venue.rating
                ? {
                    average: formatNumber(venue.rating.average, locale, {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    }),
                    reviews: t.catalogue.stays.reviews.replace(
                      "{count}",
                      formatNumber(venue.rating.count, locale),
                    ),
                  }
                : null
            }
          />
        )}

        <DetailCapsules items={capsules} label={t.catalogue.detail.amenities} />
        </div>

        <div className="mt-block">
          <DetailAboutCard
            title={copy.aboutTitle}
            paragraphs={aboutParagraphs}
            host={
              detail
                ? {
                    name: detail.business.name,
                    role: t.stays.restaurantsTitle,
                    verified: venue.verified,
                    verifiedLabel: t.catalogue.detail.verifiedHost,
                    messageHref,
                    messageLabel: t.catalogue.detail.message,
                  }
                : null
            }
          />
        </div>

        <Stack className="mt-block">
          {/* THE RESERVATION, FIRST. Not a panel beside the description. */}
          <Section
            title={copy.reserveTitle}
            description={copy.reserveBody}
          >
            {/* A reservation names exactly one venue and the database says
                which column it lands in: `business_id` for an M7 venue,
                `listing_id` for a catalogue restaurant. The form carried only
                the listing half, so the whole business-grade path was
                unreachable from the product while `reserveTable` was ready to
                accept it. */}
            <ReserveTable
              {...(venue.isBusiness ? { businessId: venue.id } : { listingId: venue.id })}
              messageHref={messageHref}
            />
          </Section>

          <Section title={copy.gettingThereTitle}>
            <Surface>
              {where && (
                <p className={`flex items-start gap-inline-tight ${TYPE.body}`}>
                  <UiIcon name="location" size={ICON.inline} className="mt-3xs shrink-0" />
                  <span className="min-w-0">{where}</span>
                </p>
              )}
              <p className={`mt-row ${TYPE.rowMeta}`}>{copy.threadLine}</p>
              <Link
                href="/restaurants"
                className={`mt-row inline-flex items-center gap-inline-tight ${TYPE.rowMeta} font-semibold text-[var(--nf-content-link)] underline-offset-4 hover:underline`}
              >
                {t.stays.restaurantsTitle}
                <UiIcon name="arrow-right" size={ICON.inline} />
              </Link>
            </Surface>
          </Section>

          {/*
            THE HOURS, AS THE FOOT OF THE PAGE.

            `lib/stays/hours` answers "is it seating right now" on the Lagos
            clock from the venue's own service windows, and that one line is
            the last thing this page says, under the week it is computed from.
            A venue that has published no windows says so plainly: not "coming
            soon", not an empty week grid, and above all not an "Open now" pill
            this page cannot stand behind, because a guessed badge sends
            somebody across Lagos to a locked door.
          */}
          <Section title={copy.hoursTitle}>
            <Surface>
              {hours && (
                <p
                  className={`nf-reg-open ${hours.openNow ? "nf-reg-open--open" : "nf-reg-open--closed"} mb-row`}
                  data-testid="hours-open-now"
                >
                  <UiIcon name="history" size={12} />
                  {hours.label}
                </p>
              )}
              {detail && detail.windows.length > 0 ? (
                <ul className="divide-y divide-[var(--nf-divider)]" data-testid="service-windows">
                  {detail.windows.map((window) => (
                    <li key={window.id} className={`flex items-center justify-between gap-sm py-xs ${TYPE.body}`}>
                      <span className="font-medium text-[var(--nf-content-primary)]">{WEEKDAY[window.weekday] ?? window.weekday}</span>
                      <span className="nf-numeric">
                        {window.opens.slice(0, 5)} to {window.closes.slice(0, 5)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <>
                  <p className={TYPE.body}>{copy.hoursUnknown}</p>
                  <p className={`mt-row ${TYPE.rowMeta}`}>{copy.hoursAsk}</p>
                </>
              )}
              {messageHref && (
                <ButtonLink href={messageHref} variant="secondary" className="mt-row">
                  {copy.message}
                </ButtonLink>
              )}
            </Surface>
          </Section>
        </Stack>
      </div>
    </div>
  );
}
