import "server-only";

import { isSupabaseConfigured } from "../supabase/env";
import { staysClient } from "./db";
import { openState } from "./hours";
import { PAGE_SIZE } from "./filters";
import type {
  AccommodationRow,
  BusinessRow,
  CancellationPolicyRow,
  RatePlanRow,
  RestaurantCard,
  RestaurantDetail,
  RoomTypeDetail,
  ServiceWindowRow,
  StayDetail,
  StaySearchRow,
} from "./types";

/**
 * Server-only reads over the stays tables.
 *
 * Every read goes through the caller's own RLS-bound client and asks; the
 * database answers with rows or with nothing. A signed-out visitor sees
 * PUBLISHED rows because the policies say so, and this module never
 * re-implements that rule. Every failure degrades into a renderable state:
 * an empty shelf, a null detail. Nothing here throws.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The undated stays shelf for a place: the projection in its standing order
 * (featured, then newest), through the same search function the filters use
 * so the two can never disagree about what exists.
 */
export async function listStaysShelf(
  scope: { stateCode?: string; city?: string } = {},
  limit = PAGE_SIZE,
): Promise<StaySearchRow[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await staysClient();
    const { data, error } = await supabase.rpc("stays_search", {
      p_entity_kinds: ["listing", "accommodation"],
      p_state_code: scope.stateCode,
      p_city: scope.city,
      p_limit: limit,
    });
    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}

/**
 * One accommodation with everything its page shows: the business behind it,
 * photos in order, amenities, room types with their rate plans and each
 * plan's policy, and the property-level policy summary.
 */
export async function getStayDetail(accommodationId: string): Promise<StayDetail | null> {
  if (!isSupabaseConfigured() || !UUID_RE.test(accommodationId)) return null;
  try {
    const supabase = await staysClient();

    const { data: accommodation } = await supabase
      .from("accommodations")
      .select("*")
      .eq("id", accommodationId)
      .maybeSingle();
    if (!accommodation) return null;

    const [businessRes, photosRes, amenityLinksRes, roomTypesRes] = await Promise.all([
      supabase
        .from("businesses")
        .select("id, name, slug, kind, source, phone, email, is_demo")
        .eq("id", accommodation.business_id)
        .maybeSingle(),
      supabase
        .from("accommodation_photos")
        .select("id, accommodation_id, storage_path, position")
        .eq("accommodation_id", accommodationId)
        .order("position", { ascending: true }),
      supabase
        .from("accommodation_amenities")
        .select("amenity_id")
        .eq("accommodation_id", accommodationId),
      supabase
        .from("room_types")
        .select("*")
        .eq("accommodation_id", accommodationId)
        .eq("status", "PUBLISHED")
        .order("base_rate_minor", { ascending: true }),
    ]);

    // A business that is not visible to this caller is a property that is not
    // on the shelf for them either.
    if (!businessRes.data) return null;

    const amenityIds = (amenityLinksRes.data ?? []).map((row) => row.amenity_id);
    const roomTypes = roomTypesRes.data ?? [];
    const roomTypeIds = roomTypes.map((row) => row.id);

    const [amenitiesRes, plansRes] = await Promise.all([
      amenityIds.length > 0
        ? supabase.from("amenities").select("code, label, category").in("id", amenityIds).order("code")
        : Promise.resolve({ data: [] as { code: string; label: string; category: string }[] }),
      roomTypeIds.length > 0
        ? supabase
            .from("rate_plans")
            .select("*")
            .in("room_type_id", roomTypeIds)
            .eq("active", true)
            .order("rate_minor", { ascending: true })
        : Promise.resolve({ data: [] as RatePlanRow[] }),
    ]);

    const plans = plansRes.data ?? [];
    const policyIds = new Set<string>(plans.map((plan) => plan.cancellation_policy_id));
    if (accommodation.cancellation_policy_id) policyIds.add(accommodation.cancellation_policy_id);

    const policies = new Map<string, CancellationPolicyRow>();
    if (policyIds.size > 0) {
      const { data } = await supabase
        .from("cancellation_policies")
        .select("id, name, summary, rules, is_free_until_hours, refund_to")
        .in("id", [...policyIds]);
      for (const policy of data ?? []) policies.set(policy.id, policy);
    }

    const room_types: RoomTypeDetail[] = roomTypes.map((room) => ({
      ...room,
      rate_plans: plans
        .filter((plan) => plan.room_type_id === room.id)
        .map((plan) => ({ ...plan, policy: policies.get(plan.cancellation_policy_id) ?? null })),
    }));

    return {
      accommodation: accommodation as AccommodationRow,
      business: businessRes.data,
      photos: photosRes.data ?? [],
      amenities: amenitiesRes.data ?? [],
      room_types,
      policy: accommodation.cancellation_policy_id
        ? (policies.get(accommodation.cancellation_policy_id) ?? null)
        : null,
    };
  } catch {
    return null;
  }
}

/** One restaurant with its profile, hours and whether it is seating now. */
export async function getRestaurantDetail(
  businessId: string,
  now: Date = new Date(),
): Promise<RestaurantDetail | null> {
  if (!isSupabaseConfigured() || !UUID_RE.test(businessId)) return null;
  try {
    const supabase = await staysClient();
    const { data: business } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", businessId)
      .eq("kind", "restaurant")
      .maybeSingle();
    if (!business) return null;

    const [profileRes, windowsRes] = await Promise.all([
      supabase.from("restaurant_profiles").select("*").eq("business_id", businessId).maybeSingle(),
      supabase
        .from("service_windows")
        .select("*")
        .eq("business_id", businessId)
        .order("weekday")
        .order("opens"),
    ]);

    const windows: ServiceWindowRow[] = windowsRes.data ?? [];
    const state = openState(windows, now);
    return {
      business: business as BusinessRow,
      profile: profileRes.data ?? null,
      windows,
      open_now: state.open_now,
      hours_label: state.hours_label,
    };
  } catch {
    return null;
  }
}

/**
 * Published restaurants for a place, each with open-now computed from its
 * service windows on the Lagos clock. Hours are fetched in one query for the
 * page rather than one per card.
 */
export async function listRestaurants(
  scope: { stateCode?: string; city?: string; openNow?: boolean } = {},
  limit = PAGE_SIZE,
  now: Date = new Date(),
): Promise<RestaurantCard[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await staysClient();
    let query = supabase
      .from("businesses")
      .select("id, name, slug, area, city, state_code, source, is_demo, latitude, longitude")
      .eq("kind", "restaurant")
      .eq("status", "PUBLISHED")
      .order("published_at", { ascending: false })
      .limit(limit);
    if (scope.stateCode) query = query.eq("state_code", scope.stateCode);
    if (scope.city) query = query.ilike("city", scope.city);

    const { data: businesses, error } = await query;
    if (error || !businesses || businesses.length === 0) return [];
    const ids = businesses.map((b) => b.id);

    const [profilesRes, windowsRes] = await Promise.all([
      supabase.from("restaurant_profiles").select("*").in("business_id", ids),
      supabase.from("service_windows").select("*").in("business_id", ids),
    ]);

    const profiles = new Map((profilesRes.data ?? []).map((p) => [p.business_id, p]));
    const windowsByBusiness = new Map<string, ServiceWindowRow[]>();
    for (const w of windowsRes.data ?? []) {
      const list = windowsByBusiness.get(w.business_id) ?? [];
      list.push(w);
      windowsByBusiness.set(w.business_id, list);
    }

    const cards: RestaurantCard[] = businesses.map((business) => {
      const state = openState(windowsByBusiness.get(business.id) ?? [], now);
      return {
        business,
        profile: profiles.get(business.id) ?? null,
        open_now: state.open_now,
        hours_label: state.hours_label,
      };
    });

    return scope.openNow ? cards.filter((card) => card.open_now) : cards;
  } catch {
    return [];
  }
}
