import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { StayDetailView } from "./StayDetailView";
import { readStayDates, toStaysSearchHref } from "@/components/app/stays/model";
import type { StayDetail } from "./detail-model";
import { getStayDetail } from "@/lib/stays/queries";
import { accommodationPhotoUrl } from "@/lib/stays/photos";
import ListingPage, { generateMetadata as listingMetadata } from "../../listing/[id]/page";

type Params = Promise<{ id: string }>;
type Search = Promise<Record<string, string | string[] | undefined>>;

/**
 * The business-grade record behind this URL, in the shape the showcase draws.
 *
 * `lib/stays/queries.ts` returns the rows as the database holds them, named
 * after their own columns; this route's `detail-model.ts` is the view model
 * the screen was built and tested against. The two are deliberately different
 * and this function is the only place they meet, so neither side has to learn
 * the other's vocabulary and a column rename cannot reach the markup.
 *
 * Null means no accommodation row exists for this id, which is the honest
 * answer while hosts are still onboarding: the route then delegates to the
 * catalogue listing rather than drawing an error, so the two URLs never drift.
 */
async function readStayDetail(id: string): Promise<StayDetail | null> {
  const detail = await getStayDetail(id);
  if (!detail) return null;

  const { accommodation } = detail;
  return {
    id: accommodation.id,
    name: accommodation.name,
    description: accommodation.description,
    starRating: accommodation.star_rating,
    city: accommodation.city,
    area: accommodation.area,
    checkInFrom: accommodation.check_in_from,
    checkOutBy: accommodation.check_out_by,
    houseRules: accommodation.house_rules,
    /* Position decides the cover, exactly as it does for a listing. */
    photos: [...detail.photos]
      .sort((a, b) => a.position - b.position)
      .map((photo) => ({ url: accommodationPhotoUrl(photo.storage_path), alt: null })),
    /* The human label, never the code: "Air conditioning", not "ac". */
    amenities: detail.amenities.map((amenity) => amenity.label),
    roomTypes: detail.room_types.map((room) => ({
      id: room.id,
      name: room.name,
      category: room.category,
      description: room.description,
      sleeps: room.sleeps,
      baseRateMinor: room.base_rate_minor,
      sizeSqm: room.size_sqm,
      ratePlans: room.rate_plans.map((plan) => ({
        id: plan.id,
        name: plan.name,
        mealPlan: plan.meal_plan,
        rateMinor: plan.rate_minor,
        minStayNights: plan.min_stay_nights,
        maxStayNights: plan.max_stay_nights,
        policy: plan.policy
          ? {
              id: plan.policy.id,
              name: plan.policy.name,
              summary: plan.policy.summary,
              freeUntilHours: plan.policy.is_free_until_hours,
            }
          : null,
      })),
    })),
    policy: detail.policy
      ? {
          id: detail.policy.id,
          name: detail.policy.name,
          summary: detail.policy.summary,
          freeUntilHours: detail.policy.is_free_until_hours,
        }
      : null,
    businessKind: detail.business.kind,
  };
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

  return (
    <StayDetailView
      detail={detail}
      nights={nights}
      checkIn={checkIn}
      checkOut={checkOut}
      guests={guests}
      locale={locale}
      copy={t.stayDetail}
      t={t}
      datesHref={toStaysSearchHref({ checkIn, checkOut, guests })}
      reserve={{ stayId: detail.id, checkIn, checkOut, guests }}
    />
  );
}
