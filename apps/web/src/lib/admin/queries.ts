import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "../supabase/admin";
import type { Database } from "../supabase/database.types";
import { requireAdmin } from "./guard";
import {
  PERIOD_SUFFIX,
  headlinePeriod,
  headlinePrice,
  moveInParts,
  moveInTotal,
  type MoveInPart,
  type PricePeriod,
} from "../listings/pricing";

/**
 * The console's read layer.
 *
 * Reads run through the service-role client, but only ever after requireAdmin
 * has passed inside this very module, so there is no path where a caller can
 * borrow the privileged client by forgetting a check. Every function returns
 * either data or an explicit "unavailable", never a silently empty list: an
 * empty queue and an unreachable database look identical on screen otherwise,
 * and a queue that claims to be clear when it is not is the one lie an
 * operations surface cannot afford.
 */
export type AdminRead<T> = { state: "ok"; data: T } | { state: "unavailable" };

const UNAVAILABLE = { state: "unavailable" } as const;

async function adminClient(): Promise<SupabaseClient<Database> | null> {
  const access = await requireAdmin();
  if (access.state !== "admin") return null;
  try {
    return createAdminClient();
  } catch {
    return null;
  }
}

/** ------------------------------------------------------------ queue counts */

export type QueueCounts = {
  flags: number;
  alerts: number;
  applications: number;
  listings: number;
  reports: number;
  tickets: number;
  /**
   * Everything the safety scan is holding: posts, stories, story comments and
   * bios, in one number. Four tables, because four things can be held, and one
   * tile, because clearing them is one job.
   */
  moderation: number;
};

export async function getQueueCounts(): Promise<AdminRead<QueueCounts>> {
  const admin = await adminClient();
  if (!admin) return UNAVAILABLE;

  try {
    const [
      flags,
      alerts,
      applications,
      listings,
      reports,
      tickets,
      heldPosts,
      heldStories,
      heldComments,
      heldBios,
    ] = await Promise.all([
      admin.from("message_flags").select("id", { count: "exact", head: true }).eq("status", "open"),
      admin.from("risk_alerts").select("id", { count: "exact", head: true }).eq("status", "open"),
      admin
        .from("agent_applications")
        .select("id", { count: "exact", head: true })
        .in("status", ["SUBMITTED", "UNDER_REVIEW"]),
      admin
        .from("listings")
        .select("id", { count: "exact", head: true })
        .in("status", ["SUBMITTED", "UNDER_REVIEW", "APPROVED"]),
      admin
        .from("reports")
        .select("id", { count: "exact", head: true })
        .in("status", ["open", "reviewing"]),
      admin
        .from("support_tickets")
        .select("id", { count: "exact", head: true })
        .in("status", ["open", "pending"]),
      admin.from("posts").select("id", { count: "exact", head: true }).eq("status", "HELD"),
      admin.from("stories").select("id", { count: "exact", head: true }).eq("status", "HELD"),
      admin
        .from("story_comments")
        .select("id", { count: "exact", head: true })
        .eq("status", "HELD"),
      admin
        .from("social_profiles")
        .select("user_id", { count: "exact", head: true })
        .eq("bio_status", "HELD"),
    ]);

    return {
      state: "ok",
      data: {
        flags: flags.count ?? 0,
        alerts: alerts.count ?? 0,
        applications: applications.count ?? 0,
        listings: listings.count ?? 0,
        reports: reports.count ?? 0,
        tickets: tickets.count ?? 0,
        moderation:
          (heldPosts.count ?? 0) +
          (heldStories.count ?? 0) +
          (heldComments.count ?? 0) +
          (heldBios.count ?? 0),
      },
    };
  } catch {
    return UNAVAILABLE;
  }
}

/** ------------------------------------------------------------ message flags */

export type PartyRole = "guest" | "agent" | "unknown";

export type FlagContextLine = {
  id: string;
  body: string;
  role: PartyRole;
  createdAt: string;
  flagged: boolean;
};

export type FlagView = {
  id: string;
  reason: Database["public"]["Enums"]["message_flag_reason"];
  matched: string;
  status: Database["public"]["Enums"]["message_flag_status"];
  createdAt: string;
  messageId: string;
  conversationId: string;
  senderRole: PartyRole;
  body: string;
  context: FlagContextLine[];
};

export async function getMessageFlags(): Promise<AdminRead<FlagView[]>> {
  const admin = await adminClient();
  if (!admin) return UNAVAILABLE;

  try {
    const { data, error } = await admin
      .from("message_flags")
      .select(
        "id, reason, matched, status, created_at, message_id, messages ( id, body, sender_id, conversation_id, created_at )",
      )
      .order("created_at", { ascending: false })
      .limit(40);
    if (error) return UNAVAILABLE;

    const rows = (data ?? []).filter((row) => row.messages !== null);
    if (rows.length === 0) return { state: "ok", data: [] };

    const conversationIds = [...new Set(rows.map((row) => row.messages!.conversation_id))];

    const [{ data: parties }, { data: lines }] = await Promise.all([
      admin.from("conversations").select("id, guest_id, agent_id").in("id", conversationIds),
      admin
        .from("messages")
        .select("id, conversation_id, sender_id, body, created_at")
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: true })
        .limit(400),
    ]);

    const roleOf = new Map<string, { guest: string; agent: string }>();
    for (const party of parties ?? []) {
      roleOf.set(party.id, { guest: party.guest_id, agent: party.agent_id });
    }

    const role = (conversationId: string, senderId: string): PartyRole => {
      const pair = roleOf.get(conversationId);
      if (!pair) return "unknown";
      if (pair.guest === senderId) return "guest";
      if (pair.agent === senderId) return "agent";
      return "unknown";
    };

    const byConversation = new Map<string, typeof lines>();
    for (const line of lines ?? []) {
      const bucket = byConversation.get(line.conversation_id) ?? [];
      bucket.push(line);
      byConversation.set(line.conversation_id, bucket);
    }

    const views: FlagView[] = rows.map((row) => {
      const message = row.messages!;
      const thread = byConversation.get(message.conversation_id) ?? [];
      const index = thread.findIndex((line) => line.id === message.id);
      // Three lines of run-up plus the flagged line itself: enough to read the
      // intent without turning the queue into a full inbox.
      const slice = index >= 0 ? thread.slice(Math.max(0, index - 3), index + 1) : [];

      return {
        id: row.id,
        reason: row.reason,
        matched: row.matched,
        status: row.status,
        createdAt: row.created_at,
        messageId: message.id,
        conversationId: message.conversation_id,
        senderRole: role(message.conversation_id, message.sender_id),
        body: message.body,
        context: slice.map((line) => ({
          id: line.id,
          body: line.body,
          role: role(line.conversation_id, line.sender_id),
          createdAt: line.created_at,
          flagged: line.id === message.id,
        })),
      };
    });

    return { state: "ok", data: views };
  } catch {
    return UNAVAILABLE;
  }
}

/** -------------------------------------------------------------- risk alerts */

export type AlertView = {
  id: string;
  severity: Database["public"]["Enums"]["alert_severity"];
  status: Database["public"]["Enums"]["alert_status"];
  title: string;
  description: string | null;
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
  resolvedAt: string | null;
  /**
   * The name of the admin who closed it, null while the alert is open and null
   * again only if that account has since been deleted. A resolved row that
   * cannot say who resolved it is how accountability quietly disappears.
   */
  resolvedByName: string | null;
};

export async function getRiskAlerts(): Promise<AdminRead<AlertView[]>> {
  const admin = await adminClient();
  if (!admin) return UNAVAILABLE;

  try {
    const { data, error } = await admin
      .from("risk_alerts")
      .select(
        "id, severity, status, title, description, entity_type, entity_id, created_at, resolved_at, resolved_by",
      )
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return UNAVAILABLE;

    const rows = data ?? [];

    // One extra read for every distinct resolver, not one per row. The list is
    // capped at fifty, so this is at most one small IN query.
    const resolverIds = [
      ...new Set(rows.map((row) => row.resolved_by).filter((id): id is string => Boolean(id))),
    ];
    const resolvers = new Map<string, string>();
    if (resolverIds.length > 0) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, display_name")
        .in("id", resolverIds);
      for (const profile of profiles ?? []) {
        if (profile.display_name) resolvers.set(profile.id, profile.display_name);
      }
    }

    return {
      state: "ok",
      data: rows.map((row) => ({
        id: row.id,
        severity: row.severity,
        status: row.status,
        title: row.title,
        description: row.description,
        entityType: row.entity_type,
        entityId: row.entity_id,
        createdAt: row.created_at,
        resolvedAt: row.resolved_at,
        resolvedByName: row.resolved_by ? (resolvers.get(row.resolved_by) ?? null) : null,
      })),
    };
  } catch {
    return UNAVAILABLE;
  }
}

/** ------------------------------------------------------------------ reports */

export type ReportView = {
  id: string;
  reporterName: string;
  targetType: string;
  targetId: string;
  /**
   * The structured triage signal, or null on a row written before categories
   * existed. Free text is what the reporter said; this is what they said it
   * was, and it is what makes the queue sortable.
   */
  category: string | null;
  reason: string;
  status: Database["public"]["Enums"]["report_status"];
  createdAt: string;
  resolvedAt: string | null;
  /** The admin who last moved it, so a closed report is somebody's decision. */
  resolvedByName: string | null;
};

export async function getReports(): Promise<AdminRead<ReportView[]>> {
  const admin = await adminClient();
  if (!admin) return UNAVAILABLE;

  try {
    const { data, error } = await admin
      .from("reports")
      .select(
        "id, reporter_id, target_type, target_id, category, reason, status, created_at, resolved_at, resolved_by",
      )
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return UNAVAILABLE;

    const rows = data ?? [];
    // Reporters and resolvers in one read: both are display names off the same
    // table, and two round trips for one map would be two round trips wasted.
    const peopleIds = [
      ...new Set(
        rows
          .flatMap((row) => [row.reporter_id, row.resolved_by])
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const names = new Map<string, string>();
    if (peopleIds.length > 0) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, display_name")
        .in("id", peopleIds);
      for (const profile of profiles ?? []) {
        if (profile.display_name) names.set(profile.id, profile.display_name);
      }
    }

    return {
      state: "ok",
      data: rows.map((row) => ({
        id: row.id,
        reporterName: names.get(row.reporter_id) ?? "A Vallo member",
        targetType: row.target_type,
        targetId: row.target_id,
        category: row.category,
        reason: row.reason,
        status: row.status,
        createdAt: row.created_at,
        resolvedAt: row.resolved_at,
        resolvedByName: row.resolved_by ? (names.get(row.resolved_by) ?? null) : null,
      })),
    };
  } catch {
    return UNAVAILABLE;
  }
}

/** ------------------------------------------------------- agent applications */

export type ApplicationView = {
  id: string;
  reference: string;
  status: Database["public"]["Enums"]["agent_application_status"];
  type: Database["public"]["Enums"]["agent_type"];
  fullName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  stateCode: string | null;
  city: string | null;
  idType: string | null;
  idNumber: string | null;
  businessName: string | null;
  businessRc: string | null;
  bankName: string | null;
  accountNumber: string | null;
  accountName: string | null;
  agreedTerms: boolean;
  documentCount: number;
  /**
   * The uploaded documents, each with a short-lived signed URL.
   *
   * The bucket is private, so there is no public URL to fall back on and a
   * reviewer who cannot open the file cannot do the job. `url` is null when the
   * signature could not be minted, which the console says out loud rather than
   * rendering a link that leads nowhere.
   */
  documents: { id: string; kind: string; url: string | null }[];
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
};

const APPLICATION_COLUMNS =
  "id, reference, status, type, full_name, phone, email, residential_address, state_code, city, id_type, id_number, business_name, business_rc, bank_name, account_number, account_name, agree_terms, submitted_at, reviewed_at, review_notes, created_at, agent_documents ( id, kind, storage_path )";

type ApplicationRow = {
  id: string;
  reference: string;
  status: Database["public"]["Enums"]["agent_application_status"];
  type: Database["public"]["Enums"]["agent_type"];
  full_name: string | null;
  phone: string | null;
  email: string | null;
  residential_address: string | null;
  state_code: string | null;
  city: string | null;
  id_type: string | null;
  id_number: string | null;
  business_name: string | null;
  business_rc: string | null;
  bank_name: string | null;
  account_number: string | null;
  account_name: string | null;
  agree_terms: boolean;
  submitted_at: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  agent_documents: { id: string; kind: string; storage_path: string }[];
};

/** How long a reviewer's link to an identity document stays valid. */
const DOCUMENT_URL_TTL_SECONDS = 600;

/**
 * Mint one signed URL per uploaded document.
 *
 * These objects are identity documents in a private bucket, so they are never
 * linked directly and never handed a long life. Ten minutes is enough to open
 * one during a review and short enough that a copied console URL is worthless
 * soon after. A failure yields a null url rather than an exception, because a
 * missing signature must not take the whole applications queue down.
 */
async function signDocuments(
  admin: SupabaseClient<Database>,
  rows: { id: string; kind: string; storage_path: string }[],
): Promise<ApplicationView["documents"]> {
  if (rows.length === 0) return [];
  try {
    const { data } = await admin.storage
      .from("agent-documents")
      .createSignedUrls(
        rows.map((r) => r.storage_path),
        DOCUMENT_URL_TTL_SECONDS,
      );
    return rows.map((row, index) => ({
      id: row.id,
      kind: row.kind,
      url: data?.[index]?.signedUrl ?? null,
    }));
  } catch {
    return rows.map((row) => ({ id: row.id, kind: row.kind, url: null }));
  }
}

function toApplicationView(
  row: ApplicationRow,
  documents: ApplicationView["documents"] = [],
): ApplicationView {
  return {
    documents,
    id: row.id,
    reference: row.reference,
    status: row.status,
    type: row.type,
    fullName: row.full_name,
    phone: row.phone,
    email: row.email,
    address: row.residential_address,
    stateCode: row.state_code,
    city: row.city,
    idType: row.id_type,
    idNumber: row.id_number,
    businessName: row.business_name,
    businessRc: row.business_rc,
    bankName: row.bank_name,
    accountNumber: row.account_number,
    accountName: row.account_name,
    agreedTerms: row.agree_terms,
    documentCount: row.agent_documents.length,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
    reviewNotes: row.review_notes,
    createdAt: row.created_at,
  };
}

export type ApplicationQueue = { waiting: ApplicationView[]; decided: ApplicationView[] };

export async function getAgentApplications(): Promise<AdminRead<ApplicationQueue>> {
  const admin = await adminClient();
  if (!admin) return UNAVAILABLE;

  try {
    const [waiting, decided] = await Promise.all([
      admin
        .from("agent_applications")
        .select(APPLICATION_COLUMNS)
        .in("status", ["SUBMITTED", "UNDER_REVIEW", "MORE_INFO_REQUIRED"])
        .order("submitted_at", { ascending: false, nullsFirst: false })
        .limit(30),
      admin
        .from("agent_applications")
        .select(APPLICATION_COLUMNS)
        .in("status", ["APPROVED", "REJECTED", "SUSPENDED"])
        .order("reviewed_at", { ascending: false, nullsFirst: false })
        .limit(10),
    ]);
    if (waiting.error || decided.error) return UNAVAILABLE;

    // Signed one application at a time, so a single unreadable object cannot
    // blank the documents on every other application in the queue.
    const withDocuments = async (rows: ApplicationRow[]): Promise<ApplicationView[]> =>
      Promise.all(
        rows.map(async (row) => toApplicationView(row, await signDocuments(admin, row.agent_documents))),
      );

    return {
      state: "ok",
      data: {
        waiting: await withDocuments(waiting.data ?? []),
        decided: await withDocuments(decided.data ?? []),
      },
    };
  } catch {
    return UNAVAILABLE;
  }
}

/** ----------------------------------------------------------------- listings */

export type QualityCheck = { label: string; pass: boolean; detail: string };

export type ListingReviewView = {
  id: string;
  title: string;
  status: Database["public"]["Enums"]["listing_status"];
  propertyType: Database["public"]["Enums"]["property_type"];
  /** To let, or for sale. Decides which money block the reviewer is shown. */
  intent: Database["public"]["Enums"]["listing_intent"];
  /** The unit the headline figure is quoted in, or "sale" for an asking price. */
  pricePeriod: PricePeriod | "sale";
  priceMinor: number;
  /** The rent breakdown, present only on a tenancy that stated any of it. */
  moveIn: { parts: MoveInPart[]; totalMinor: number; totalStated: boolean } | null;
  /** The title being transferred, present only on a sale. */
  tenure: Database["public"]["Enums"]["land_tenure"] | null;
  saleStatus: Database["public"]["Enums"]["sale_status"] | null;
  city: string | null;
  area: string | null;
  stateCode: string | null;
  address: string | null;
  description: string | null;
  bedrooms: number;
  bathrooms: number;
  agentName: string | null;
  photos: string[];
  amenityCount: number;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
  checks: QualityCheck[];
};

const LISTING_COLUMNS =
  "id, title, status, property_type, listing_intent, rent_amount_minor, rent_period, rate_minor, rate_period, sale_price_minor, tenure, sale_status, caution_deposit_minor, service_charge_minor, service_charge_period, agency_fee_minor, legal_fee_minor, agreement_fee_minor, total_move_in_cost_minor, city, area, state_code, address, description, bedrooms, bathrooms, submitted_at, reviewed_at, review_notes, created_at, agents ( display_name ), listing_photos ( storage_path, position ), listing_amenities ( amenity_id )";

type ListingRow = {
  id: string;
  title: string;
  status: Database["public"]["Enums"]["listing_status"];
  property_type: Database["public"]["Enums"]["property_type"];
  listing_intent: Database["public"]["Enums"]["listing_intent"];
  rent_amount_minor: number | null;
  rent_period: Database["public"]["Enums"]["rent_period"] | null;
  rate_minor: number;
  rate_period: Database["public"]["Enums"]["rate_period"] | null;
  sale_price_minor: number | null;
  tenure: Database["public"]["Enums"]["land_tenure"] | null;
  sale_status: Database["public"]["Enums"]["sale_status"] | null;
  caution_deposit_minor: number | null;
  service_charge_minor: number | null;
  service_charge_period: Database["public"]["Enums"]["rent_period"] | null;
  agency_fee_minor: number | null;
  legal_fee_minor: number | null;
  agreement_fee_minor: number | null;
  total_move_in_cost_minor: number | null;
  city: string | null;
  area: string | null;
  state_code: string | null;
  address: string | null;
  description: string | null;
  bedrooms: number;
  bathrooms: number;
  submitted_at: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  agents: { display_name: string } | null;
  listing_photos: { storage_path: string; position: number }[];
  listing_amenities: { amenity_id: string }[];
};

const SMALL_WORDS = new Set([
  "a", "an", "and", "at", "by", "for", "in", "of", "on", "or", "the", "to", "with",
]);

/** Does the title read as title case, ignoring the small words style allows? */
function isTitleCase(title: string): boolean {
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return false;
  return words.every((word, index) => {
    const first = word[0];
    if (!first) return false;
    if (index > 0 && SMALL_WORDS.has(word.toLowerCase())) return true;
    return first === first.toUpperCase();
  });
}

const CONTACT_PATTERN = /\d{10}|(?:payment|transfer|pay me|account number|acct|bank)/i;

/**
 * The admission checklist from HYBRID_INVENTORY section 5, computed rather than
 * recited: the reviewer sees which lines the submission actually passes before
 * they decide. Nothing here blocks a decision; it informs one.
 */
function qualityChecks(row: ListingRow): QualityCheck[] {
  const photoCount = row.listing_photos.length;
  const hasCover = row.listing_photos.some((photo) => photo.position === 0);
  const words = (row.description ?? "").trim().split(/\s+/).filter(Boolean).length;
  const text = `${row.title} ${row.description ?? ""}`;

  return [
    {
      label: "Four photos or more",
      pass: photoCount >= 4,
      detail: `${photoCount} uploaded`,
    },
    {
      label: "Cover photo set",
      pass: hasCover,
      detail: hasCover ? "First photo is the cover" : "No photo in the cover position",
    },
    {
      label: "Title in title case",
      pass: isTitleCase(row.title),
      detail: row.title,
    },
    {
      label: "Area and city recorded",
      pass: Boolean(row.area) && Boolean(row.city),
      detail: [row.area, row.city].filter(Boolean).join(", ") || "Not given",
    },
    {
      /* Three markets, one line. A sale passes on an asking price, a tenancy on
         a rent, a shortlet on a nightly rate, and the detail says which of the
         three the reviewer is looking at so they can tell a 4.5m yearly rent
         from a 4.5m asking price at a glance. */
      label: row.listing_intent === "sale" ? "Asking price recorded" : "Price recorded in naira",
      pass: headlinePrice(row).minor > 0,
      detail: PERIOD_SUFFIX[headlinePeriod(headlinePrice(row))],
    },
    {
      label: "Title deed stated",
      pass: row.listing_intent !== "sale" || row.tenure !== null,
      detail:
        row.listing_intent !== "sale"
          ? "Not asked of a listing to let"
          : (row.tenure ?? "Not stated"),
    },
    {
      label: "Bedrooms and bathrooms recorded",
      pass: row.bathrooms > 0,
      detail: `${row.bedrooms} bedrooms, ${row.bathrooms} bathrooms`,
    },
    {
      label: "Amenities chosen",
      pass: row.listing_amenities.length > 0,
      detail: `${row.listing_amenities.length} selected`,
    },
    {
      label: "Description of 40 words or more",
      pass: words >= 40,
      detail: `${words} words`,
    },
    {
      label: "No contact or payment details in the text",
      pass: !CONTACT_PATTERN.test(text),
      detail: CONTACT_PATTERN.test(text)
        ? "The trust scanner matched something in the title or description"
        : "Clean",
    },
  ];
}

function photoUrl(admin: SupabaseClient<Database>, path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return admin.storage.from("listing-photos").getPublicUrl(path).data.publicUrl;
}

function toListingView(admin: SupabaseClient<Database>, row: ListingRow): ListingReviewView {
  const headline = headlinePrice(row);
  const parts = moveInParts(row);
  const total = moveInTotal(row);
  const photos = [...row.listing_photos]
    .sort((a, b) => a.position - b.position)
    .map((photo) => photoUrl(admin, photo.storage_path));

  return {
    id: row.id,
    title: row.title,
    status: row.status,
    propertyType: row.property_type,
    intent: row.listing_intent,
    pricePeriod: headlinePeriod(headline),
    priceMinor: headline.minor,
    moveIn:
      row.listing_intent === "sale" || parts.length === 0
        ? null
        : { parts, totalMinor: total.minor, totalStated: total.stated },
    tenure: row.tenure,
    saleStatus: row.sale_status,
    city: row.city,
    area: row.area,
    stateCode: row.state_code,
    address: row.address,
    description: row.description,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    agentName: row.agents?.display_name ?? null,
    photos,
    amenityCount: row.listing_amenities.length,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
    reviewNotes: row.review_notes,
    createdAt: row.created_at,
    checks: qualityChecks(row),
  };
}

export type ListingQueue = { waiting: ListingReviewView[]; decided: ListingReviewView[] };

export async function getListingSubmissions(): Promise<AdminRead<ListingQueue>> {
  const admin = await adminClient();
  if (!admin) return UNAVAILABLE;

  try {
    const [waiting, decided] = await Promise.all([
      admin
        .from("listings")
        .select(LISTING_COLUMNS)
        .in("status", ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "MORE_INFO_REQUIRED"])
        .order("submitted_at", { ascending: false, nullsFirst: false })
        .limit(30),
      admin
        .from("listings")
        .select(LISTING_COLUMNS)
        .in("status", ["PUBLISHED", "REJECTED", "SUSPENDED"])
        .order("reviewed_at", { ascending: false, nullsFirst: false })
        .limit(10),
    ]);
    if (waiting.error || decided.error) return UNAVAILABLE;

    return {
      state: "ok",
      data: {
        waiting: (waiting.data ?? []).map((row) => toListingView(admin, row)),
        decided: (decided.data ?? []).map((row) => toListingView(admin, row)),
      },
    };
  } catch {
    return UNAVAILABLE;
  }
}

/** ---------------------------------------------------------- support tickets */

export type TicketMessageView = {
  id: string;
  senderRole: string;
  body: string;
  createdAt: string;
};

export type TicketView = {
  id: string;
  reference: string;
  name: string;
  email: string;
  topic: string | null;
  body: string;
  status: Database["public"]["Enums"]["support_ticket_status"];
  hasAccount: boolean;
  createdAt: string;
  updatedAt: string;
  replyCount: number;
};

export async function getSupportTickets(): Promise<AdminRead<TicketView[]>> {
  const admin = await adminClient();
  if (!admin) return UNAVAILABLE;

  try {
    const { data, error } = await admin
      .from("support_tickets")
      .select(
        "id, reference, name, email, topic, body, status, user_id, created_at, updated_at, support_ticket_messages ( id )",
      )
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return UNAVAILABLE;

    return {
      state: "ok",
      data: (data ?? []).map((row) => ({
        id: row.id,
        reference: row.reference,
        name: row.name,
        email: row.email,
        topic: row.topic,
        body: row.body,
        status: row.status,
        hasAccount: row.user_id !== null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        replyCount: row.support_ticket_messages.length,
      })),
    };
  } catch {
    return UNAVAILABLE;
  }
}

export async function getTicketThread(
  ticketId: string,
): Promise<AdminRead<TicketMessageView[]>> {
  const admin = await adminClient();
  if (!admin) return UNAVAILABLE;

  try {
    const { data, error } = await admin
      .from("support_ticket_messages")
      .select("id, sender_role, body, created_at")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true })
      .limit(100);
    if (error) return UNAVAILABLE;

    return {
      state: "ok",
      data: (data ?? []).map((row) => ({
        id: row.id,
        senderRole: row.sender_role,
        body: row.body,
        createdAt: row.created_at,
      })),
    };
  } catch {
    return UNAVAILABLE;
  }
}

/** ------------------------------------------------------------ kill switches */

export type SwitchView = {
  key: string;
  enabled: boolean;
  note: string | null;
  updatedAt: string;
};

export async function getFeatureFlags(): Promise<AdminRead<SwitchView[]>> {
  const admin = await adminClient();
  if (!admin) return UNAVAILABLE;

  try {
    const { data, error } = await admin
      .from("feature_flags")
      .select("key, enabled, note, updated_at")
      .order("key", { ascending: true });
    if (error) return UNAVAILABLE;

    return {
      state: "ok",
      data: (data ?? []).map((row) => ({
        key: row.key,
        enabled: row.enabled,
        note: row.note,
        updatedAt: row.updated_at,
      })),
    };
  } catch {
    return UNAVAILABLE;
  }
}
