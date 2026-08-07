import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "../supabase/database.types";
import { SUPABASE_URL } from "../supabase/env";
import { resolveSession } from "../actions/session";
import type { AgentProfile } from "./types";
import {
  AMENITY_CHOICES,
  type PropertyType,
  koboToNairaInput,
  type PowerBackup,
  type PowerGrid,
  type WaterSupply,
} from "./listings-schema";

/**
 * Server-side reads for the agent supply loop.
 *
 * Everything here runs as the signed-in agent through their own RLS-bound
 * client, so the database decides what they may see and this file never has to
 * repeat an ownership rule. The write half lives in listings-actions.ts; the
 * two share the agent resolution below so a caller cannot accidentally hold a
 * different definition of "this agent".
 */

export const PHOTO_BUCKET = "listing-photos";

export type ListingStatus = Database["public"]["Enums"]["listing_status"];

export type AgentIdentity = {
  id: string;
  displayName: string;
  status: Database["public"]["Enums"]["agent_application_status"];
  type: Database["public"]["Enums"]["agent_type"];
  verified: boolean;
  /**
   * Where they stand on the verification ladder, 0 to 4.
   *
   * Carried on the identity rather than fetched where it is needed, because the
   * agents row is already being read here and one more column on a query that
   * runs on every workspace page beats a second round trip on one of them.
   * `private.agent_tier` owns the arithmetic; this is only the answer.
   */
  verificationTier: number;
};

export type AgentContext =
  | { state: "unconfigured" }
  | { state: "signed-out" }
  | { state: "not-agent"; supabase: SupabaseClient<Database>; user: User }
  | {
      state: "agent";
      supabase: SupabaseClient<Database>;
      user: User;
      agent: AgentIdentity;
    };

/**
 * Who is asking, and are they an approved agent?
 *
 * listings.agent_id points at public.agents, never at the auth user, so every
 * path through this feature starts by walking agents.user_id = auth.uid().
 */
export async function getAgentContext(): Promise<AgentContext> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return { state: "unconfigured" };
  if (session.state === "signed-out") return { state: "signed-out" };

  const { data, error } = await session.supabase
    .from("agents")
    .select("id, display_name, status, type, verified, verification_tier")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (error || !data) {
    return { state: "not-agent", supabase: session.supabase, user: session.user };
  }

  return {
    state: "agent",
    supabase: session.supabase,
    user: session.user,
    agent: {
      id: data.id,
      displayName: data.display_name,
      status: data.status,
      type: data.type,
      verified: data.verified,
      verificationTier: data.verification_tier ?? 0,
    },
  };
}

/**
 * The rail's identity card, built from the real agents row rather than seed
 * content, so a signed-in agent sees their own name in the workspace chrome.
 */
export function agentProfileFrom(agent: AgentIdentity): AgentProfile {
  return {
    id: agent.id,
    displayName: agent.displayName,
    status: agent.status,
    type: agent.type,
    verified: agent.verified,
  };
}

/** Public URL for an object in the world-readable listing-photos bucket. */
export function photoPublicUrl(storagePath: string): string {
  const base = SUPABASE_URL.replace(/\/+$/, "");
  return `${base}/storage/v1/object/public/${PHOTO_BUCKET}/${storagePath}`;
}

/* --------------------------------------------------------- listing shapes */

export type ListingPhoto = { id: string; path: string; url: string; position: number };

/** One card in the agent's workspace. Money stays integer kobo. */
export type ListingSummary = {
  id: string;
  title: string;
  status: ListingStatus;
  propertyType: PropertyType;
  pricePeriod: "night" | "year";
  priceMinor: number;
  city: string | null;
  area: string | null;
  photoCount: number;
  coverUrl: string | null;
  updatedAt: string;
  submittedAt: string | null;
  reviewNotes: string | null;
};

/** Everything the wizard needs to reopen a draft exactly as it was left. */
export type WizardDraft = {
  id: string;
  status: ListingStatus;
  title: string;
  description: string;
  propertyType: PropertyType | null;
  stateCode: string;
  city: string;
  area: string;
  address: string;
  landmark: string;
  maxGuests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  priceNaira: string;
  cleaningNaira: string;
  minStayNights: number;
  instantBook: boolean;
  powerGrid: PowerGrid | "";
  powerBackup: PowerBackup | "";
  powerBackupHours: string;
  waterSupply: WaterSupply | "";
  prepaidMeter: boolean;
  /** Never public. Read from public.listing_access, which only the host,
      an admin and a guest with a CONFIRMED booking may select from. */
  access: {
    estateName: string;
    gateDirections: string;
    securityPhone: string;
    accessCode: string;
  };
  amenityCodes: string[];
  photos: ListingPhoto[];
  reviewNotes: string | null;
};

const LISTING_SELECT =
  "id, title, description, status, property_type, price_period, price_per_night_minor, " +
  "cleaning_fee_minor, min_stay_nights, instant_book, state_code, city, area, address, " +
  "landmark, max_guests, bedrooms, beds, bathrooms, submitted_at, review_notes, updated_at, " +
  "power_grid, power_backup, power_backup_hours, water_supply, prepaid_meter, " +
  "listing_photos(id, storage_path, position), listing_amenities(amenities(code)), " +
  "listing_access(estate_name, gate_directions, security_phone, access_code)";

type ListingWithChildren = {
  id: string;
  title: string;
  description: string | null;
  status: ListingStatus;
  property_type: PropertyType;
  price_period: "night" | "year";
  price_per_night_minor: number;
  cleaning_fee_minor: number;
  min_stay_nights: number;
  instant_book: boolean;
  state_code: string | null;
  city: string | null;
  area: string | null;
  address: string | null;
  landmark: string | null;
  max_guests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  submitted_at: string | null;
  review_notes: string | null;
  updated_at: string;
  power_grid: PowerGrid | null;
  power_backup: PowerBackup | null;
  power_backup_hours: number | null;
  water_supply: WaterSupply | null;
  prepaid_meter: boolean | null;
  listing_photos: { id: string; storage_path: string; position: number }[] | null;
  listing_amenities: { amenities: { code: string } | null }[] | null;
  /* One row or none. PostgREST returns an object for a one-to-one embed and
     null when the row does not exist, so both shapes are handled. */
  listing_access:
    | {
        estate_name: string | null;
        gate_directions: string | null;
        security_phone: string | null;
        access_code: string | null;
      }
    | null;
};

function sortedPhotos(row: ListingWithChildren): ListingPhoto[] {
  return [...(row.listing_photos ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((p) => ({
      id: p.id,
      path: p.storage_path,
      url: photoPublicUrl(p.storage_path),
      position: p.position,
    }));
}

function amenityCodesOf(row: ListingWithChildren): string[] {
  return (row.listing_amenities ?? [])
    .map((join) => join.amenities?.code)
    .filter((code): code is string => typeof code === "string");
}

function toSummary(row: ListingWithChildren): ListingSummary {
  const photos = sortedPhotos(row);
  const cover = photos[0];
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    propertyType: row.property_type,
    pricePeriod: row.price_period,
    priceMinor: row.price_per_night_minor,
    city: row.city,
    area: row.area,
    photoCount: photos.length,
    coverUrl: cover ? cover.url : null,
    updatedAt: row.updated_at,
    submittedAt: row.submitted_at,
    reviewNotes: row.review_notes,
  };
}

function toDraft(row: ListingWithChildren): WizardDraft {
  return {
    id: row.id,
    status: row.status,
    title: row.title,
    description: row.description ?? "",
    propertyType: row.property_type,
    stateCode: row.state_code ?? "",
    city: row.city ?? "",
    area: row.area ?? "",
    address: row.address ?? "",
    landmark: row.landmark ?? "",
    maxGuests: row.max_guests,
    bedrooms: row.bedrooms,
    beds: row.beds,
    bathrooms: row.bathrooms,
    priceNaira: koboToNairaInput(row.price_per_night_minor),
    cleaningNaira: koboToNairaInput(row.cleaning_fee_minor),
    minStayNights: row.min_stay_nights,
    instantBook: row.instant_book,
    powerGrid: row.power_grid ?? "",
    powerBackup: row.power_backup ?? "",
    powerBackupHours: row.power_backup_hours === null ? "" : String(row.power_backup_hours),
    waterSupply: row.water_supply ?? "",
    prepaidMeter: row.prepaid_meter ?? false,
    access: {
      estateName: row.listing_access?.estate_name ?? "",
      gateDirections: row.listing_access?.gate_directions ?? "",
      securityPhone: row.listing_access?.security_phone ?? "",
      accessCode: row.listing_access?.access_code ?? "",
    },
    amenityCodes: amenityCodesOf(row),
    photos: sortedPhotos(row),
    reviewNotes: row.review_notes,
  };
}

/** Every listing the agent owns, newest activity first, all statuses. */
export async function readMyListings(
  supabase: SupabaseClient<Database>,
  agentId: string,
): Promise<ListingSummary[]> {
  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("agent_id", agentId)
    .order("updated_at", { ascending: false });

  if (error || !data) return [];
  return (data as unknown as ListingWithChildren[]).map(toSummary);
}

/** One listing, fully hydrated for the wizard. Null when it is not theirs. */
export async function readDraft(
  supabase: SupabaseClient<Database>,
  agentId: string,
  listingId: string,
): Promise<WizardDraft | null> {
  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("id", listingId)
    .eq("agent_id", agentId)
    .maybeSingle();

  if (error || !data) return null;
  return toDraft(data as unknown as ListingWithChildren);
}

/**
 * The draft a host would expect to walk back into, or null.
 *
 * The wizard already saved everything: the row, the photos, the amenities and
 * the gate details all went to Postgres on every step change. What it could not
 * do was find that work again. Opening /agent/list with no `?id=` handed the
 * wizard a blank draft, and the next autosave INSERTED a second listings row,
 * because the id lived only in the state of a page that had been closed. A host
 * who typed a title in the taxi, put the phone down, and opened the app again
 * that evening was looking at an empty form with their four uploaded photos
 * attached to a listing they had no way to see, and their honest reading of
 * that screen is that the platform lost their work.
 *
 * DRAFT only, deliberately. MORE_INFO_REQUIRED and REJECTED are also editable,
 * but both mean a reviewer has said something, and the workspace groups them
 * under "Needs your attention" with that note attached. Dropping somebody
 * straight into one of those without the reviewer's sentence in front of them
 * would answer a question they did not ask.
 *
 * Most recently touched first, because with several drafts open the one a host
 * means is the one they were last in.
 */
export async function readOpenDraft(
  supabase: SupabaseClient<Database>,
  agentId: string,
): Promise<WizardDraft | null> {
  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("agent_id", agentId)
    .eq("status", "DRAFT")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return toDraft(data as unknown as ListingWithChildren);
}

/* ------------------------------------------------------- reference data */

/** The 37 states for the location select, names from the platform. */
export async function readStates(
  supabase: SupabaseClient<Database>,
): Promise<{ code: string; name: string }[]> {
  const { data, error } = await supabase.from("states").select("code, name").order("name");
  if (error || !data) return [];
  return data;
}

/** The seeded amenity chips. Falls back to the canonical list on any error. */
export async function readAmenities(
  supabase: SupabaseClient<Database>,
): Promise<{ code: string; label: string }[]> {
  const { data, error } = await supabase.from("amenities").select("code, label").order("label");
  if (error || !data || data.length === 0) return AMENITY_CHOICES;
  return data;
}

/* --------------------------------------------------------- dashboard */

export type AgentBookingRow = {
  id: string;
  listingTitle: string;
  checkIn: string;
  checkOut: string;
  totalMinor: number;
  status: Database["public"]["Enums"]["booking_status"];
};

export type AgentNumbers = {
  byStatus: Record<ListingStatus, number>;
  totalListings: number;
  liveListings: number;
  inReview: number;
  drafts: number;
  upcomingBookings: AgentBookingRow[];
  upcomingBookingCount: number;
  unreadMessages: number;
};

const EMPTY_STATUS_COUNTS: Record<ListingStatus, number> = {
  DRAFT: 0,
  SUBMITTED: 0,
  UNDER_REVIEW: 0,
  MORE_INFO_REQUIRED: 0,
  APPROVED: 0,
  PUBLISHED: 0,
  REJECTED: 0,
  SUSPENDED: 0,
};

/** Today in Lagos as an ISO date, so "upcoming" means the same to everyone. */
function lagosToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(new Date());
}

/**
 * The agent's real numbers: listings by status, their next stays, and how many
 * guest messages are still waiting on a reply. Each read is independent, so a
 * single failing query degrades one number rather than the whole dashboard.
 */
export async function readAgentNumbers(
  supabase: SupabaseClient<Database>,
  agentId: string,
  userId: string,
): Promise<AgentNumbers> {
  const today = lagosToday();

  const [statusRes, bookingRes, conversationRes] = await Promise.all([
    supabase.from("listings").select("status").eq("agent_id", agentId),
    supabase
      .from("bookings")
      .select("id, check_in, check_out, total_minor, status, listings!inner(title, agent_id)")
      .eq("listings.agent_id", agentId)
      .gte("check_out", today)
      .in("status", ["PENDING", "CONFIRMED"])
      .order("check_in", { ascending: true })
      .limit(6),
    supabase.from("conversations").select("id").eq("agent_id", userId),
  ]);

  const byStatus: Record<ListingStatus, number> = { ...EMPTY_STATUS_COUNTS };
  for (const row of statusRes.data ?? []) {
    byStatus[row.status] += 1;
  }

  const bookings = (bookingRes.data ?? []) as unknown as {
    id: string;
    check_in: string;
    check_out: string;
    total_minor: number;
    status: Database["public"]["Enums"]["booking_status"];
    listings: { title: string } | null;
  }[];

  const upcomingBookings: AgentBookingRow[] = bookings.map((b) => ({
    id: b.id,
    listingTitle: b.listings?.title ?? "Your listing",
    checkIn: b.check_in,
    checkOut: b.check_out,
    totalMinor: b.total_minor,
    status: b.status,
  }));

  let unreadMessages = 0;
  const conversationIds = (conversationRes.data ?? []).map((c) => c.id);
  if (conversationIds.length > 0) {
    const { count } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .in("conversation_id", conversationIds)
      .is("read_at", null)
      .neq("sender_id", userId);
    unreadMessages = count ?? 0;
  }

  const totalListings = Object.values(byStatus).reduce((sum, n) => sum + n, 0);

  return {
    byStatus,
    totalListings,
    liveListings: byStatus.PUBLISHED + byStatus.APPROVED,
    inReview: byStatus.SUBMITTED + byStatus.UNDER_REVIEW,
    drafts: byStatus.DRAFT + byStatus.MORE_INFO_REQUIRED,
    upcomingBookings,
    upcomingBookingCount: upcomingBookings.length,
    unreadMessages,
  };
}

/* ------------------------------------------------------------- labels */

// The status label and tone tables live in listings-schema, which carries no
// server-only import, because the workspace renders them from a client
// component. Re-exported here so server callers keep one import site.
export { STATUS_LABEL, STATUS_TONE } from "./listings-schema";
