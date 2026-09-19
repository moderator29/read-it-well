"use server";

/**
 * Becoming a host: the writes behind the wizard.
 *
 * ONE ROW IS THE APPLICATION. `public.businesses` is created as DRAFT at the
 * second step and everything after writes onto it, so there is no separate
 * application table to fall out of step with the business it becomes
 * (docs/research/HOST_ONBOARDING_RESEARCH.md section 3.2). Submission is a
 * status change on that same row, which is what puts it in the reviewer's
 * queue.
 *
 * EVERY WRITE IS THE CALLER'S OWN. `businesses_owner_all` pins the row to
 * `owner_id`, and the child tables scope through `private.owns_business` and
 * `private.owns_accommodation`, so the database decides whose application
 * this is. The service role appears nowhere in this file: a host application
 * written as the service role would bypass the ownership check that is the
 * entire point.
 *
 * NOTHING TYPED IS EVER LOST. Every save is an upsert of whatever the person
 * has filled in so far, and no save refuses a half-filled form: what must be
 * PRESENT is decided once, at submission, by `missingFrom`, which prints
 * exactly what is absent rather than saying "complete all required fields".
 *
 * DOCUMENTS. The wizard uploads straight into the private `host-documents`
 * bucket under `<uid>/<batch>/...`, which storage RLS restricts to that
 * person's own folder, and hands this action the path. Nothing here trusts
 * that string: a path outside the caller's own prefix is refused before any
 * write, exactly as `lib/agent/application.ts` does it, so a crafted path
 * cannot claim somebody else's object.
 */

import { revalidatePath } from "next/cache";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import {
  NOT_CONFIGURED_MESSAGE,
  SIGNED_OUT_MESSAGE,
  resolveSession,
} from "../actions/session";
import type { Database } from "../supabase/database.types";
import { documentPathBelongsTo, missingFrom, type HostType } from "./onboarding";
import { MAX_BUSINESS_PHOTOS, nextPhotoPosition } from "./photos";
import { getMyHostDraft } from "./queries";
import {
  accommodationDraftSchema,
  businessPhotoIdSchema,
  businessPhotoSchema,
  hostDocumentSchema,
  hostDraftSchema,
  ratePlanDraftSchema,
  restaurantProfileDraftSchema,
  roomTypeDraftSchema,
  serviceWindowDraftSchema,
} from "./schema";

type BusinessKind = Database["public"]["Enums"]["business_kind"];

const SERVICE_DOWN_MESSAGE =
  "We could not save that just now. Nothing you typed was lost, so try again in a moment.";

const NO_DRAFT_MESSAGE =
  "There is no application open on your account yet. Start one and we will keep it as you go.";

const NOT_EDITABLE_MESSAGE =
  "This application is with our team, so it cannot be changed right now. We will write to you when it has been read.";

const NOT_YOURS_MESSAGE =
  "That is not on your account. Open your properties to see the ones that are.";

/** The statuses in which a host may still edit their own application. */
const EDITABLE: readonly Database["public"]["Enums"]["listing_status"][] = [
  "DRAFT",
  "MORE_INFO_REQUIRED",
];

function refreshHostSurfaces(): void {
  revalidatePath("/host");
  revalidatePath("/host/apply");
}

/**
 * The surfaces a photograph changes: the owner's own manager, and every guest
 * surface that draws the venue. The shelf and the detail page are ordinary
 * dynamic routes, so this is belt and braces rather than the only thing
 * keeping them current.
 */
function refreshVenueSurfaces(): void {
  revalidatePath("/host");
  revalidatePath("/host/photos");
  revalidatePath("/restaurants");
}

/** A URL-safe slug from a name, with a short suffix so two hosts may share one. */
function slugFor(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
  const stem = base.length >= 2 ? base : "host";
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${stem}-${suffix}`;
}

/* -------------------------------------------------------------- the draft */

export type HostDraftSaved = { businessId: string; status: string };

/**
 * Save whatever the wizard has so far, creating the DRAFT row on first call.
 *
 * The kind is validated against the enum here rather than in the schema,
 * because the schema is client-safe and the enum is generated: a value the
 * column would refuse is told apart from one it would accept, in one place.
 */
export async function saveHostDraft(input: unknown): Promise<ActionResult<HostDraftSaved>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  const parsed = validate(hostDraftSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const data = parsed.data;

  const { data: existing, error: readError } = await session.supabase
    .from("businesses")
    .select("id, status, name, kind, host_type, consents")
    .eq("owner_id", session.user.id)
    .in("status", ["DRAFT", "MORE_INFO_REQUIRED", "SUBMITTED"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (readError) return fail(SERVICE_DOWN_MESSAGE);
  if (existing && !EDITABLE.includes(existing.status)) return fail(NOT_EDITABLE_MESSAGE);

  /* A restaurant host runs a restaurant, and a restaurant business is what the
     reservation trigger and the admin chip both key on, so the branch answer
     decides the kind rather than sitting beside it. */
  const kindFromType: Partial<Record<HostType, BusinessKind>> = { restaurant: "restaurant" };
  const kind: BusinessKind | undefined =
    (data.hostType ? kindFromType[data.hostType] : undefined) ??
    (data.kind as BusinessKind | undefined);

  const now = new Date().toISOString();
  const consents: Record<string, string> = {
    ...((existing?.consents as Record<string, string> | null) ?? {}),
  };
  for (const id of data.consents ?? []) consents[id] = now;

  const fields = {
    ...(data.hostType ? { host_type: data.hostType } : {}),
    ...(kind ? { kind } : {}),
    ...(data.name !== undefined ? { name: data.name } : {}),
    ...(data.description !== undefined ? { description: data.description || null } : {}),
    ...(data.phone !== undefined ? { phone: data.phone || null } : {}),
    ...(data.email !== undefined ? { email: data.email || null } : {}),
    ...(data.address !== undefined ? { address: data.address || null } : {}),
    ...(data.area !== undefined ? { area: data.area || null } : {}),
    ...(data.city !== undefined ? { city: data.city || null } : {}),
    ...(data.stateCode !== undefined ? { state_code: data.stateCode || null } : {}),
    ...(data.registeredName !== undefined
      ? { registered_name: data.registeredName || null }
      : {}),
    ...(data.cacNumber !== undefined ? { cac_number: data.cacNumber || null } : {}),
    ...(data.tin !== undefined ? { tin: data.tin || null } : {}),
    ...(data.representativeName !== undefined
      ? { representative_name: data.representativeName || null }
      : {}),
    ...(data.representativePhone !== undefined
      ? { representative_phone: data.representativePhone || null }
      : {}),
    ...(data.consents ? { consents } : {}),
    /* An attestation is a dated fact somebody stated, so unticking it removes
       the date rather than leaving a claim nobody is making any more. */
    ...(data.hygieneAttested !== undefined
      ? { hygiene_attested_at: data.hygieneAttested ? now : null }
      : {}),
    ...(data.licenceAttested !== undefined
      ? { licence_attested_at: data.licenceAttested ? now : null }
      : {}),
  };

  if (existing) {
    if (Object.keys(fields).length === 0) {
      return ok({ businessId: existing.id, status: existing.status });
    }
    const { error } = await session.supabase
      .from("businesses")
      .update(fields)
      .eq("id", existing.id);
    if (error) return fail(saveRefusal(error.message, error.code));
    refreshHostSurfaces();
    return ok({ businessId: existing.id, status: existing.status });
  }

  // First save. A row needs a name and a kind, which are step one and step
  // two's answers; without them there is nothing honest to create yet.
  const name = (data.name ?? "").trim();
  if (name.length < 2) {
    return fail("Give your business a name to start.", { name: "Give your business a name." });
  }
  if (!kind) {
    return fail("Say what kind of business this is.", { kind: "Pick what this business is." });
  }

  const { data: created, error } = await session.supabase
    .from("businesses")
    .insert({
      owner_id: session.user.id,
      source: "first_party",
      status: "DRAFT",
      kind,
      name,
      slug: slugFor(name),
      ...fields,
    })
    .select("id, status")
    .single();
  if (error || !created) return fail(saveRefusal(error?.message ?? "", error?.code));

  refreshHostSurfaces();
  return ok({ businessId: created.id, status: created.status });
}

/**
 * A database refusal, as a sentence.
 *
 * Only the ones a person can act on are told apart. Everything else is one
 * honest failure: the constraint's name belongs in a log, not in front of
 * somebody filling in a form.
 */
function saveRefusal(raw: string, code?: string): string {
  if (code === "23505") {
    return "A business with that web address already exists. Change the name slightly and save again.";
  }
  if (raw.includes("businesses_phone_check")) {
    return "That phone number is not one we can ring. Enter it as 0803 123 4567.";
  }
  if (raw.includes("businesses_email_check")) return "That email address is not one we can write to.";
  if (raw.includes("cac_number")) {
    return "That is not an RC or BN number. It is the one on your CAC certificate, like RC 1234567.";
  }
  if (raw.includes("row-level security")) return NOT_YOURS_MESSAGE;
  return SERVICE_DOWN_MESSAGE;
}

/* ----------------------------------------------------------- the documents */

/**
 * Record a document the wizard has already uploaded to the private bucket.
 *
 * Two checks before any write, and the first is the one that matters: the
 * path must sit under the caller's own uid prefix. Storage RLS enforces the
 * same rule on the upload itself, so a path that fails here was never written
 * by this person and has no business being recorded against their
 * application. The insert policy re-checks both the prefix and the ownership
 * of the application, so this is the third place the rule holds and the first
 * place somebody is told about it in words.
 */
export async function uploadHostDocumentPath(input: unknown): Promise<ActionResult<{ id: string }>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  const parsed = validate(hostDocumentSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  if (!documentPathBelongsTo(session.user.id, parsed.data.storagePath)) {
    return fail(
      "That upload did not come from your own account, so we did not file it. Please choose the file again.",
    );
  }

  const { data, error } = await session.supabase
    .from("business_documents")
    .insert({
      business_id: parsed.data.businessId,
      kind: parsed.data.kind,
      storage_path: parsed.data.storagePath,
      uploaded_by: session.user.id,
    })
    .select("id")
    .single();
  if (error || !data) {
    if (error?.code === "42501") return fail(NOT_YOURS_MESSAGE);
    return fail("That document did not attach. Choose the file again.");
  }

  refreshHostSurfaces();
  return ok({ id: data.id });
}

/* --------------------------------------------------------------- submission */

/**
 * Send the application to the review queue.
 *
 * DRAFT (or MORE_INFO_REQUIRED, for a host answering a reviewer) to SUBMITTED,
 * and only when `missingFrom` is empty. The list it returns is handed back
 * verbatim in `fieldErrors` so the review screen prints exactly what is
 * absent, which is the whole reason that function returns a list.
 */
export async function submitHostApplication(): Promise<ActionResult<{ businessId: string }>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  const draft = await getMyHostDraft();
  if (!draft.businessId) return fail(NO_DRAFT_MESSAGE);
  if (draft.status === "SUBMITTED") {
    return fail("This application is already with our team. We will write to you when it is read.");
  }
  if (draft.status !== null && !EDITABLE.includes(draft.status)) return fail(NOT_EDITABLE_MESSAGE);

  const missing = missingFrom(draft);
  if (missing.length > 0) {
    return fail(
      missing.length === 1
        ? `One thing is still missing: ${missing[0]}.`
        : `${missing.length} things are still missing before you can send this.`,
      Object.fromEntries(missing.map((item, index) => [`missing.${index}`, item])),
    );
  }

  const { error, count } = await session.supabase
    .from("businesses")
    .update(
      { status: "SUBMITTED", submitted_at: new Date().toISOString() },
      { count: "exact" },
    )
    .eq("id", draft.businessId)
    .eq("owner_id", session.user.id)
    .in("status", [...EDITABLE]);
  if (error) return fail(SERVICE_DOWN_MESSAGE);
  // Nothing moved: somebody submitted it in another tab, or a reviewer picked
  // it up between the read above and this write.
  if (count === 0) {
    return fail("This application has already been sent. Refresh to see where it is.");
  }

  refreshHostSurfaces();
  return ok({ businessId: draft.businessId });
}

/* ------------------------------------------------------ the property halves */

/** The caller's editable application, or the sentence that says why not. */
async function editableBusiness(): Promise<
  | { ok: false; result: ActionResult<never> }
  | { ok: true; businessId: string; userId: string }
> {
  const session = await resolveSession();
  if (session.state === "unconfigured") {
    return { ok: false, result: fail(NOT_CONFIGURED_MESSAGE) };
  }
  if (session.state === "signed-out") return { ok: false, result: fail(SIGNED_OUT_MESSAGE) };

  const { data, error } = await session.supabase
    .from("businesses")
    .select("id, status")
    .eq("owner_id", session.user.id)
    .in("status", ["DRAFT", "MORE_INFO_REQUIRED", "SUBMITTED"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return { ok: false, result: fail(SERVICE_DOWN_MESSAGE) };
  if (!data) return { ok: false, result: fail(NO_DRAFT_MESSAGE) };
  if (!EDITABLE.includes(data.status)) return { ok: false, result: fail(NOT_EDITABLE_MESSAGE) };
  return { ok: true, businessId: data.id, userId: session.user.id };
}

/**
 * Create or update the property this business lets.
 *
 * One accommodation per application in the wizard: a host with a second
 * property adds it from their own console once the first is live, which is a
 * different surface with a different question. The row is created DRAFT and
 * the publish gate is the reviewer's, never this action's.
 */
export async function addAccommodationDraft(
  input: unknown,
): Promise<ActionResult<{ accommodationId: string }>> {
  const guarded = await editableBusiness();
  if (!guarded.ok) return guarded.result;

  const parsed = validate(accommodationDraftSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const data = parsed.data;
  const session = await resolveSession();
  if (session.state !== "signed-in") return fail(SIGNED_OUT_MESSAGE);

  const fields = {
    name: data.name,
    ...(data.description !== undefined ? { description: data.description || null } : {}),
    ...(data.starRating !== undefined ? { star_rating: data.starRating } : {}),
    ...(data.checkInFrom !== undefined ? { check_in_from: data.checkInFrom } : {}),
    ...(data.checkOutBy !== undefined ? { check_out_by: data.checkOutBy } : {}),
    ...(data.houseRules !== undefined ? { house_rules: data.houseRules || null } : {}),
    ...(data.latitude !== undefined ? { latitude: data.latitude } : {}),
    ...(data.longitude !== undefined ? { longitude: data.longitude } : {}),
    ...(data.cancellationPolicyId !== undefined
      ? { cancellation_policy_id: data.cancellationPolicyId }
      : {}),
  };

  const { data: existing } = await session.supabase
    .from("accommodations")
    .select("id")
    .eq("business_id", guarded.businessId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existing) {
    const { error } = await session.supabase
      .from("accommodations")
      .update(fields)
      .eq("id", existing.id);
    if (error) return fail(SERVICE_DOWN_MESSAGE);
    refreshHostSurfaces();
    return ok({ accommodationId: existing.id });
  }

  const { data: created, error } = await session.supabase
    .from("accommodations")
    .insert({
      business_id: guarded.businessId,
      slug: slugFor(data.name),
      status: "DRAFT",
      ...fields,
    })
    .select("id")
    .single();
  if (error || !created) {
    if (error?.code === "23505") {
      return fail("A property with that web address already exists. Change the name slightly.");
    }
    if (error?.code === "42501") return fail(NOT_YOURS_MESSAGE);
    return fail(SERVICE_DOWN_MESSAGE);
  }

  refreshHostSurfaces();
  return ok({ accommodationId: created.id });
}

/** Add one room type to the property. At least one is a publish gate. */
export async function addRoomTypeDraft(
  input: unknown,
): Promise<ActionResult<{ roomTypeId: string }>> {
  const guarded = await editableBusiness();
  if (!guarded.ok) return guarded.result;

  const parsed = validate(roomTypeDraftSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const data = parsed.data;
  const session = await resolveSession();
  if (session.state !== "signed-in") return fail(SIGNED_OUT_MESSAGE);

  const { data: created, error } = await session.supabase
    .from("room_types")
    .insert({
      accommodation_id: data.accommodationId,
      name: data.name,
      category: data.category,
      ...(data.description ? { description: data.description } : {}),
      sleeps: data.sleeps,
      units_total: data.unitsTotal,
      base_rate_minor: data.baseRateMinor,
      ...(data.sizeSqm !== undefined ? { size_sqm: data.sizeSqm } : {}),
      status: "DRAFT",
    })
    .select("id")
    .single();
  if (error || !created) {
    if (error?.code === "23505") {
      return fail("You already have a room type with that name.", {
        name: "Give this one a different name.",
      });
    }
    if (error?.code === "42501") return fail(NOT_YOURS_MESSAGE);
    return fail(SERVICE_DOWN_MESSAGE);
  }

  refreshHostSurfaces();
  return ok({ roomTypeId: created.id });
}

/**
 * Add one rate plan to a room type.
 *
 * A cancellation policy is required by the column, not by this action, and
 * that is the point: a bookable room whose cancellation terms nobody chose is
 * the thing the publish gate exists to prevent.
 */
export async function addRatePlanDraft(
  input: unknown,
): Promise<ActionResult<{ ratePlanId: string }>> {
  const guarded = await editableBusiness();
  if (!guarded.ok) return guarded.result;

  const parsed = validate(ratePlanDraftSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const data = parsed.data;
  const session = await resolveSession();
  if (session.state !== "signed-in") return fail(SIGNED_OUT_MESSAGE);

  const { data: created, error } = await session.supabase
    .from("rate_plans")
    .insert({
      room_type_id: data.roomTypeId,
      name: data.name,
      ...(data.mealPlan ? { meal_plan: data.mealPlan } : {}),
      cancellation_policy_id: data.cancellationPolicyId,
      rate_minor: data.rateMinor,
      ...(data.minStayNights !== undefined ? { min_stay_nights: data.minStayNights } : {}),
      ...(data.maxStayNights !== undefined ? { max_stay_nights: data.maxStayNights } : {}),
    })
    .select("id")
    .single();
  if (error || !created) {
    if (error?.code === "23505") {
      return fail("That room type already has a rate with that name.", {
        name: "Give this one a different name.",
      });
    }
    if (error?.code === "23503") {
      return fail("Pick a cancellation policy from the list.", {
        cancellationPolicyId: "Pick a cancellation policy.",
      });
    }
    if (error?.code === "42501") return fail(NOT_YOURS_MESSAGE);
    return fail(SERVICE_DOWN_MESSAGE);
  }

  refreshHostSurfaces();
  return ok({ ratePlanId: created.id });
}

/** Add one service window to a restaurant. At least one is a publish gate. */
export async function addServiceWindowDraft(
  input: unknown,
): Promise<ActionResult<{ serviceWindowId: string }>> {
  const guarded = await editableBusiness();
  if (!guarded.ok) return guarded.result;

  const parsed = validate(serviceWindowDraftSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const data = parsed.data;
  const session = await resolveSession();
  if (session.state !== "signed-in") return fail(SIGNED_OUT_MESSAGE);

  const { data: created, error } = await session.supabase
    .from("service_windows")
    .insert({
      business_id: guarded.businessId,
      weekday: data.weekday,
      opens: data.opens,
      last_seating: data.lastSeating,
      closes: data.closes,
      covers: data.covers,
    })
    .select("id")
    .single();
  if (error || !created) {
    if (error?.code === "23505") {
      return fail("You already have a service starting at that time on that day.");
    }
    if (error?.code === "42501") return fail(NOT_YOURS_MESSAGE);
    return fail(SERVICE_DOWN_MESSAGE);
  }

  refreshHostSurfaces();
  return ok({ serviceWindowId: created.id });
}

/**
 * The restaurant's own facts: cuisines, a price band, and the Nigerian
 * columns that matter. A BAND, never a made-up average price.
 */
export async function setRestaurantProfileDraft(input: unknown): Promise<ActionResult<null>> {
  const guarded = await editableBusiness();
  if (!guarded.ok) return guarded.result;

  const parsed = validate(restaurantProfileDraftSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const data = parsed.data;
  const session = await resolveSession();
  if (session.state !== "signed-in") return fail(SIGNED_OUT_MESSAGE);

  const { error } = await session.supabase.from("restaurant_profiles").upsert(
    {
      business_id: guarded.businessId,
      ...(data.cuisines !== undefined ? { cuisines: data.cuisines } : {}),
      ...(data.priceBand !== undefined ? { price_band: data.priceBand } : {}),
      ...(data.menuUrl !== undefined ? { menu_url: data.menuUrl || null } : {}),
      ...(data.dressCode !== undefined ? { dress_code: data.dressCode || null } : {}),
      ...(data.parking !== undefined ? { parking: data.parking } : {}),
      ...(data.powerBackup !== undefined ? { power_backup: data.powerBackup } : {}),
      ...(data.outdoor !== undefined ? { outdoor: data.outdoor } : {}),
    },
    { onConflict: "business_id" },
  );
  if (error) {
    if (error.code === "42501") return fail(NOT_YOURS_MESSAGE);
    return fail(SERVICE_DOWN_MESSAGE);
  }

  refreshHostSurfaces();
  return ok(null);
}

/* --------------------------------------------------------- photographs */

/**
 * The caller's own business, at ANY status, or the sentence that says why not.
 *
 * Deliberately not `editableBusiness`. That helper refuses once an application
 * has been sent, which is right for an answer on a form and wrong for a
 * photograph: the onboarding script promises an owner they can go live the day
 * they sign and send their pictures during the week, so the moment a venue is
 * APPROVED or PUBLISHED is exactly when its photographs arrive. Ownership is
 * still the gate, and RLS re-checks it on the write through
 * `private.owns_business`.
 */
async function ownedBusiness(
  businessId: string,
): Promise<
  { ok: false; result: ActionResult<never> } | { ok: true; userId: string }
> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return { ok: false, result: fail(NOT_CONFIGURED_MESSAGE) };
  if (session.state === "signed-out") return { ok: false, result: fail(SIGNED_OUT_MESSAGE) };

  const { data, error } = await session.supabase
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .eq("owner_id", session.user.id)
    .maybeSingle();
  if (error) return { ok: false, result: fail(SERVICE_DOWN_MESSAGE) };
  if (!data) return { ok: false, result: fail(NOT_YOURS_MESSAGE) };
  return { ok: true, userId: session.user.id };
}

/**
 * Record a photograph the browser has already put in the public bucket.
 *
 * THE POSITION IS DECIDED HERE, not by the caller, and it is the lowest free
 * one. `position` is unique per business and 0 is the cover everywhere that
 * reads these rows, so letting a form post a number would let two photographs
 * race for the cover and one of them would fail on the unique index with a
 * refusal nobody could act on. Uploading in order therefore means the FIRST
 * photograph is the cover, which is what the surface tells the owner.
 *
 * The path is checked against the caller's own uid prefix before any write,
 * exactly as `uploadHostDocumentPath` does it: storage RLS enforces the same
 * rule on the upload itself, so a path that fails here was never written by
 * this person.
 */
export async function addBusinessPhoto(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = validate(businessPhotoSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const guarded = await ownedBusiness(parsed.data.businessId);
  if (!guarded.ok) return guarded.result;

  if (!documentPathBelongsTo(guarded.userId, parsed.data.storagePath)) {
    return fail(
      "That upload did not come from your own account, so we did not file it. Please choose the photograph again.",
    );
  }

  const session = await resolveSession();
  if (session.state !== "signed-in") return fail(SIGNED_OUT_MESSAGE);

  const { data: taken, error: readError } = await session.supabase
    .from("business_photos")
    .select("position")
    .eq("business_id", parsed.data.businessId)
    .order("position", { ascending: true });
  if (readError) return fail(SERVICE_DOWN_MESSAGE);

  const position = nextPhotoPosition((taken ?? []).map((row) => row.position));
  if (position === null) {
    return fail(
      `A venue carries up to ${MAX_BUSINESS_PHOTOS} photographs. Take one down and add this in its place.`,
    );
  }

  const { data, error } = await session.supabase
    .from("business_photos")
    .insert({
      business_id: parsed.data.businessId,
      storage_path: parsed.data.storagePath,
      position,
    })
    .select("id")
    .single();
  if (error || !data) {
    if (error?.code === "42501") return fail(NOT_YOURS_MESSAGE);
    if (error?.code === "23505") {
      return fail("That photograph landed at the same moment as another. Try it again.");
    }
    return fail("That photograph did not attach. Choose the file again.");
  }

  refreshVenueSurfaces();
  return ok({ id: data.id });
}

/**
 * Take one photograph down.
 *
 * The row goes and the object stays: the bucket is swept by the account
 * deletion purge, and deleting a public object from under a page that may
 * still be rendering it is how a live venue ends up with a broken image. What
 * a guest sees is decided by the rows, and the row is gone.
 *
 * Removing the cover promotes the next photograph, because every reader orders
 * by position and takes the first. Nothing is renumbered, so nothing else
 * moves.
 */
export async function removeBusinessPhoto(input: unknown): Promise<ActionResult<null>> {
  const parsed = validate(businessPhotoIdSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  /* The delete is scoped by RLS (`business_photos_write` admits the owner and
     an admin), so a photograph on somebody else's venue simply does not move
     and the count says so rather than the policy being restated here. */
  const { error, count } = await session.supabase
    .from("business_photos")
    .delete({ count: "exact" })
    .eq("id", parsed.data.photoId);
  if (error) return fail(SERVICE_DOWN_MESSAGE);
  if (count === 0) return fail(NOT_YOURS_MESSAGE);

  refreshVenueSurfaces();
  return ok(null);
}
