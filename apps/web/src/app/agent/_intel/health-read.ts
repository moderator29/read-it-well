import "server-only";
import { reportError } from "@/lib/observability/report";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { readLiveFreshness } from "@/lib/agent/freshness-read";
import type { SubmitSubject } from "@/lib/agent/listings-model";
import type { HealthFacts } from "@/components/agent/intel/health-model";
import { readOneFunnel } from "./space-read";

/**
 * THE READ BEHIND A LISTING'S HEALTH (feature register J4).
 *
 * One listing row, under the lister's own RLS (`listings_owner_all`), naming
 * only columns `authenticated` still holds after DB-10 step 2
 * (`20260929123603`): the four supply dates are public columns, the address,
 * the coordinates and the reviewer's notes are not and are never asked for.
 * The photos and amenities come embedded, as the listings repository reads
 * them. Two further reads are separate on purpose:
 *
 *   the "still available?" stamp, through `readLiveFreshness`, because
 *   `lister_confirmed_at` may not exist on a database yet and a select that
 *   names a missing column loses the whole row, not one field;
 *
 *   the week's funnel, through `readOneFunnel`, so its one fix is the same
 *   sentence the analytics page shows.
 */

type Db = SupabaseClient<Database>;

export type HealthRead =
  | { state: "missing" | "unavailable" }
  | { state: "example"; title: string }
  | { state: "ok"; id: string; title: string; status: string; facts: HealthFacts };

type HealthRow = {
  id: string;
  title: string;
  description: string | null;
  property_type: SubmitSubject["propertyType"];
  state_code: string | null;
  city: string | null;
  area: string | null;
  listing_intent: SubmitSubject["intent"];
  rent_amount_minor: number | null;
  rent_period: SubmitSubject["rentPeriod"];
  rate_minor: number | null;
  rate_period: SubmitSubject["ratePeriod"];
  sale_price_minor: number | null;
  tenure: SubmitSubject["tenure"];
  bedrooms: number;
  bathrooms: number;
  status: string;
  is_demo: boolean;
  listing_role: "owner" | "agent" | "firm" | null;
  published_at: string | null;
  physically_inspected_at: string | null;
  address_verified_at: string | null;
  ownership_verified_at: string | null;
  mandate_verified_at: string | null;
  listing_photos: { position: number }[] | null;
  listing_amenities: { amenity_id: string }[] | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function readListingHealth(supabase: Db, agentId: string, listingId: string): Promise<HealthRead> {
  if (!UUID.test(listingId)) return { state: "missing" };
  try {
    const { data, error } = await supabase
      .from("listings")
      .select(
        "id, title, description, property_type, state_code, city, area, listing_intent, rent_amount_minor, rent_period, rate_minor, rate_period, sale_price_minor, tenure, bedrooms, bathrooms, status, is_demo, listing_role, published_at, physically_inspected_at, address_verified_at, ownership_verified_at, mandate_verified_at, listing_photos(position), listing_amenities(amenity_id)",
      )
      .eq("id", listingId)
      .eq("agent_id", agentId)
      .maybeSingle();
    if (error) return { state: "unavailable" };
    if (!data) return { state: "missing" };
    const row = data as unknown as HealthRow;
    /* An example listing carries no trust signal and is never measured
       (D24, `earned-trust.ts`); its page says so and draws no rows. */
    if (row.is_demo) return { state: "example", title: row.title };

    const live = row.status === "PUBLISHED";
    const [freshness, funnel] = await Promise.all([
      live ? readLiveFreshness(supabase, agentId) : Promise.resolve(null),
      live ? readOneFunnel(supabase, agentId, listingId) : Promise.resolve(null),
    ]);
    const mine = freshness?.find((f) => f.id === row.id);
    const photos = row.listing_photos ?? [];

    return {
      state: "ok",
      id: row.id,
      title: row.title,
      status: row.status,
      facts: {
        gate: {
          title: row.title,
          description: row.description,
          propertyType: row.property_type,
          stateCode: row.state_code,
          city: row.city,
          area: row.area,
          intent: row.listing_intent,
          rentMinor: row.rent_amount_minor,
          rentPeriod: row.rent_period,
          rateMinor: row.rate_minor,
          ratePeriod: row.rate_period,
          salePriceMinor: row.sale_price_minor,
          tenure: row.tenure,
          bedrooms: row.bedrooms,
          bathrooms: row.bathrooms,
          amenityCount: row.listing_amenities?.length ?? 0,
          photoCount: photos.length,
          hasCover: photos.some((photo) => photo.position === 0),
        },
        status: row.status,
        listingRole: row.listing_role,
        inspectedAt: row.physically_inspected_at,
        addressCheckedAt: row.address_verified_at,
        ownershipVerifiedAt: row.ownership_verified_at,
        mandateVerifiedAt: row.mandate_verified_at,
        publishedAt: row.published_at,
        /* Undefined (could not be read) is not null (never said): only a
           successful read that found this listing knows the difference. */
        listerConfirmedAt: freshness === null || mine === undefined ? undefined : mine.listerConfirmedAt,
        fix: funnel?.state === "ok" ? funnel.listing.fix : null,
        now: Date.now(),
      },
    };
  } catch (error) {
    await reportError({ error, context: { kind: "read.agent_listing_health" } });
    return { state: "unavailable" };
  }
}
