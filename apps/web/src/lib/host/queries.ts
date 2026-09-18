import "server-only";

/**
 * Reading a host's own application.
 *
 * Everything goes through the caller's own RLS-bound client:
 * `businesses_owner_all` scopes rows by `owner_id`, and every child table
 * scopes through `private.owns_business` or `private.owns_accommodation`, so
 * another host's application simply does not come back. Nothing here uses the
 * service role.
 *
 * NEITHER READ EVER THROWS UPWARDS. The wizard renders whatever happens here:
 * a failed read comes back as an empty draft rather than as an error screen,
 * because the draft the person is typing lives in the browser until it is
 * saved and a crash would be the one way to lose it.
 */

import { resolveSession } from "../actions/session";
import {
  emptyHostDraft,
  type ConsentId,
  type HostDocumentKind,
  type HostDraft,
  type HostType,
} from "./onboarding";
import type { Database } from "../supabase/database.types";
import {
  BUSINESS_TIER_NAME,
  asBusinessTier,
  ladderView,
  nextRung,
  type BusinessLadderRow,
  type BusinessRung,
  type BusinessTier,
} from "../admin/business-ladder";

type BusinessRow = Database["public"]["Tables"]["businesses"]["Row"];
type ListingStatus = Database["public"]["Enums"]["listing_status"];

/** One of the caller's businesses, as the host's own list shows it. */
export type MyBusiness = {
  id: string;
  name: string;
  slug: string;
  kind: Database["public"]["Enums"]["business_kind"];
  status: ListingStatus;
  hostType: HostType | null;
  /** Rungs passed with no gap below, 0 to 4. Derived by the database. */
  verificationTier: number;
  verified: boolean;
  submittedAt: string | null;
  reviewedAt: string | null;
  /** The reviewer's words, when they sent it back or refused it. */
  reviewNotes: string | null;
  createdAt: string;
};

const BUSINESS_COLUMNS =
  "id, name, slug, kind, status, host_type, description, phone, email, address, area, city, state_code, registered_name, cac_number, tin, representative_name, representative_phone, consents, hygiene_attested_at, licence_attested_at, submitted_at, reviewed_at, review_notes, verification_tier, verified, created_at";

function asHostType(value: string | null): HostType | null {
  return value === "individual" || value === "business" || value === "restaurant" ? value : null;
}

/** The consents jsonb, read defensively: anything malformed is no consent. */
function readConsents(value: BusinessRow["consents"]): Partial<Record<ConsentId, string>> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Partial<Record<ConsentId, string>> = {};
  for (const id of ["accuracy", "terms", "processing"] as const) {
    const at = (value as Record<string, unknown>)[id];
    if (typeof at === "string" && at.length > 0) out[id] = at;
  }
  return out;
}

/**
 * The application the caller is still working on, with everything
 * `missingFrom` needs to say what is absent.
 *
 * "Still working on" is DRAFT, MORE_INFO_REQUIRED or SUBMITTED, newest first:
 * a host sent back for more information is editing the same row, and a host
 * who has submitted should still see what they sent rather than a blank
 * wizard. Nothing here creates a row; the first save does that.
 */
export async function getMyHostDraft(): Promise<HostDraft> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return emptyHostDraft();

  try {
    const { data: business } = await session.supabase
      .from("businesses")
      .select(BUSINESS_COLUMNS)
      .eq("owner_id", session.user.id)
      .in("status", ["DRAFT", "MORE_INFO_REQUIRED", "SUBMITTED"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!business) return emptyHostDraft();

    const [documents, accommodations, restaurant, windows, bankAccounts] = await Promise.all([
      session.supabase.from("business_documents").select("kind").eq("business_id", business.id),
      session.supabase
        .from("accommodations")
        .select("id, name, latitude, longitude, accommodation_photos(id)")
        .eq("business_id", business.id)
        .order("created_at", { ascending: true })
        .limit(1),
      session.supabase
        .from("restaurant_profiles")
        .select("price_band, cuisines")
        .eq("business_id", business.id)
        .maybeSingle(),
      session.supabase
        .from("service_windows")
        .select("id")
        .eq("business_id", business.id)
        .limit(50),
      session.supabase
        .from("bank_accounts")
        .select("id")
        .eq("user_id", session.user.id)
        .is("deleted_at", null)
        .limit(1),
    ]);

    const accommodation = accommodations.data?.[0] ?? null;
    let roomTypeCount = 0;
    let ratePlanCount = 0;
    if (accommodation) {
      const { data: roomTypes } = await session.supabase
        .from("room_types")
        .select("id, rate_plans(id)")
        .eq("accommodation_id", accommodation.id)
        .limit(50);
      roomTypeCount = roomTypes?.length ?? 0;
      ratePlanCount = (roomTypes ?? []).reduce((total, row) => total + row.rate_plans.length, 0);
    }

    const present: Partial<Record<HostDocumentKind, true>> = {};
    for (const row of documents.data ?? []) {
      present[row.kind as HostDocumentKind] = true;
    }

    return {
      businessId: business.id,
      status: business.status,
      hostType: asHostType(business.host_type),
      kind: business.kind,
      name: business.name,
      description: business.description ?? "",
      phone: business.phone ?? "",
      email: business.email ?? "",
      address: business.address ?? "",
      area: business.area ?? "",
      city: business.city ?? "",
      stateCode: business.state_code ?? "",
      registeredName: business.registered_name ?? "",
      cacNumber: business.cac_number ?? "",
      tin: business.tin ?? "",
      representativeName: business.representative_name ?? "",
      representativePhone: business.representative_phone ?? "",
      documents: present,
      accommodation: accommodation
        ? {
            id: accommodation.id,
            name: accommodation.name,
            /* Both halves of the pin, because one without the other is not a
               place on a map (MK-55). */
            hasPin: accommodation.latitude !== null && accommodation.longitude !== null,
            photoCount: accommodation.accommodation_photos.length,
          }
        : null,
      roomTypeCount,
      ratePlanCount,
      restaurant: restaurant.data
        ? {
            priceBand: restaurant.data.price_band,
            cuisineCount: restaurant.data.cuisines.length,
          }
        : null,
      serviceWindowCount: windows.data?.length ?? 0,
      hygieneAttestedAt: business.hygiene_attested_at,
      licenceAttestedAt: business.licence_attested_at,
      hasBankAccount: (bankAccounts.data?.length ?? 0) > 0,
      consents: readConsents(business.consents),
    };
  } catch {
    /* The wizard renders whatever happens here. An empty draft is survivable;
       a crashed page loses what somebody has typed. */
    return emptyHostDraft();
  }
}

/** Every business this account owns, newest first. Empty when signed out. */
export async function getMyBusinesses(): Promise<MyBusiness[]> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return [];

  try {
    const { data, error } = await session.supabase
      .from("businesses")
      .select(
        "id, name, slug, kind, status, host_type, verification_tier, verified, submitted_at, reviewed_at, review_notes, created_at",
      )
      .eq("owner_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return [];

    return (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      kind: row.kind,
      status: row.status,
      hostType: asHostType(row.host_type),
      verificationTier: row.verification_tier,
      verified: row.verified,
      submittedAt: row.submitted_at,
      reviewedAt: row.reviewed_at,
      reviewNotes: row.review_notes,
      createdAt: row.created_at,
    }));
  } catch {
    return [];
  }
}

/** The host's own ladder, as their status page shows it. */
export type MyBusinessLadder = {
  businessId: string;
  name: string;
  /** Rungs passed with no gap below, read from the row the trigger wrote. */
  tier: BusinessTier;
  tierName: string;
  /** The badge, as the database derived it. */
  verified: boolean;
  rungs: BusinessLadderRow[];
  /** The lowest rung not yet passed, or null when the ladder is complete. */
  next: BusinessRung | null;
};

/**
 * The trigger-computed tier, read back for the host who owns the business,
 * with every rung's recorded decision beside it.
 *
 * Both reads go through the caller's own RLS-bound client:
 * `businesses_owner_all` scopes the row, and
 * `business_verification_checks_select_own` lets an owner read the rungs on
 * their own business and nothing else. The tier is the row's own column,
 * never recomputed here; `ladderView` only lays the rungs out in order and
 * marks a passed rung above a gap as not yet counting, which is what
 * `private.business_tier` decided too.
 *
 * Null when signed out, when the business is not the caller's, or when the
 * read failed: a status page renders "nothing to show" from null and never a
 * crash.
 */
export async function getMyBusinessLadder(businessId: string): Promise<MyBusinessLadder | null> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return null;

  try {
    const { data: business, error } = await session.supabase
      .from("businesses")
      .select("id, name, verification_tier, verified")
      .eq("id", businessId)
      .eq("owner_id", session.user.id)
      .maybeSingle();
    if (error || !business) return null;

    const { data: checks } = await session.supabase
      .from("business_verification_checks")
      .select("rung, status, note, decided_at")
      .eq("business_id", business.id);

    const rows = (checks ?? []).map((check) => ({
      rung: check.rung,
      status: check.status,
      note: check.note,
      decidedAt: check.decided_at,
    }));
    const tier = asBusinessTier(business.verification_tier);

    return {
      businessId: business.id,
      name: business.name,
      tier,
      tierName: BUSINESS_TIER_NAME[tier],
      verified: business.verified,
      rungs: ladderView(rows),
      next: nextRung(rows),
    };
  } catch {
    return null;
  }
}
