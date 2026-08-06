"use server";

/**
 * The supply loop: an agent's listings, from first typed word to review queue.
 *
 * Every export here is a public endpoint, so every one of them starts the same
 * way: resolve the session, respect the "agent_listings" flag, then resolve the
 * caller's row in public.agents. That last step is the load-bearing one.
 * listings.agent_id references public.agents(id), never the auth user id, so an
 * action that skipped it would either write nothing or write the wrong owner.
 * Whoever has no agents row gets one honest sentence and a way forward.
 *
 * Writes go through the caller's own RLS-bound client, so Postgres is the
 * authority on ownership and this file never re-implements a policy. The
 * service role is not used anywhere in this feature: an agent managing their
 * own supply needs no privilege escalation.
 *
 * submitListing runs the canonical gate from listings-schema against the STORED
 * row, its photos and its amenities. The wizard runs the same function on the
 * client to draw its checklist. The client copy is a courtesy; this one is the
 * rule, and it is the half of the photo quality gate that cannot be skipped by
 * anyone posting straight at the endpoint.
 */

import { revalidatePath } from "next/cache";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import {
  NOT_CONFIGURED_MESSAGE,
  SIGNED_OUT_MESSAGE,
  resolveSession,
} from "../actions/session";
import { isFeatureEnabled } from "../flags";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "../supabase/database.types";
import {
  PHOTO_BUCKET,
  readMyListings,
  type ListingStatus,
  type ListingSummary,
} from "./listings-queries";
import {
  GATE_SUMMARY_MESSAGE,
  MAX_PHOTOS,
  addPhotoSchema,
  draftInputSchema,
  gateFieldErrors,
  listingAccessSchema,
  listingIdSchema,
  pricePeriodFor,
  removePhotoSchema,
  reorderPhotosSchema,
  setAmenitiesSchema,
  submitRequirements,
  type DraftInput,
  type ListingAccessInput,
  type PropertyType,
} from "./listings-schema";

const NOT_AGENT_MESSAGE =
  "Only approved agents can manage listings. Apply in two minutes.";

const PAUSED_MESSAGE =
  "Listing tools are paused for a moment while we make improvements. Nothing you entered was lost.";

const NOT_FOUND_MESSAGE =
  "We could not find that listing on your account. Reload the page to see the listings you have.";

const LOCKED_MESSAGE =
  "This listing is with our review team. Return it to a draft first, then edit it.";

const SAVE_FAILED_MESSAGE =
  "We could not save this listing just now. Nothing you typed was lost. Please try again.";

const PHOTO_GONE_MESSAGE =
  "That photo is no longer on this listing. Reload the page to see the photos it has now.";

const REVIEW_PENDING_MESSAGE =
  "This listing is already with our review team. We will let you know as soon as it is decided.";

const PHOTO_FAILED_MESSAGE =
  "We could not attach that photo just now. Please try it again.";

/** Statuses an agent may still edit themselves. */
const EDITABLE: ListingStatus[] = ["DRAFT", "MORE_INFO_REQUIRED", "REJECTED"];

type AgentGate =
  | { ok: false; error: string }
  | {
      ok: true;
      supabase: SupabaseClient<Database>;
      user: User;
      agentId: string;
    };

/**
 * Session, flag and agent identity in one gate. Every action calls it first,
 * so the three failure sentences are written once and stay consistent.
 */
async function requireAgent(): Promise<AgentGate> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return { ok: false, error: NOT_CONFIGURED_MESSAGE };
  if (session.state === "signed-out") return { ok: false, error: SIGNED_OUT_MESSAGE };

  if (!(await isFeatureEnabled("agent_listings"))) {
    return { ok: false, error: PAUSED_MESSAGE };
  }

  const { data, error } = await session.supabase
    .from("agents")
    .select("id")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (error || !data) return { ok: false, error: NOT_AGENT_MESSAGE };

  return { ok: true, supabase: session.supabase, user: session.user, agentId: data.id };
}

/** Read one listing the caller owns, or null. Ownership is proven by the read. */
async function ownedListing(
  supabase: SupabaseClient<Database>,
  agentId: string,
  listingId: string,
) {
  const { data } = await supabase
    .from("listings")
    .select(
      "id, status, title, description, property_type, price_period, price_per_night_minor, state_code, city, area, bedrooms, bathrooms, max_guests",
    )
    .eq("id", listingId)
    .eq("agent_id", agentId)
    .maybeSingle();
  return data;
}

function refreshAgentSurfaces() {
  revalidatePath("/agent/listings");
  revalidatePath("/agent/list");
  revalidatePath("/agent/dashboard");
}

/* --------------------------------------------------------------- drafts */

export type SavedDraft = { id: string; status: ListingStatus };

/**
 * Save the wizard's current state as a DRAFT the agent owns.
 *
 * Insert when no id arrives, update when one does. Only the title is required,
 * because the alternative is losing a listing to an interruption. Fields the
 * wizard omits are left exactly as they were rather than being cleared, so a
 * partial save can never eat earlier work.
 */
export async function saveDraft(input: DraftInput): Promise<ActionResult<SavedDraft>> {
  const gate = await requireAgent();
  if (!gate.ok) return fail(gate.error);

  const parsed = validate(draftInputSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const value = parsed.data;

  const propertyType: PropertyType = value.propertyType ?? "apartment";
  const period = pricePeriodFor(propertyType);

  // Shared column set. Undefined keys are dropped before the request, which is
  // exactly the "leave it as it was" behaviour a forgiving draft needs.
  const columns = {
    title: value.title,
    description: value.description,
    property_type: propertyType,
    price_period: period,
    state_code: value.stateCode,
    city: value.city,
    area: value.area,
    address: value.address,
    landmark: value.landmark,
    max_guests: value.maxGuests,
    bedrooms: value.bedrooms,
    beds: value.beds,
    bathrooms: value.bathrooms,
    price_per_night_minor: value.priceNaira,
    // Rentals carry no cleaning charge and no instant book: the path is
    // message, inspect, then pay.
    cleaning_fee_minor: period === "year" ? 0 : value.cleaningNaira,
    min_stay_nights: period === "year" ? 1 : value.minStayNights,
    instant_book: period === "year" ? false : value.instantBook,

    power_grid: value.powerGrid,
    power_backup: value.powerBackup,
    // The database refuses hours against a backup that does not exist
    // (listings_backup_hours_need_backup_chk), so clearing the backup clears
    // the hours here rather than letting the write bounce with a 23514 the
    // host cannot act on.
    power_backup_hours:
      value.powerBackup === "NONE" ? null : value.powerBackupHours,
    water_supply: value.waterSupply,
    prepaid_meter: value.prepaidMeter,
  };

  if (value.id) {
    const existing = await ownedListing(gate.supabase, gate.agentId, value.id);
    if (!existing) return fail(NOT_FOUND_MESSAGE);
    if (!EDITABLE.includes(existing.status)) return fail(LOCKED_MESSAGE);

    const { error } = await gate.supabase
      .from("listings")
      .update(columns)
      .eq("id", value.id)
      .eq("agent_id", gate.agentId);
    if (error) return fail(SAVE_FAILED_MESSAGE);

    refreshAgentSurfaces();
    return ok({ id: value.id, status: existing.status });
  }

  const { data: created, error } = await gate.supabase
    .from("listings")
    .insert({ ...columns, agent_id: gate.agentId, status: "DRAFT" })
    .select("id, status")
    .single();

  if (error || !created) return fail(SAVE_FAILED_MESSAGE);

  refreshAgentSurfaces();
  return ok({ id: created.id, status: created.status });
}

/* --------------------------------------------------------------- photos */

/**
 * Attach an uploaded object to a listing.
 *
 * The browser uploads to listing-photos under `<auth uid>/<listing id>/...`,
 * which storage RLS already restricts to that user's own folder; this checks
 * the same prefix so a path pointing at somebody else's folder can never be
 * recorded. Position 0 is the cover, and the requested slot is honoured only
 * when it is free, so the unique (listing_id, position) index is never raced.
 */
export async function addPhoto(input: {
  listingId: string;
  storagePath: string;
  position?: number;
}): Promise<ActionResult<{ photoId: string; position: number }>> {
  const gate = await requireAgent();
  if (!gate.ok) return fail(gate.error);

  const parsed = validate(addPhotoSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const { listingId, storagePath, position } = parsed.data;

  if (!storagePath.startsWith(`${gate.user.id}/`)) {
    return fail(
      "That photo was not uploaded to your own folder, so we did not attach it. Choose the photo again.",
    );
  }

  const listing = await ownedListing(gate.supabase, gate.agentId, listingId);
  if (!listing) return fail(NOT_FOUND_MESSAGE);
  if (!EDITABLE.includes(listing.status)) return fail(LOCKED_MESSAGE);

  const { data: existing, error: readError } = await gate.supabase
    .from("listing_photos")
    .select("id, position")
    .eq("listing_id", listingId);
  if (readError) return fail(PHOTO_FAILED_MESSAGE);

  const taken = new Set((existing ?? []).map((p) => p.position));
  if (taken.size >= MAX_PHOTOS) {
    return fail(`A listing holds up to ${MAX_PHOTOS} photos. Remove one to add another.`);
  }

  let slot = position !== undefined && !taken.has(position) ? position : -1;
  if (slot < 0) {
    for (let i = 0; i < MAX_PHOTOS; i += 1) {
      if (!taken.has(i)) {
        slot = i;
        break;
      }
    }
  }
  if (slot < 0) {
    return fail(`A listing holds up to ${MAX_PHOTOS} photos. Remove one to add another.`);
  }

  const { data: created, error } = await gate.supabase
    .from("listing_photos")
    .insert({ listing_id: listingId, storage_path: storagePath, position: slot })
    .select("id, position")
    .single();

  if (error || !created) return fail(PHOTO_FAILED_MESSAGE);

  refreshAgentSurfaces();
  return ok({ photoId: created.id, position: created.position });
}

/**
 * Move photo rows into the given order.
 *
 * positions are unique per listing AND constrained to 0..9, so there is no
 * spare band to park rows in: the classic "add 100 then renumber" trick would
 * fail the check constraint. Instead rows are moved one at a time into slots
 * that are genuinely free, which is always possible while fewer than ten
 * photos exist. At exactly ten, one row is parked out of the table and put back
 * at the end, which is the only case where a row briefly does not exist.
 */
async function applyOrder(
  supabase: SupabaseClient<Database>,
  listingId: string,
  ordered: { id: string; path: string }[],
): Promise<boolean> {
  const position = new Map<string, number>();
  const occupant = new Map<number, string>();

  const { data: current, error } = await supabase
    .from("listing_photos")
    .select("id, position")
    .eq("listing_id", listingId);
  if (error || !current) return false;
  for (const row of current) {
    position.set(row.id, row.position);
    occupant.set(row.position, row.id);
  }

  const move = async (id: string, to: number): Promise<boolean> => {
    const { error: updateError } = await supabase
      .from("listing_photos")
      .update({ position: to })
      .eq("id", id)
      .eq("listing_id", listingId);
    if (updateError) return false;
    const from = position.get(id);
    if (from !== undefined) occupant.delete(from);
    position.set(id, to);
    occupant.set(to, id);
    return true;
  };

  const freeSlot = (): number => {
    for (let i = 0; i < MAX_PHOTOS; i += 1) if (!occupant.has(i)) return i;
    return -1;
  };

  // Ten photos and ten slots leaves nowhere to step aside, so park the row
  // that belongs last and put it back once the rest have settled.
  let parked: { path: string; to: number } | null = null;
  if (ordered.length >= MAX_PHOTOS) {
    const tail = ordered[ordered.length - 1];
    if (tail) {
      const { error: deleteError } = await supabase
        .from("listing_photos")
        .delete()
        .eq("id", tail.id)
        .eq("listing_id", listingId);
      if (deleteError) return false;
      const from = position.get(tail.id);
      if (from !== undefined) occupant.delete(from);
      position.delete(tail.id);
      parked = { path: tail.path, to: ordered.length - 1 };
    }
  }

  const targets = ordered
    .map((photo, index) => ({ id: photo.id, to: index }))
    .filter((item) => position.has(item.id));

  let guard = 0;
  for (;;) {
    const pending = targets.filter((item) => position.get(item.id) !== item.to);
    if (pending.length === 0) break;
    if ((guard += 1) > MAX_PHOTOS * 4) return false;

    const straightforward = pending.filter((item) => !occupant.has(item.to));
    if (straightforward.length > 0) {
      for (const item of straightforward) {
        if (!(await move(item.id, item.to))) return false;
      }
      continue;
    }

    // Every remaining target is occupied by another pending row: step one of
    // them aside into a free slot and the chain unwinds on the next pass.
    const slot = freeSlot();
    const first = pending[0];
    if (slot < 0 || !first) return false;
    if (!(await move(first.id, slot))) return false;
  }

  if (parked) {
    const { error: insertError } = await supabase
      .from("listing_photos")
      .insert({ listing_id: listingId, storage_path: parked.path, position: parked.to });
    if (insertError) return false;
  }

  return true;
}

/** Remove a photo, then close the gap so positions stay 0 upwards. */
export async function removePhoto(input: {
  listingId: string;
  photoId: string;
}): Promise<ActionResult<null>> {
  const gate = await requireAgent();
  if (!gate.ok) return fail(gate.error);

  const parsed = validate(removePhotoSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const { listingId, photoId } = parsed.data;

  const listing = await ownedListing(gate.supabase, gate.agentId, listingId);
  if (!listing) return fail(NOT_FOUND_MESSAGE);
  if (!EDITABLE.includes(listing.status)) return fail(LOCKED_MESSAGE);

  const { data: photos, error: readError } = await gate.supabase
    .from("listing_photos")
    .select("id, storage_path, position")
    .eq("listing_id", listingId)
    .order("position", { ascending: true });
  if (readError || !photos) return fail(PHOTO_FAILED_MESSAGE);

  const target = photos.find((p) => p.id === photoId);
  if (!target) return fail(PHOTO_GONE_MESSAGE);

  const { error: deleteError } = await gate.supabase
    .from("listing_photos")
    .delete()
    .eq("id", photoId)
    .eq("listing_id", listingId);
  if (deleteError) return fail(PHOTO_FAILED_MESSAGE);

  // The object itself goes too, so the bucket does not fill with orphans.
  // Best effort: the listing is already correct either way.
  await gate.supabase.storage.from(PHOTO_BUCKET).remove([target.storage_path]);

  const remaining = photos
    .filter((p) => p.id !== photoId)
    .map((p) => ({ id: p.id, path: p.storage_path }));
  await applyOrder(gate.supabase, listingId, remaining);

  refreshAgentSurfaces();
  return ok(null);
}

/**
 * Reorder photos, cover first. The first id in the list becomes the cover.
 *
 * Returns the settled order, because a listing at the ten photo ceiling has one
 * row parked out and put back, which mints a new id for it. Handing the caller
 * the truth costs one read and saves them from sending a stale id next time.
 */
export async function reorderPhotos(input: {
  listingId: string;
  orderedIds: string[];
}): Promise<ActionResult<{ photos: { id: string; path: string }[] }>> {
  const gate = await requireAgent();
  if (!gate.ok) return fail(gate.error);

  const parsed = validate(reorderPhotosSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const { listingId, orderedIds } = parsed.data;

  const listing = await ownedListing(gate.supabase, gate.agentId, listingId);
  if (!listing) return fail(NOT_FOUND_MESSAGE);
  if (!EDITABLE.includes(listing.status)) return fail(LOCKED_MESSAGE);

  const { data: photos, error: readError } = await gate.supabase
    .from("listing_photos")
    .select("id, storage_path")
    .eq("listing_id", listingId);
  if (readError || !photos) return fail(PHOTO_FAILED_MESSAGE);

  const byId = new Map(photos.map((p) => [p.id, p.storage_path]));
  if (orderedIds.length !== photos.length || orderedIds.some((id) => !byId.has(id))) {
    return fail("The photo order was out of date. Reload the page and try again.");
  }

  const ordered = orderedIds.map((id) => ({ id, path: byId.get(id) ?? "" }));
  const moved = await applyOrder(gate.supabase, listingId, ordered);
  if (!moved) return fail("We could not reorder the photos just now. Please try again.");

  const { data: settled } = await gate.supabase
    .from("listing_photos")
    .select("id, storage_path")
    .eq("listing_id", listingId)
    .order("position", { ascending: true });

  refreshAgentSurfaces();
  return ok({
    photos: (settled ?? []).map((p) => ({ id: p.id, path: p.storage_path })),
  });
}

/* ------------------------------------------------------------ amenities */

/** Replace the listing's amenities with exactly the codes given. */
export async function setAmenities(input: {
  listingId: string;
  codes: string[];
}): Promise<ActionResult<null>> {
  const gate = await requireAgent();
  if (!gate.ok) return fail(gate.error);

  const parsed = validate(setAmenitiesSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const { listingId, codes } = parsed.data;

  const listing = await ownedListing(gate.supabase, gate.agentId, listingId);
  if (!listing) return fail(NOT_FOUND_MESSAGE);
  if (!EDITABLE.includes(listing.status)) return fail(LOCKED_MESSAGE);

  const { data: rows, error: readError } = await gate.supabase
    .from("amenities")
    .select("id, code")
    .in("code", codes.length > 0 ? codes : ["__none__"]);
  if (readError) return fail("We could not save the amenities just now. Please try again.");

  const { error: clearError } = await gate.supabase
    .from("listing_amenities")
    .delete()
    .eq("listing_id", listingId);
  if (clearError) return fail("We could not save the amenities just now. Please try again.");

  const wanted = rows ?? [];
  if (wanted.length > 0) {
    const { error: insertError } = await gate.supabase
      .from("listing_amenities")
      .insert(wanted.map((a) => ({ listing_id: listingId, amenity_id: a.id })));
    if (insertError) return fail("We could not save the amenities just now. Please try again.");
  }

  refreshAgentSurfaces();
  return ok(null);
}

/* ----------------------------------------------------------- gate access */

/**
 * How a guest actually gets in, stored where only the right people can read it.
 *
 * This is the one write in the listing flow that does NOT touch
 * `public.listings`. That table is readable by the entire internet the moment a
 * listing is PUBLISHED, so a gate code on it would be a gate code published.
 * `public.listing_access` carries the details and its select policy names three
 * readers and no others: the host, an admin, and a guest holding a CONFIRMED
 * booking on that listing.
 *
 * An upsert, because a host correcting the security number should not have to
 * delete the row and write it again. Emptying every field is a real answer and
 * clears `listings.has_estate_access` through the trigger, so the public page
 * stops promising details that no longer exist.
 */
export async function setListingAccess(
  input: ListingAccessInput,
): Promise<ActionResult<{ hasAccess: boolean }>> {
  const gate = await requireAgent();
  if (!gate.ok) return fail(gate.error);

  const parsed = validate(listingAccessSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const value = parsed.data;

  const listing = await ownedListing(gate.supabase, gate.agentId, value.listingId);
  if (!listing) return fail(NOT_FOUND_MESSAGE);

  const row = {
    listing_id: value.listingId,
    estate_name: value.estateName ?? null,
    gate_directions: value.gateDirections ?? null,
    security_phone: value.securityPhone ?? null,
    access_code: value.accessCode ?? null,
  };

  const { error } = await gate.supabase
    .from("listing_access")
    .upsert(row, { onConflict: "listing_id" });

  if (error) {
    // 42501 is the policy refusing a listing that is not this host's, which
    // ownedListing should already have caught, so it means the two disagree
    // and the honest answer is the ownership one.
    if (error.code === "42501") return fail(NOT_FOUND_MESSAGE);
    return fail(SAVE_FAILED_MESSAGE);
  }

  refreshAgentSurfaces();
  revalidatePath(`/listing/${value.listingId}`);

  const hasAccess = Object.values(row).some(
    (field, index) => index > 0 && typeof field === "string" && field.trim().length > 0,
  );
  return ok({ hasAccess });
}

/* --------------------------------------------------------------- submit */

export type SubmitOutcome = { id: string; status: ListingStatus };

/**
 * Send a listing for review, but only if it clears the quality gate.
 *
 * The gate runs against what is actually stored: the row, the photo rows and
 * the amenity joins, never against anything the client asserts. Unmet
 * requirements come back as fieldErrors in the same plain language the wizard
 * checklist uses, because they are produced by the same function.
 */
export async function submitListing(input: {
  listingId: string;
}): Promise<ActionResult<SubmitOutcome>> {
  const gate = await requireAgent();
  if (!gate.ok) return fail(gate.error);

  const parsed = validate(listingIdSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const { listingId } = parsed.data;

  const listing = await ownedListing(gate.supabase, gate.agentId, listingId);
  if (!listing) return fail(NOT_FOUND_MESSAGE);

  if (listing.status === "SUBMITTED" || listing.status === "UNDER_REVIEW") {
    return fail(REVIEW_PENDING_MESSAGE);
  }
  if (!EDITABLE.includes(listing.status)) {
    return fail("This listing has already been through review. Return it to a draft to change it.");
  }

  const [photoRes, amenityRes] = await Promise.all([
    gate.supabase.from("listing_photos").select("id, position").eq("listing_id", listingId),
    gate.supabase.from("listing_amenities").select("amenity_id").eq("listing_id", listingId),
  ]);

  const photos = photoRes.data ?? [];
  const unmet = submitRequirements({
    title: listing.title,
    description: listing.description,
    propertyType: listing.property_type,
    stateCode: listing.state_code,
    city: listing.city,
    area: listing.area,
    priceMinor: listing.price_per_night_minor,
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
    maxGuests: listing.max_guests,
    amenityCount: (amenityRes.data ?? []).length,
    photoCount: photos.length,
    hasCover: photos.some((p) => p.position === 0),
  });

  if (unmet.length > 0) {
    return fail(GATE_SUMMARY_MESSAGE, gateFieldErrors(unmet));
  }

  const { data: updated, error } = await gate.supabase
    .from("listings")
    .update({ status: "SUBMITTED", submitted_at: new Date().toISOString() })
    .eq("id", listingId)
    .eq("agent_id", gate.agentId)
    .select("id, status")
    .single();

  if (error || !updated) {
    return fail("We could not send this listing for review just now. Please try again.");
  }

  refreshAgentSurfaces();
  return ok({ id: updated.id, status: updated.status });
}

/* -------------------------------------------------------- state changes */

/** Take an approved or live listing off the market and back into drafts. */
export async function unpublishListing(input: {
  listingId: string;
}): Promise<ActionResult<null>> {
  const gate = await requireAgent();
  if (!gate.ok) return fail(gate.error);

  const parsed = validate(listingIdSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const listing = await ownedListing(gate.supabase, gate.agentId, parsed.data.listingId);
  if (!listing) return fail(NOT_FOUND_MESSAGE);
  if (listing.status !== "APPROVED" && listing.status !== "PUBLISHED") {
    return fail(
      "Only a listing that is approved or live can be taken back to a draft. Refresh to see where this one stands.",
    );
  }

  const { error } = await gate.supabase
    .from("listings")
    .update({ status: "DRAFT" })
    .eq("id", listing.id)
    .eq("agent_id", gate.agentId);
  if (error) return fail("We could not take this listing down just now. Please try again.");

  refreshAgentSurfaces();
  return ok(null);
}

/** Delete a draft outright, with its photos. Anything further along stays. */
export async function deleteListing(input: {
  listingId: string;
}): Promise<ActionResult<null>> {
  const gate = await requireAgent();
  if (!gate.ok) return fail(gate.error);

  const parsed = validate(listingIdSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const listing = await ownedListing(gate.supabase, gate.agentId, parsed.data.listingId);
  if (!listing) return fail(NOT_FOUND_MESSAGE);
  if (listing.status !== "DRAFT") {
    return fail("Only a draft can be deleted. Take the listing back to a draft first.");
  }

  const { data: photos } = await gate.supabase
    .from("listing_photos")
    .select("storage_path")
    .eq("listing_id", listing.id);

  const { error } = await gate.supabase
    .from("listings")
    .delete()
    .eq("id", listing.id)
    .eq("agent_id", gate.agentId);
  if (error) return fail("We could not delete this draft just now. Please try again.");

  const paths = (photos ?? []).map((p) => p.storage_path);
  if (paths.length > 0) {
    await gate.supabase.storage.from(PHOTO_BUCKET).remove(paths);
  }

  refreshAgentSurfaces();
  return ok(null);
}

/* ----------------------------------------------------------------- read */

/** Every listing the caller owns, in every status, with its cover photo. */
export async function getMyListings(): Promise<ActionResult<ListingSummary[]>> {
  const gate = await requireAgent();
  if (!gate.ok) return fail(gate.error);
  return ok(await readMyListings(gate.supabase, gate.agentId));
}
