"use server";

/**
 * Deciding on a stays business, and recording its rungs.
 *
 * The same machine as `reviewListing`, applied to the operator entity: a
 * human moves SUBMITTED to APPROVED, then a second, property-level gate moves
 * an accommodation to PUBLISHED. Two gates rather than one, because approving
 * an operator and putting a specific property on the shelf are different
 * judgements and the second one has a requirement the first cannot check
 * (the pin, MK-55).
 *
 * A REFUSAL AND A SEND-BACK CARRY THE REVIEWER'S WORDS, and the minimum is
 * twelve characters rather than a token four for the reason `kyc-actions.ts`
 * gives: "blurry" is a complete and useful sentence and "no" is not. A host
 * told no with nothing to answer uploads the same document again and
 * concludes the platform is refusing them personally.
 *
 * THE TIER IS NEVER WRITTEN HERE. `business_verification_checks` is the only
 * thing this file writes for verification, and a database trigger recomputes
 * `businesses.verification_tier` and the badge from the rungs that actually
 * passed, so the badge a guest eventually sees can only be the sum of
 * decisions somebody made.
 *
 * The decision goes through the admin's own RLS-bound client, so Postgres
 * re-checks the role on the mutation rather than trusting a page that already
 * checked. The audit line and the owner's notification are the service role's
 * work, because `audit_log` has no insert policy for anybody and
 * `notifications` has no client insert policy at all, both deliberately, and
 * both are best effort after the decision has committed: a failed log line
 * must not turn a real decision into an error the operator cannot act on.
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { createAdminClient } from "../supabase/admin";
import type { Database } from "../supabase/database.types";
import { writeAudit, type AuditDetail } from "./audit";
import { BUSINESS_LADDER, BUSINESS_TIER_NAME, asBusinessTier } from "./business-ladder";
import { BUSINESS_RUNGS } from "./business-queries";
import { adminRefusal, requireAdmin } from "./guard";

type ListingStatus = Database["public"]["Enums"]["listing_status"];

const SERVICE_DOWN =
  "That decision could not be recorded just now. Nothing was changed. Please try again.";
const GONE = "That application is no longer there. Refresh the queue to see the current state.";

/** The shortest note that can actually be answered. See the header. */
const MIN_NOTE = 12;
const MAX_NOTE = 400;

const noteSchema = z
  .string()
  .trim()
  .min(MIN_NOTE, "Say what is wrong, in a sentence the host can answer.")
  .max(MAX_NOTE, `Keep the note under ${MAX_NOTE} characters.`);

const businessIdSchema = z.object({
  businessId: z.uuid("That application could not be identified."),
});

const withNoteSchema = businessIdSchema.extend({ note: noteSchema });

const rungSchema = businessIdSchema.extend({
  rung: z.enum(BUSINESS_RUNGS, { message: "Pick one of the four checks." }),
  status: z.enum(["passed", "failed"], { message: "Say whether it passed or failed." }),
  note: z.string().trim().max(MAX_NOTE).optional().or(z.literal("")),
});

type BusinessRow = {
  id: string;
  name: string;
  status: ListingStatus;
  owner_id: string | null;
  source: Database["public"]["Enums"]["source_kind"];
};

function refreshConsole(): void {
  revalidatePath("/admin/businesses");
  revalidatePath("/admin");
}

/** Tell the owner, and write the line. Both best effort, both after the fact. */
async function announce(
  actorId: string,
  business: BusinessRow,
  notice: { title: string; body: string } | null,
  audit: { action: string; detail: AuditDetail },
): Promise<void> {
  try {
    const admin = createAdminClient();
    if (notice && business.owner_id) {
      await admin.from("notifications").insert({
        user_id: business.owner_id,
        kind: "listing",
        title: notice.title,
        body: notice.body,
        href: "/host",
      });
    }
    await writeAudit(admin, {
      actorId,
      action: audit.action,
      entityType: "business",
      entityId: business.id,
      detail: audit.detail,
    });
  } catch {
    // The decision has committed. The follow-on work is best effort.
  }
}

/* ---------------------------------------------------------------- decisions */

async function decide(
  input: unknown,
  decision: "approve" | "more_info" | "reject",
  schema: typeof businessIdSchema | typeof withNoteSchema,
): Promise<ActionResult<null>> {
  const access = await requireAdmin();
  if (access.state !== "admin") return fail(adminRefusal(access));

  const parsed = validate(schema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const businessId = parsed.data.businessId;
  const note = "note" in parsed.data ? parsed.data.note : null;

  const { data: business, error: readError } = await access.supabase
    .from("businesses")
    .select("id, name, status, owner_id, source")
    .eq("id", businessId)
    .maybeSingle();
  if (readError) return fail(SERVICE_DOWN);
  if (!business) return fail(GONE);

  if (business.status === "DRAFT") {
    return fail("This application is still a draft, so there is nothing to review yet.");
  }
  if (business.status === "PUBLISHED" && decision !== "reject") {
    return fail("This business is already live. Refresh the queue to see the current state.");
  }

  const nextStatus: ListingStatus =
    decision === "approve" ? "APPROVED" : decision === "reject" ? "REJECTED" : "MORE_INFO_REQUIRED";

  const now = new Date().toISOString();
  const { error: updateError } = await access.supabase
    .from("businesses")
    .update({
      status: nextStatus,
      reviewer_id: access.user.id,
      reviewed_at: now,
      review_notes: note,
    })
    .eq("id", business.id);
  if (updateError) return fail(SERVICE_DOWN);

  const notice =
    decision === "approve"
      ? {
          title: "Your business is approved",
          body: `${business.name} passed review. Add or finish a property and we will put it in front of guests.`,
        }
      : decision === "reject"
        ? {
            title: "Your application was not approved",
            body: note ?? `${business.name} did not pass review. Open it to read the note.`,
          }
        : {
            title: "We need something more",
            body: note ?? `${business.name} needs a change before it can go live.`,
          };

  await announce(access.user.id, business as BusinessRow, notice, {
    action: "business.review",
    detail: {
      before_status: business.status,
      after_status: nextStatus,
      decision,
      name: business.name,
      note,
    },
  });

  refreshConsole();
  return ok(null);
}

/** SUBMITTED or UNDER_REVIEW to APPROVED. No note needed to say yes. */
export async function approveBusiness(input: { businessId: string }): Promise<ActionResult<null>> {
  return decide(input, "approve", businessIdSchema);
}

/** Send it back with the reviewer's words, which the host is shown verbatim. */
export async function requestMoreInfo(input: {
  businessId: string;
  note: string;
}): Promise<ActionResult<null>> {
  return decide(input, "more_info", withNoteSchema);
}

/** Refuse it, with a reason. A refusal with no reason is the cruel failure. */
export async function rejectBusiness(input: {
  businessId: string;
  note: string;
}): Promise<ActionResult<null>> {
  return decide(input, "reject", withNoteSchema);
}

/* ------------------------------------------------------------ the shelf gate */

const publishSchema = z.object({
  accommodationId: z.uuid("That property could not be identified."),
});

/**
 * Put one property on the shelf: APPROVED to PUBLISHED.
 *
 * THE PIN IS REQUIRED AND THAT IS THE WHOLE GATE (MK-55). A stay a guest
 * cannot find on a map is a stay they arrive late to, in a city where "off
 * Admiralty Way" is an address. A cover photo and one bookable room with a
 * rate are checked here too, because a published property with neither is a
 * dead end wearing a price.
 *
 * The parent business must be APPROVED first: publishing a property belonging
 * to an operator nobody has read would put the second gate in front of the
 * first.
 */
export async function publishAccommodation(input: {
  accommodationId: string;
}): Promise<ActionResult<null>> {
  const access = await requireAdmin();
  if (access.state !== "admin") return fail(adminRefusal(access));

  const parsed = validate(publishSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const { data: property, error: readError } = await access.supabase
    .from("accommodations")
    .select(
      "id, name, status, latitude, longitude, business_id, accommodation_photos(id), room_types(id, rate_plans(id)), businesses(id, name, status, owner_id, source)",
    )
    .eq("id", parsed.data.accommodationId)
    .maybeSingle();
  if (readError) return fail(SERVICE_DOWN);
  if (!property || !property.businesses) return fail(GONE);

  const business = property.businesses;
  if (business.status !== "APPROVED" && business.status !== "PUBLISHED") {
    return fail("Approve the business first, then publish its property.");
  }
  if (property.status === "PUBLISHED") {
    return fail("This property is already live. Refresh the queue to see the current state.");
  }
  if (property.latitude === null || property.longitude === null) {
    return fail(
      "This property has no pin on the map, so it cannot be published. Ask the host to place it.",
    );
  }
  if (property.accommodation_photos.length === 0) {
    return fail("This property has no photographs, so there is nothing to show a guest.");
  }
  const bookable = property.room_types.some((roomType) => roomType.rate_plans.length > 0);
  if (!bookable) {
    return fail("This property has no room with a rate, so nobody could book it.");
  }

  const now = new Date().toISOString();
  const { error: updateError } = await access.supabase
    .from("accommodations")
    .update({
      status: "PUBLISHED",
      reviewer_id: access.user.id,
      reviewed_at: now,
      published_at: now,
    })
    .eq("id", property.id);
  if (updateError) return fail(SERVICE_DOWN);

  // The business goes live with its first published property, so a host does
  // not have to be told to do a second thing they cannot do. The property is
  // already published by this point, so a failure here is not a failure of
  // the decision: it is written into the audit line (the lead's B0 audit,
  // item 4) and the admin is told the one thing left to do.
  let businessPublished: boolean | null = null;
  if (business.status === "APPROVED") {
    const { error: businessError } = await access.supabase
      .from("businesses")
      .update({ status: "PUBLISHED", published_at: now })
      .eq("id", business.id);
    businessPublished = !businessError;
  }

  await announce(
    access.user.id,
    business as BusinessRow,
    {
      title: "Your property is live",
      body: `${property.name} is now in search and open to guests.`,
    },
    {
      action: "accommodation.publish",
      detail: {
        accommodation_id: property.id,
        accommodation_name: property.name,
        business_name: business.name,
        photo_count: property.accommodation_photos.length,
        business_published: businessPublished,
      },
    },
  );

  if (businessPublished === false) {
    refreshConsole();
    revalidatePath("/stays");
    return fail(
      "The property is published, but the business could not be marked live at the same time. Open the business and publish it from there.",
    );
  }

  refreshConsole();
  revalidatePath("/stays");
  return ok(null);
}

/* ------------------------------------------------ the shelf gate, part two */

/**
 * Put one RESTAURANT on the shelf: APPROVED to PUBLISHED.
 *
 * WHY THIS EXISTS AT ALL. `publishAccommodation` above is the only code path
 * in the product that has ever written PUBLISHED on a business, and every one
 * of its four gates is about a property: an `accommodations` row, a pin, a
 * photograph and a room type with a rate. A restaurant has none of those and
 * never will, so a venue could be put in front of guests only by somebody
 * writing SQL by hand, which is what happened to the first first-party venue
 * (ledger 12.5) and is not a process.
 *
 * THE GATE, AND THE REASONING FOR EVERY LINE OF IT. The rule cannot be
 * borrowed from the stays side, so it is derived from two places: what
 * `private.reservation_is_valid` refuses a table for, and what the venue's own
 * page has to be able to read to be a real place rather than a stub.
 *
 *   A SERVICE WINDOW WITH COVERS ABOVE ZERO. This is the hard one. The
 *   database works out whether a venue can take a booking entirely from
 *   `service_windows`; with none, EVERY request is refused with "that
 *   restaurant does not seat guests at that time", and the owner sits for a
 *   fortnight watching a page that looks perfectly fine take no bookings.
 *   Publishing a venue that cannot accept a single table is publishing a dead
 *   end, which is the same fault the room-with-a-rate gate prevents next door.
 *
 *   A CITY AND A STATE. `listRestaurants` filters by state and city and
 *   `catalogue_entries` files the venue under them, so a venue with neither is
 *   unreachable from every shelf in the product. It would be live and
 *   invisible, which is worse than not being live, because nobody would go
 *   looking for the reason.
 *
 *   A PHONE NUMBER THAT SOMEBODY ANSWERS. A reservation is a request a venue
 *   answers in its own time and the platform holds nothing. When the app is
 *   not enough - a guest is late, a party has grown - the phone is the only
 *   remaining route, and it is the one thing the onboarding script marks
 *   REQUIRED for exactly this reason.
 *
 *   FIRST PARTY, NOT AN EXAMPLE, AND ACTUALLY A RESTAURANT. These three are
 *   not judgement calls: they are the conditions `private.reservation_is_valid`
 *   itself imposes, so a venue published without them is a page whose only
 *   control refuses every use. Checking them here means the refusal is a
 *   sentence a reviewer can act on rather than a trigger exception nobody sees.
 *
 * WHAT IS DELIBERATELY NOT A GATE.
 *
 *   PHOTOGRAPHS. The stays gate requires one because a stay with no
 *   photographs is a dead end wearing a price. A restaurant page is not that:
 *   it draws a Vallo category plate under a plain "No photographs yet" chip,
 *   so a guest is never shown a stock picture as if it were this dining room,
 *   and a table costs nobody anything. The onboarding script promises an owner
 *   they can go live the day they sign and send their photographs during the
 *   week; making a photograph a gate would make that promise false. The desk
 *   says what is missing instead of refusing.
 *
 *   THE PIN. Same argument, and `search_catalogue` admits a row with a null
 *   location inside a radius filter: a missing pin costs distance sorting and
 *   the map, not visibility. The stays gate (MK-55) is about somebody arriving
 *   at a building at night with a suitcase; a diner choosing a restaurant has
 *   the address, the area and the phone.
 *
 *   A RUNG, OR A BADGE. Nothing on this path reads or writes the verification
 *   ladder. Publishing is a decision about inventory and the ladder is a
 *   decision about a person, and tying the two together is how a venue ends up
 *   wearing a mark no human check earned.
 *
 * The business must be APPROVED first, for the same reason the stays gate
 * insists on it: putting the second gate in front of the first would publish
 * an operator nobody has read.
 */
export async function publishRestaurant(input: {
  businessId: string;
}): Promise<ActionResult<null>> {
  const access = await requireAdmin();
  if (access.state !== "admin") return fail(adminRefusal(access));

  const parsed = validate(businessIdSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const { data: business, error: readError } = await access.supabase
    .from("businesses")
    .select(
      "id, name, kind, status, owner_id, source, is_demo, city, state_code, phone, service_windows(covers)",
    )
    .eq("id", parsed.data.businessId)
    .maybeSingle();
  if (readError) return fail(SERVICE_DOWN);
  if (!business) return fail(GONE);

  if (business.kind !== "restaurant") {
    return fail(
      "This is not a restaurant. A stay goes live from its property, which carries the pin and the rooms.",
    );
  }
  if (business.status === "PUBLISHED") {
    return fail("This venue is already live. Refresh the queue to see the current state.");
  }
  if (business.status !== "APPROVED") {
    return fail("Approve the application first, then put the venue on the shelf.");
  }
  if (business.source !== "first_party") {
    return fail(
      "Only a first-party venue is published from here. Partner inventory is labelled where it is shown and never dressed as ours.",
    );
  }
  if (business.is_demo) {
    return fail("This venue is an example, so it cannot take a table and must not go on the shelf.");
  }
  if (!business.city || !business.state_code) {
    return fail(
      "This venue has no city and state on record, so no shelf in the product could show it. Add them and try again.",
    );
  }
  if (!business.phone) {
    return fail(
      "This venue has no phone number, so a guest who needs the restaurant itself has no way to reach it.",
    );
  }
  const seats = business.service_windows.filter((window) => window.covers > 0).length;
  if (seats === 0) {
    return fail(
      "This venue has no service with covers above zero, so every request for a table would be refused. Add the hours and the guest number first.",
    );
  }

  const now = new Date().toISOString();
  const { error: updateError } = await access.supabase
    .from("businesses")
    .update({ status: "PUBLISHED", published_at: now })
    .eq("id", business.id)
    .eq("status", "APPROVED");
  if (updateError) return fail(SERVICE_DOWN);

  await announce(
    access.user.id,
    business as BusinessRow,
    {
      title: "Your venue is live",
      body: `${business.name} is now in search and open for tables. You answer each request yourself, and nothing is held for a guest until you do.`,
    },
    {
      action: "business.publish",
      detail: {
        name: business.name,
        kind: business.kind,
        service_windows: seats,
        city: business.city,
        state_code: business.state_code,
      },
    },
  );

  refreshConsole();
  revalidatePath("/restaurants");
  return ok(null);
}

/* -------------------------------------------------------------- the rungs */

/**
 * Record one rung on a business's ladder.
 *
 * One rung, one decision, one row, and the tier is read back rather than
 * predicted: the trigger owns the number, and a separate statement is the
 * only way to see what it actually wrote, because every subquery in one
 * statement shares a snapshot taken before it ran.
 *
 * A failed rung must say why. It can drop a business's tier in public, and a
 * host who is told their registration check failed with no reason cannot
 * answer it.
 */
export async function recordBusinessRung(input: {
  businessId: string;
  rung: (typeof BUSINESS_RUNGS)[number];
  status: "passed" | "failed";
  note?: string;
}): Promise<ActionResult<null>> {
  const access = await requireAdmin();
  if (access.state !== "admin") return fail(adminRefusal(access));

  const parsed = validate(rungSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const { businessId, rung, status } = parsed.data;
  const note = parsed.data.note && parsed.data.note.length > 0 ? parsed.data.note : null;

  if (status === "failed" && (note === null || note.length < MIN_NOTE)) {
    return fail("Say what did not check out.", {
      note: "A failed check has to carry a reason the host can answer.",
    });
  }

  const { data: business, error: readError } = await access.supabase
    .from("businesses")
    .select("id, name, status, owner_id, source, verification_tier")
    .eq("id", businessId)
    .maybeSingle();
  if (readError) return fail(SERVICE_DOWN);
  if (!business) return fail(GONE);
  if (business.source !== "first_party") {
    return fail("Only a first-party business carries a verification ladder.");
  }

  const before = business.verification_tier;

  const { error: writeError } = await access.supabase
    .from("business_verification_checks")
    .upsert(
      {
        business_id: business.id,
        rung,
        status,
        note,
        reviewer_id: access.user.id,
        decided_at: new Date().toISOString(),
      },
      { onConflict: "business_id,rung" },
    );
  if (writeError) return fail(SERVICE_DOWN);

  const { data: after } = await access.supabase
    .from("businesses")
    .select("verification_tier, verified")
    .eq("id", business.id)
    .maybeSingle();
  const now = after?.verification_tier ?? before;

  /*
   * THE OWNER HEARS ABOUT EVERY DECISION, not only a change of level. A
   * passed rung that leaves the tier where it was (a registration check
   * recorded before identity) is still a decision about their business that
   * somebody took, and a failed one always carries the reviewer's words. The
   * tier name is the ladder's own, so the notification and the status page
   * say the same thing.
   */
  const label = BUSINESS_LADDER[rung].label;
  const tierName = BUSINESS_TIER_NAME[asBusinessTier(now)];
  const notice =
    status === "passed"
      ? {
          title: now > before ? "Your verification level has gone up" : `${label} check passed`,
          body:
            now > before
              ? `The ${label.toLowerCase()} check passed. Your business is now ${tierName.toLowerCase()}, and guests can see how far it has been checked.`
              : `The ${label.toLowerCase()} check passed. Your level stays ${tierName.toLowerCase()} until the checks below it pass too.`,
        }
      : {
          title: `${label} check did not pass`,
          body: `${note ?? ""} Your level is now ${tierName.toLowerCase()}. Answer the note from your host page and we will look again.`.trim(),
        };

  await announce(access.user.id, business as BusinessRow, notice, {
    action: "business.verification_check",
    detail: {
      rung,
      status,
      tier_before: before,
      tier_after: now,
      verified: after?.verified ?? false,
      note,
      business_name: business.name,
    },
  });

  refreshConsole();
  return ok(null);
}

/*
 * One action per rung, on the generic recorder, so a desk button and a test
 * can name the rung they mean without passing a string the schema has to
 * check. Each is the research's rung (sections 3.3 and 3.4): identity from
 * the document on file, registration from the free CAC public search (or the
 * address, for an individual host), payout from the resolved bank name
 * beside the identity or business name, on site from a visit or a video call.
 */
type RungDecision = { businessId: string; status: "passed" | "failed"; note?: string };

/** Rung 1: the representative's government ID, seen. */
export async function recordIdentityCheck(input: RungDecision): Promise<ActionResult<null>> {
  return recordBusinessRung({ ...input, rung: "identity" });
}

/** Rung 2: the CAC record matches, or for an individual host the address does. */
export async function recordRegistrationCheck(input: RungDecision): Promise<ActionResult<null>> {
  return recordBusinessRung({ ...input, rung: "registration" });
}

/** Rung 3: the resolved bank account name matches the person or the business. */
export async function recordPayoutCheck(input: RungDecision): Promise<ActionResult<null>> {
  return recordBusinessRung({ ...input, rung: "payout" });
}

/** Rung 4: somebody from Vallo has stood in the property or seen it live. */
export async function recordOnSiteCheck(input: RungDecision): Promise<ActionResult<null>> {
  return recordBusinessRung({ ...input, rung: "on_site" });
}
