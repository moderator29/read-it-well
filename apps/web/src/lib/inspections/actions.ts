"use server";

import { oncePerTap, tapKey } from "../offline/replay-guard";
import { revalidatePath } from "next/cache";
import { PHOTO_EXTENSIONS, photoPathBelongsTo } from "./report-photo-path";
import { z } from "zod";
import { resolveSession } from "../actions/session";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { startConversation } from "../messages/actions";
import { INSPECTION_OUTCOMES, type InspectionState } from "./types";
import { phoneGateFor } from "../phone-otp/gate";

/**
 * MOVING AN INSPECTION.
 *
 * Four actions and no more: ask, answer, take the time you were offered, pull
 * out. Everything about WHO may do WHICH is decided in the database by
 * `private.guard_inspection_transition`, and nothing here re-implements it.
 *
 * That split is deliberate and it is the same one the money layer uses. A
 * state machine written twice is a state machine that will disagree with
 * itself, and the copy that matters is the one an attacker cannot skip. These
 * functions validate shapes, name the row, and translate a refusal into a
 * sentence somebody can act on.
 *
 * WHAT IS NOT HERE: a confirm action for the requester on their own request.
 * The database refuses that transition; there is no reason for a door in front
 * of a wall.
 */

const MAX_NOTE = 400;

/**
 * The example refusal, in the one sentence a person can act on.
 *
 * Every listing in the catalogue today carries `is_demo`, and the trigger
 * `inspection_requests_never_against_a_demo_listing` refuses the insert with
 * SQLSTATE 23514. Without this the guest was told "We could not send that
 * request. Try again in a moment", which is false twice over: nothing went
 * wrong, and trying again will never work.
 */
const EXAMPLE_LISTING_MESSAGE =
  "This is an example listing, so there is nothing to inspect. Open a real listing from search and arrange an inspection there.";

/** The furthest ahead somebody may ask to inspect a property. */
const MAX_DAYS_AHEAD = 90;

const whenSchema = z
  .string()
  .min(1, "Pick a day and a time.")
  .refine((value) => !Number.isNaN(Date.parse(value)), "That is not a time we can read.")
  .refine((value) => Date.parse(value) > Date.now(), "Pick a time in the future.")
  .refine(
    (value) => Date.parse(value) < Date.now() + MAX_DAYS_AHEAD * 86_400_000,
    `Pick a time within the next ${MAX_DAYS_AHEAD} days.`,
  );

const requestSchema = z.object({
  listingId: z.string().uuid("That property could not be found."),
  when: whenSchema,
  note: z.string().trim().max(MAX_NOTE, `Keep this under ${MAX_NOTE} characters.`).optional(),
});

/**
 * Ask to inspect a property.
 *
 * The lister is NOT supplied and cannot be: a trigger resolves it from the
 * listing, so a request always names the person who actually owns the property
 * at the moment it is made. The insert policy refuses a request against an
 * unpublished listing and against your own, so neither is checked here.
 */
export async function requestInspection(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = validate(requestSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const session = await resolveSession();
  if (session.state !== "signed-in") {
    return fail("Sign in to arrange an inspection.");
  }
  /* V-40: a replay of the same tap answers with the first request. */
  const key = tapKey((input as { tapKey?: unknown } | null)?.tapKey);
  return oncePerTap("outbox.inspection", session.user.id, key, () => requestInspectionWork(session, parsed.data));
}

async function requestInspectionWork(
  session: Extract<Awaited<ReturnType<typeof resolveSession>>, { state: "signed-in" }>,
  input: z.infer<typeof requestSchema>,
): Promise<ActionResult<{ id: string }>> {
  const parsed = { data: input };

  /* V-50: the first inspection request needs a confirmed phone, when the
     phone_confirmation flag is on. Null, and nothing read, when it is off. */
  const phoneGate = await phoneGateFor(session.supabase, session.user.id, "inspection");
  if (phoneGate) return fail(phoneGate);

  /* Before the write, so the person reads the truth rather than a constraint
     violation. The trigger refuses again underneath: this is the courtesy and
     that is the guarantee. A listing that does not come back at all is left to
     the insert policy's own refusal, which already has its sentence below. */
  const { data: listing } = await session.supabase
    .from("listings")
    .select("id, is_demo")
    .eq("id", parsed.data.listingId)
    .maybeSingle();
  if (listing?.is_demo) return fail(EXAMPLE_LISTING_MESSAGE);

  const { data, error } = await session.supabase
    .from("inspection_requests")
    .insert({
      listing_id: parsed.data.listingId,
      requester_id: session.user.id,
      /* Not null in the table and written by the trigger before the row
         lands. Supplying the caller keeps the insert type-complete without
         claiming anything: whatever goes in here is overwritten. */
      lister_id: session.user.id,
      requested_at: new Date(parsed.data.when).toISOString(),
      ...(parsed.data.note ? { note: parsed.data.note } : {}),
    })
    .select("id")
    .single();

  if (error || !data) {
    /*
     * The refusals worth telling apart, read from the constraint that fired
     * rather than guessed at. The example one is first because it is the one
     * a person can do nothing about except go somewhere real, and because a
     * listing can become an example between the read above and this insert.
     */
    const message = error?.message ?? "";
    if (/example/i.test(message)) {
      return fail(EXAMPLE_LISTING_MESSAGE);
    }
    if (message.includes("inspection_requests_parties_differ")) {
      return fail("This is your own property, so there is nothing to arrange.");
    }
    if (message.includes("row-level security")) {
      return fail("This property is not taking inspection requests just now.");
    }
    return fail("We could not send that request. Try again in a moment.");
  }

  /*
   * The thread the request lives beside. Find-or-create the guest to agent
   * conversation about this listing, then stamp its id on the request, so the
   * thread page can draw the inspection card and accept from inside it. The
   * request is already filed and is the thing that matters; the thread is
   * best effort. Messaging paused, the daily new-thread limit reached, a
   * flaky stamp: none of those may cost somebody the request they just made,
   * so every failure here is swallowed and the row simply carries no thread.
   */
  const thread = await startConversation({ listingId: parsed.data.listingId });
  if (thread.ok) {
    await session.supabase
      .from("inspection_requests")
      .update({ conversation_id: thread.data.conversationId })
      .eq("id", data.id);
  }

  revalidatePath(`/listing/${parsed.data.listingId}`);
  revalidatePath("/bookings");
  if (thread.ok) revalidatePath(`/messages/${thread.data.conversationId}`);
  return ok({ id: data.id });
}

const answerSchema = z.object({
  id: z.string().uuid(),
  /* The three answers a lister has. `PROPOSED` needs a time; the others do
     not, and `CONFIRMED` takes the time that was asked for unless one is
     given. */
  state: z.enum(["CONFIRMED", "PROPOSED", "DECLINED"]),
  when: whenSchema.optional(),
  note: z.string().trim().max(MAX_NOTE).optional(),
});

/**
 * The lister's answer: yes, another time, or no.
 *
 * A `CONFIRMED` row must carry a slot - the table refuses one without, because
 * an appointment with no time is not an appointment - so confirming without
 * naming a time takes the time that was asked for, which is what "yes" means.
 */
export async function answerInspection(input: unknown): Promise<ActionResult<null>> {
  const parsed = validate(answerSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const session = await resolveSession();
  if (session.state !== "signed-in") return fail("Sign in to answer this request.");

  const existing = await session.supabase
    .from("inspection_requests")
    .select("id, listing_id, requested_at, state")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (existing.error || !existing.data) {
    return fail("We could not find that request.");
  }

  const nextState = parsed.data.state as InspectionState;
  if (nextState === "PROPOSED" && !parsed.data.when) {
    return fail("Say which time you can do.", { when: "Pick a day and a time." });
  }

  const slot =
    nextState === "CONFIRMED"
      ? (parsed.data.when ?? existing.data.requested_at)
      : nextState === "PROPOSED"
        ? parsed.data.when
        : null;

  const { error } = await session.supabase
    .from("inspection_requests")
    .update({
      state: nextState,
      ...(slot ? { slot_at: new Date(slot).toISOString() } : {}),
      ...(parsed.data.note ? { lister_note: parsed.data.note } : {}),
    })
    .eq("id", parsed.data.id);

  if (error) return fail(refusalMessage(error.message));

  revalidatePath("/agent/dashboard");
  revalidatePath("/agent/inspections");
  revalidatePath("/bookings");
  revalidatePath(`/listing/${existing.data.listing_id}`);
  return ok(null);
}

const takeSchema = z.object({ id: z.string().uuid() });

/**
 * Taking the time the lister offered.
 *
 * The one transition a requester may make into `CONFIRMED`, and only from
 * `PROPOSED`. The slot is already on the row - the lister wrote it when they
 * proposed - so nothing about the time is re-supplied here, which means a
 * requester cannot accept a different time to the one they were offered.
 */
export async function acceptProposedTime(input: unknown): Promise<ActionResult<null>> {
  const parsed = validate(takeSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const session = await resolveSession();
  if (session.state !== "signed-in") return fail("Sign in to confirm this time.");

  const { error } = await session.supabase
    .from("inspection_requests")
    .update({ state: "CONFIRMED" })
    .eq("id", parsed.data.id);

  if (error) return fail(refusalMessage(error.message));

  revalidatePath("/bookings");
  return ok(null);
}

const closeSchema = z
  .object({
    id: z.string().uuid(),
    state: z.enum(["WITHDRAWN", "COMPLETED"]),
    /* Why it is complete. Optional, and only meaningful on COMPLETED: the
       database refuses it anywhere else, and so does this schema, so the
       person sees the field light up rather than a refusal after the fact. */
    outcome: z.enum(INSPECTION_OUTCOMES).optional(),
  })
  .refine((value) => value.outcome === undefined || value.state === "COMPLETED", {
    message: "An outcome only goes with a completed inspection.",
    path: ["outcome"],
  });

/**
 * Pulling out, or saying it happened.
 *
 * Withdrawing rather than deleting is the whole reason there is no delete
 * policy on this table: a withdrawn request and a vanished one look the same
 * to the person who was asked, and they mean different things.
 */
export async function closeInspection(input: unknown): Promise<ActionResult<null>> {
  const parsed = validate(closeSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const session = await resolveSession();
  if (session.state !== "signed-in") return fail("Sign in to change this request.");

  const { error } = await session.supabase
    .from("inspection_requests")
    .update({
      state: parsed.data.state,
      ...(parsed.data.outcome ? { outcome: parsed.data.outcome } : {}),
    })
    .eq("id", parsed.data.id);

  if (error) return fail(refusalMessage(error.message));

  revalidatePath("/bookings");
  revalidatePath("/agent/dashboard");
  revalidatePath("/agent/inspections");
  return ok(null);
}

/**
 * A database refusal, as a sentence.
 *
 * The guard raises `check_violation` with a message naming the transition. The
 * person on the other end does not need the transition; they need to know that
 * somebody got there first, which is what both of these actually mean in
 * practice: a request answered in another tab, or one the other side closed
 * while this screen was open.
 */
function refusalMessage(raw: string): string {
  if (raw.includes("is finished and cannot change")) {
    return "This request has already been closed. Refresh to see where it ended up.";
  }
  if (raw.includes("illegal inspection transition")) {
    return "That is not something you can do to this request now. Refresh and look again.";
  }
  if (raw.includes("outcome is recorded when it is completed")) {
    return "An outcome is recorded when the inspection is marked complete, and not changed afterwards.";
  }
  return "We could not save that. Try again in a moment.";
}

/* ------------------------------------------------------------------ report */

/**
 * THE REPORT: EIGHT ROOMS, A NOTE, AND THE TICK THAT CLOSES THE INSPECTION.
 *
 * `F6A8A482` draws eight rows, a notes field and Add Photos. I1 in
 * `docs/SESSION_B_SCOPE.md` asked for exactly this shape and Session B's
 * screen is wired to it.
 *
 * NOTHING HERE DECIDES WHO MAY WRITE, AND THAT IS THE POINT. The same split
 * the four actions above use: `inspection_reports_insert_party`,
 * `_update_party` and their siblings decide who and when, and
 * `private.inspection_report_submission` refuses a submission with fewer than
 * eight ticks and closes the parent in the same transaction. This function
 * validates a shape, names a row, and turns a refusal into a sentence.
 *
 * SO THE DISABLED SUBMIT BUTTON IS THE POLITE HALF OF A REAL RULE. Anything
 * that can reach this action can call it with three rooms ticked; the database
 * is what says no.
 */
const REPORT_ITEMS = [
  "exterior",
  "interior",
  "kitchen",
  "bathrooms",
  "utilities",
  "appliances",
  "safety",
  "overall",
] as const;

const saveReportSchema = z.object({
  inspectionId: z.string().uuid(),
  items: z
    .array(
      z.object({
        item: z.enum(REPORT_ITEMS),
        checked: z.boolean(),
        note: z.string().trim().max(MAX_NOTE).optional().nullable(),
      }),
    )
    .max(REPORT_ITEMS.length),
  notes: z.string().trim().max(2000).optional().nullable(),
  submit: z.boolean().optional(),
});

export type InspectionReport = {
  inspectionId: string;
  notes: string | null;
  submittedAt: string | null;
  items: { item: (typeof REPORT_ITEMS)[number]; checked: boolean; note: string | null }[];
};

export async function saveInspectionReport(
  input: unknown,
): Promise<ActionResult<InspectionReport>> {
  const parsed = validate(saveReportSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const session = await resolveSession();
  if (session.state !== "signed-in") return fail("Sign in to write this report.");

  const { inspectionId, items, notes, submit } = parsed.data;
  const db = session.supabase;

  /* The report row is created on first save rather than when the inspection is
     confirmed, so an inspection nobody wrote up carries no empty report. */
  const { error: reportError } = await db.from("inspection_reports").upsert(
    { inspection_id: inspectionId, author_id: session.user.id, notes: notes ?? null },
    { onConflict: "inspection_id" },
  );
  if (reportError) return fail(reportRefusal(reportError.message));

  if (items.length > 0) {
    const now = new Date().toISOString();
    const { error: itemsError } = await db.from("inspection_report_items").upsert(
      items.map((row) => ({
        inspection_id: inspectionId,
        item: row.item,
        checked: row.checked,
        note: row.note ?? null,
        /* `checked_at` is when somebody said yes, so it is cleared when they
           change their mind rather than left pointing at a tick that is gone. */
        checked_at: row.checked ? now : null,
      })),
      { onConflict: "inspection_id,item" },
    );
    if (itemsError) return fail(reportRefusal(itemsError.message));
  }

  if (submit) {
    const { error: submitError } = await db
      .from("inspection_reports")
      .update({ submitted_at: new Date().toISOString() })
      .eq("inspection_id", inspectionId);
    if (submitError) return fail(reportRefusal(submitError.message));
  }

  const saved = await readReport(db, inspectionId);
  if (!saved) return fail("We saved that but could not read it back. Refresh to see where it stands.");

  revalidatePath("/bookings");
  revalidatePath("/agent/inspections");
  return ok(saved);
}

/**
 * A SIGNED PATH INTO THE PRIVATE BUCKET, AND THE PATH IS THE PERMISSION.
 *
 * `<inspection_id>/<uuid>.<ext>`, which is what
 * `private.inspection_photo_path_access` reads: the first segment decides, so
 * a person cannot upload into somebody else's inspection even holding a signed
 * URL, and cannot read out of one.
 *
 * The extension is taken from a closed list rather than from the file name,
 * because a name arrives from a browser and a bucket's mime rules are not a
 * substitute for not trusting it.
 */

const photoUploadSchema = z.object({
  inspectionId: z.string().uuid(),
  extension: z.string().trim().toLowerCase().max(8),
  item: z.enum(REPORT_ITEMS).optional().nullable(),
});

export async function createInspectionPhotoUpload(
  input: unknown,
): Promise<ActionResult<{ path: string; token: string }>> {
  const parsed = validate(photoUploadSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const session = await resolveSession();
  if (session.state !== "signed-in") return fail("Sign in to add a photo.");

  const extension = PHOTO_EXTENSIONS[parsed.data.extension as keyof typeof PHOTO_EXTENSIONS];
  if (!extension) {
    return fail("That file type cannot be attached. Use a photo or a PDF.", {
      extension: "Use a JPG, PNG, WEBP, HEIC or PDF.",
    });
  }

  const path = `${parsed.data.inspectionId}/${crypto.randomUUID()}.${extension}`;
  const { data, error } = await session.supabase.storage
    .from("inspection-photos")
    .createSignedUploadUrl(path);

  if (error || !data) return fail(reportRefusal(error?.message ?? ""));
  return ok({ path: data.path, token: data.token });
}

/**
 * I1b. THE ROW THAT MAKES AN UPLOADED OBJECT PART OF THE REPORT.
 *
 * `createInspectionPhotoUpload` hands the browser a signed URL and the browser
 * PUTs the bytes straight at storage. Nothing reaches this server in between,
 * which is the point: a photo of a damp wall does not need to travel through a
 * server action to get into a bucket. But an object sitting in a bucket that no
 * row points at is invisible to every screen, so this is the second half, and
 * the screen calls it once the upload resolves.
 *
 * WHY THE PATH IS CHECKED HERE AS WELL AS IN STORAGE. The bucket's own policies
 * read the first path segment (`private.inspection_photo_path_access`), so a
 * person genuinely cannot write bytes into somebody else's folder. This row is a
 * different object in a different schema, and nothing about the storage policy
 * stops a caller posting `{ inspectionId: mine, storagePath: "<someone else>/x.jpg" }`
 * and hanging their photo off my report. So the path's first segment must equal
 * the inspection it is being attached to, and the extension must be one we
 * issued. **A signed upload proves where the bytes went. It does not prove what
 * the caller then says about them.**
 *
 * The insert itself goes through the caller's own RLS-bound client, so being a
 * party to the inspection, and the report still being open, are both decided by
 * Postgres rather than restated here.
 */
const addPhotoSchema = z.object({
  inspectionId: z.string().uuid(),
  storagePath: z.string().trim().min(3).max(200),
  item: z.enum(REPORT_ITEMS).optional().nullable(),
});

export type ReportPhoto = { id: string; storagePath: string; item: string | null; createdAt: string };

export async function addReportPhoto(input: unknown): Promise<ActionResult<ReportPhoto>> {
  const parsed = validate(addPhotoSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const session = await resolveSession();
  if (session.state !== "signed-in") return fail("Sign in to add a photo.");

  const { inspectionId, storagePath, item } = parsed.data;

  if (!photoPathBelongsTo(inspectionId, storagePath)) {
    return fail("That photo could not be attached to this inspection. Try the upload again.", {
      storagePath: "This file does not belong to this inspection.",
    });
  }

  const { data, error } = await session.supabase
    .from("inspection_report_photos")
    .insert({ inspection_id: inspectionId, storage_path: storagePath, item: item ?? null })
    .select("id, storage_path, item, created_at")
    .single();

  if (error || !data) {
    /* 23505 is the same object attached twice, which is a double tap on a slow
       connection rather than a fault, so it reads as one. */
    if (error?.code === "23505") return fail("That photo is already on this report.");
    return fail(reportRefusal(error?.message ?? ""));
  }

  revalidatePath("/bookings");
  revalidatePath("/agent/inspections");
  return ok({
    id: data.id,
    storagePath: data.storage_path,
    item: data.item,
    createdAt: data.created_at,
  });
}

/**
 * The row after the write, read back through the caller's own session so it
 * carries exactly what that person is allowed to see.
 */
type ReportClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => Promise<{ data: unknown[] | null }>;
    };
  };
};

async function readReport(db: unknown, inspectionId: string): Promise<InspectionReport | null> {
  const client = db as ReportClient;
  const [report, items] = await Promise.all([
    client.from("inspection_reports").select("inspection_id, notes, submitted_at").eq("inspection_id", inspectionId),
    client.from("inspection_report_items").select("item, checked, note").eq("inspection_id", inspectionId),
  ]);
  const row = (report.data ?? [])[0] as
    | { inspection_id: string; notes: string | null; submitted_at: string | null }
    | undefined;
  if (!row) return null;
  return {
    inspectionId: row.inspection_id,
    notes: row.notes,
    submittedAt: row.submitted_at,
    items: ((items.data ?? []) as { item: string; checked: boolean; note: string | null }[])
      .filter((i): i is { item: (typeof REPORT_ITEMS)[number]; checked: boolean; note: string | null } =>
        (REPORT_ITEMS as readonly string[]).includes(i.item),
      )
      .sort((a, b) => REPORT_ITEMS.indexOf(a.item) - REPORT_ITEMS.indexOf(b.item)),
  };
}

/**
 * A report refusal, as a sentence somebody can act on.
 *
 * The eight-room rule is the one people will actually meet, so it says the
 * number rather than "that could not be saved". The RLS refusals read as a
 * missing row rather than as an error, which is why the closed-inspection case
 * is phrased as a state and not as a permission.
 */
function reportRefusal(raw: string): string {
  if (raw.includes("all eight rooms are checked")) {
    return "Tick all eight rooms before you submit the report.";
  }
  if (raw.includes("row-level security") || raw.includes("violates row-level security policy")) {
    return "This report cannot be changed now. It is either submitted already or the inspection is closed.";
  }
  if (raw.includes("inspection_reports_pkey")) {
    return "A report for this inspection already exists. Refresh to see it.";
  }
  return "We could not save that. Try again in a moment.";
}
