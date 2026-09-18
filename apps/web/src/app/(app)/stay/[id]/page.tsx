import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { StayDetailView } from "./StayDetailView";
import { readStayDates, toStaysSearchHref } from "@/components/app/stays/model";
import type { StayDetail } from "./detail-model";
import ListingPage, { generateMetadata as listingMetadata } from "../../listing/[id]/page";

type Params = Promise<{ id: string }>;
type Search = Promise<Record<string, string | string[] | undefined>>;

/**
 * The stay detail showcase.
 *
 * `/stay/[id]` and `/listing/[id]` point at the same place from two URLs, and
 * the URL decides the shell: `sideOfPath` treats `/stay/` as Stays, so a hotel
 * opened from the Stays shelf, a shared link or a notification stays in the
 * Stays shell with its own navigation, dock and accent.
 *
 * ---------------------------------------------------------------------------
 * TWO SHAPES, ONE URL, AND THE FALLBACK IS NOT A DEGRADED STATE.
 *
 * A place on this platform is either a business-grade ACCOMMODATION (M3 to M5:
 * room types, rate plans, photos, amenities, a cancellation policy) or a
 * catalogue LISTING, which is what every stay is today and what many will stay
 * as. Both are real. So this route asks for the accommodation and, when there
 * is not one, renders the listing page rather than an error: the catalogue is
 * real today and the business-grade rows arrive as hosts onboard.
 *
 * The listing branch DELEGATES to the listing page's own component rather than
 * copying it, so the two URLs cannot drift and the gallery, availability and
 * checkout on this path are the ones that have been shipping.
 *
 * ---------------------------------------------------------------------------
 * THE READ IS THE ONE THING NOT WIRED, AND IT IS NAMED RATHER THAN FAKED.
 *
 * `lib/stays/**` is another worker's scope and is empty at the time of
 * writing: there is no `getStayDetail`, and `lib/supabase/database.types.ts`
 * has not been regenerated for M1 to M9, so the accommodation tables cannot be
 * read in a typed way from anywhere yet. Rather than invent a signature for a
 * module that does not exist, or break the tree's typecheck on an import that
 * cannot resolve, the seam is this one function.
 *
 * WHAT LANDS IT, exactly: `lib/stays/queries.ts` exports
 *
 *     export async function getStayDetail(id: string): Promise<StayDetail | null>
 *
 * shaped as this route's own `detail-model.ts` describes (the columns are
 * already named after M1 to M5), and this function becomes one line:
 * `return getStayDetail(id)`. Nothing else on this page changes, and the
 * showcase below is already built and tested against that shape.
 *
 * Until then every visitor gets the catalogue listing, which is the honest
 * answer while no accommodation row exists, and nothing on screen claims a
 * business-grade record that is not there.
 */
async function readStayDetail(_id: string): Promise<StayDetail | null> {
  return null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const detail = await readStayDetail(id);
  if (!detail) return listingMetadata({ params });
  const where = [detail.area, detail.city].filter(Boolean).join(", ");
  return {
    title: where ? `${detail.name}, ${where}` : detail.name,
    description: detail.description ?? undefined,
  };
}

export default async function StayDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const { id } = await params;
  const detail = await readStayDetail(id);

  /* No accommodation row: the catalogue listing, unchanged, in the Stays
     shell. Not an error, and not an empty state. It reads `params` only, and
     the stay dates ride the URL rather than a prop, so nothing is dropped by
     handing it the one argument it takes. */
  if (!detail) return <ListingPage params={params} />;

  const [locale, query] = await Promise.all([getLocale(), searchParams]);
  const t = getDictionary(locale);
  const { checkIn, checkOut, nights, guests } = readStayDates(query);

  /* THE FIRST-PARTY CHECKOUT, ALWAYS. This lane never borrows a step from the
     third-party one: a room on Vallo is reserved and paid for on Vallo. */
  const reserveHref = (roomTypeId: string, ratePlanId: string): string => {
    const search = new URLSearchParams({ stay: detail.id, room: roomTypeId, rate: ratePlanId });
    if (checkIn && checkOut) {
      search.set("checkIn", checkIn);
      search.set("checkOut", checkOut);
    }
    search.set("guests", String(guests));
    return `/checkout?${search.toString()}`;
  };

  return (
    <StayDetailView
      detail={detail}
      nights={nights}
      checkIn={checkIn}
      checkOut={checkOut}
      guests={guests}
      locale={locale}
      copy={t.stayDetail}
      datesHref={toStaysSearchHref({ checkIn, checkOut, guests })}
      reserveHref={reserveHref}
    />
  );
}
