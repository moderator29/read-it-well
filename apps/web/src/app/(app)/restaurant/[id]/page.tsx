import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { getListingRepository } from "@/lib/listings/repository";
import { Amount } from "@/components/ui/Amount";
import { ButtonLink } from "@/components/ui/Button";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { ListingGallery } from "@/components/app/listing/ListingGallery";
import { ICON, Section, Stack, Surface, TYPE } from "@/components/app/Screen";
import { ReserveTable } from "../../listing/[id]/ReserveTable";
import { getRestaurantDetail } from "@/lib/stays/queries";
import { RESTAURANT_PLATES } from "@/components/app/stays/restaurant-plates";

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
 * WHAT THIS SCREEN DELIBERATELY DOES NOT SAY.
 *
 * It does not say whether the kitchen is open. "Open now" needs stored opening
 * hours, which is `service_windows` on the business-grade schema (M7) read
 * through `lib/stays`, and that module is empty at the time of writing. A badge
 * that guesses would send somebody across Lagos to a locked door, so this page
 * states the hours it has, which is none, and says so in one line rather than
 * implying availability it cannot check.
 *
 * WHAT LANDS IT: a read in `lib/stays` returning this restaurant's
 * `service_windows` rows (weekday, opens, closes, last seating, covers). With
 * those the line below becomes the week's hours, `whyNotBookable` gains the
 * last-seating rule, and an honest open-now pill can appear beside the name.
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
  if (!listing || listing.kind !== "restaurant") {
    return { title: getDictionary(await getLocale()).restaurantPage.fallbackTitle };
  }
  const where = [listing.area, listing.city].filter(Boolean).join(", ");
  return {
    title: where ? `${listing.title}, ${where}` : listing.title,
    robots: { index: false, follow: false },
  };
}

export default async function RestaurantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  const listing = await getListingRepository().byId(id);
  const copy = t.restaurantPage;

  /* This route is for restaurants. Anything else is served by the surface built
     for it, so a stay or a flat that arrived here is not found rather than
     drawn in the wrong clothes. */
  if (!listing || listing.kind !== "restaurant") notFound();

  const where = [listing.area, listing.city].filter(Boolean).join(", ");
  const messageHref = `/messages/new?listing=${listing.id}`;

  /* The hours, when the venue has published them through lib/stays
     (service windows on the business-grade schema). A listing with none
     keeps the honest line below rather than a guessed badge. */
  const detail = await getRestaurantDetail(listing.id);
  const hours = detail ? { openNow: detail.open_now, label: detail.hours_label } : null;

  return (
    <div>
      <ListingGallery
        listingId={listing.id}
        title={listing.title}
        hue={0}
        kind="restaurant"
        photos={listing.photos ?? []}
        plates={RESTAURANT_PLATES as string[]}
        backFallback="/restaurants"
      />

      <div className="mx-auto max-w-2xl px-gutter pb-section pt-block">
        <div className="flex flex-wrap items-center gap-xs">
          <span className="nf-detail-tag nf-detail-tag--market">
            <UiIcon name="utensils" size={14} />
            {t.stays.restaurantsTitle}
          </span>
          {hours && (
            <span className={`nf-reg-open ${hours.openNow ? "nf-reg-open--open" : "nf-reg-open--closed"}`} data-testid="open-now">
              <UiIcon name="history" size={12} />
              {hours.label}
            </span>
          )}
        </div>
        <h1 className="nf-h2 mt-row [text-wrap:balance]">{listing.title}</h1>
        {where && (
          <p className={`mt-inline-tight flex items-center gap-inline-tight ${TYPE.body}`}>
            <UiIcon name="location" size={ICON.inline} className="shrink-0 text-[var(--nf-brand-secondary)]" />
            {where}
          </p>
        )}
        {listing.priceMinor > 0 && (
          <p className="mt-inline flex items-baseline gap-inline-tight">
            <Amount
              minorUnits={listing.priceMinor}
              locale={locale}
              currency={listing.currency}
              className="nf-h3 text-[var(--nf-content-primary)]"
            />
            <span className={TYPE.rowMeta}>{copy.perHead}</span>
          </p>
        )}

        <Stack className="mt-block">
          {/* THE RESERVATION, FIRST. Not a panel beside the description. */}
          <Section
            title={copy.reserveTitle}
            description={copy.reserveBody}
          >
            <ReserveTable listingId={listing.id} messageHref={messageHref} />
          </Section>

          {/*
            THE HOURS WE DO NOT HAVE, SAID PLAINLY.

            Not "coming soon", not an empty week grid, and above all not an
            "Open now" pill this page cannot stand behind. It states what it
            knows and points at the person who does know.
          */}
          <Section title={copy.hoursTitle}>
            <Surface>
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
              <ButtonLink href={messageHref} variant="secondary" className="mt-row">
                {copy.message}
              </ButtonLink>
            </Surface>
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
        </Stack>
      </div>
    </div>
  );
}
