"use server";

/**
 * FILING ONE OF THE THREE REGISTRATIONS.
 *
 * `GOVERNING-03`, `04` and `05` each end on a screen that says what happened.
 * This is the thing that has to have happened for those screens to be honest:
 * one real row in `public.agent_applications`, written through the applicant's
 * OWN client under the same Row Level Security that guards reading it back,
 * with a reference the person can quote to support.
 *
 * ---------------------------------------------------------------------------
 * WHY IT IS NOT `submitAgentApplication`, AND WHY THAT ONE IS NOT TOUCHED
 *
 * `lib/agent/application.ts` files the six step professional application and
 * it refuses anything without both sides of an ID, a bank account and a ticked
 * terms box. That is right for what it is. It is wrong for these three, which
 * ask four screens of questions and then hand the person to the verification
 * ladder for the rest, so forcing them through it would mean either refusing
 * every owner or gutting the older form's rules for everybody. Two callers,
 * two actions, one table, and the older action is left exactly as it is.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS ACTION DOES NOT DO, AND IT IS THE IMPORTANT PARAGRAPH
 *
 * IT DOES NOT CREATE AN `agents` ROW AND IT DOES NOT APPROVE ANYBODY. Insert
 * on `public.agents` is admin only by policy, and that is the correct shape:
 * granting supply access without a human reading the application would make
 * the platform's own verified mark meaningless, and first party trust is the
 * one thing this product cannot spend. So all three forms file a SUBMITTED
 * application and all three confirmation screens say so in those words.
 *
 * `GOVERNING-03` screen four reads "You are set up as an owner" and that is
 * the one line of the three images this build does not copy, for the reason
 * the reference set itself gives about counts and statistics in a render: it
 * is example content, and a platform that tells somebody they are set up
 * before a person has looked is a platform whose marks mean nothing. The
 * composition, the object, the panel and the controls are the render's; the
 * claim is not.
 *
 * ---------------------------------------------------------------------------
 * AND WHAT IT NEVER LOGS
 *
 * No National Identity Number, no document number, no storage path and no
 * phone number reaches a log line, an error message or an audit row from here.
 * The refusals describe the SHAPE of what was wrong and never echo the value.
 */

import { revalidatePath } from "next/cache";
import { fail, ok, type ActionResult } from "../actions/envelope";
import {
  NOT_CONFIGURED_MESSAGE,
  SIGNED_OUT_MESSAGE,
  resolveSession,
} from "../actions/session";
import { createAdminClient } from "../supabase/admin";
import type { Database } from "../supabase/database.types";
import { normalisePhone } from "../phone";
import {
  firmRegistrationRefined,
  registrationSchema,
  type Registration,
} from "./registration";

export type RegistrationFiled = {
  /** The VL-AGT-##### the person quotes to support. */
  reference: string;
  role: Registration["role"];
  /**
   * Whether their answers can ever earn the ownership mark.
   *
   * Carried back so the confirmation screen can say the true thing without
   * re-deriving it, and false is NOT a failure: it is the state most owners
   * are in and the screen treats it as ordinary.
   */
  canEarnOwnershipMark: boolean;
  /**
   * Whether the files this form carried are attached to the filed row.
   *
   * False is not a failed submission and is never drawn as one. It is an
   * application a reviewer cannot open the documents for, which is a different
   * and smaller problem, and the person is told about it on the confirmation
   * screen with the reference in their hand rather than left to find out by
   * waiting.
   */
  documentsAttached: boolean;
};

/** Documents the three forms may carry, and the kind each one is filed as. */
const DOCUMENT_KINDS = {
  idPath: "identity",
  selfiePath: "selfie",
  letterPath: "association",
} as const;

export async function submitSupplyRegistration(
  input: unknown,
): Promise<ActionResult<RegistrationFiled>> {
  /*
   * Parsed BEFORE the session is resolved, so somebody whose form is wrong is
   * told which field is wrong rather than being asked to sign in and then told
   * the same thing again. Nothing is read or written until it passes.
   */
  const shallow = registrationSchema.safeParse(input);
  if (!shallow.success) {
    return fail("Please check the highlighted fields and try again.", issuesOf(shallow.error));
  }

  let value: Registration = shallow.data;
  if (value.role === "firm") {
    const refined = firmRegistrationRefined.safeParse(input);
    if (!refined.success) {
      return fail("Please check the highlighted fields and try again.", issuesOf(refined.error));
    }
    value = refined.data;
  }

  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);
  const { supabase, user } = session;

  /*
   * Every storage path must sit under this caller's own uid folder. Storage
   * RLS enforces the same rule on the upload itself, so a path that fails here
   * was never written by this user and has no business being recorded against
   * their application. The refusal names no path.
   */
  const prefix = `${user.id}/`;
  const documents: { kind: string; path: string }[] = [];
  for (const [field, kind] of Object.entries(DOCUMENT_KINDS)) {
    const path = (value as Record<string, unknown>)[field];
    if (typeof path !== "string" || path === "") continue;
    if (!path.startsWith(prefix)) {
      return fail("Those uploads did not come from your own account, so we did not file them.", {
        [field]: "Please choose the file again.",
      });
    }
    documents.push({ kind, path });
  }

  const row = rowFor(value, user.id, user.email ?? null);

  const { data: inserted, error } = await supabase
    .from("agent_applications")
    .insert(row)
    .select("id, reference")
    .single();

  if (error || !inserted) {
    return fail(
      "We could not file this just now. Nothing you typed was lost, so please try again in a moment.",
    );
  }

  if (documents.length > 0) {
    const write = await supabase.from("agent_documents").insert(
      documents.map((doc) => ({
        application_id: inserted.id,
        uploader_id: user.id,
        kind: doc.kind,
        storage_path: doc.path,
      })),
    );
    /*
     * The application is filed and that is real, so a document that did not
     * attach is not reported as a failed submission. But an application a
     * reviewer cannot open the files for is stuck, so the person is told
     * plainly with the reference rather than left to find out by waiting.
     */
    if (write.error) {
      await tellThem(user.id, inserted.reference, value.role);
      revalidatePath("/profile/application");
      return ok({
        reference: inserted.reference,
        role: value.role,
        canEarnOwnershipMark: ownershipMarkPossible(value),
        documentsAttached: false,
      });
    }
  }

  await tellThem(user.id, inserted.reference, value.role);

  revalidatePath("/profile/application");
  revalidatePath("/profile");

  return ok({
    reference: inserted.reference,
    role: value.role,
    canEarnOwnershipMark: ownershipMarkPossible(value),
    documentsAttached: true,
  });
}

/* ------------------------------------------------------------------ parts */

function issuesOf(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.map(String).join(".") : "_";
    if (!(key in fieldErrors)) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

function ownershipMarkPossible(value: Registration): boolean {
  return value.role === "owner" ? value.ownershipDocument !== "none" : false;
}

/**
 * The row, per role, and every column is named rather than spread.
 *
 * Three forms share one table and each fills a different third of it. Spreading
 * a form object into the insert would file whatever the client happened to
 * send, which is how a column nobody meant to write gets written.
 *
 * `type` stays `individual` or `business` and is NOT repurposed. It has never
 * meant owner or agent, five surfaces read it, and `supply_role` is the honest
 * answer to the question it was never asked. A firm is the one registration
 * that genuinely is a business, so it is the one that sets it.
 */
type ApplicationInsert = Database["public"]["Tables"]["agent_applications"]["Insert"];

function rowFor(
  value: Registration,
  userId: string,
  email: string | null,
): ApplicationInsert {
  const base = {
    user_id: userId,
    email,
    status: "SUBMITTED" as const,
    supply_role: value.role,
    agree_terms: true,
    submitted_at: new Date().toISOString(),
  };

  if (value.role === "owner") {
    return {
      ...base,
      type: "individual" as const,
      full_name: value.fullName,
      phone: normalisePhone(value.phone) ?? value.phone,
      /* Where they OWN, not where they sleep. `residential_address` is left
         null rather than filled with a property's address, and the column
         comment on the migration says so. */
      state_code: value.stateCode,
      city: value.lgaCode,
      area: value.area === "" ? null : (value.area ?? null),
      id_type: value.nin ? "nin" : null,
      id_number: value.nin === "" ? null : (value.nin ?? null),
      ownership_document: value.ownershipDocument,
    };
  }

  if (value.role === "agent") {
    return {
      ...base,
      type: "individual" as const,
      full_name: value.fullName,
      phone: normalisePhone(value.phone) ?? value.phone,
      years_experience: value.experience,
      id_type: value.nin ? "nin" : null,
      id_number: value.nin === "" ? null : (value.nin ?? null),
      /* Null stays null. A fee nobody declared is not a fee of nothing. */
      agency_fee_bps: value.agencyFeeBps,
      legal_fee_bps: value.legalFeeBps,
    };
  }

  return {
    ...base,
    type: "business" as const,
    full_name: value.fullName,
    business_name: value.businessName,
    business_rc: value.rcNumber,
    business_address: value.officeAddress,
    lasrera_number: value.lasreraNumber === "" ? null : (value.lasreraNumber ?? null),
    association_proof: value.associationProof,
    principal_email: value.principalEmail === "" ? null : (value.principalEmail ?? null),
    firm_team: value.team ?? [],
  };
}

/**
 * The one notification, and it is the applicant's own.
 *
 * `notifications` has no client insert policy at all, deliberately, so this
 * goes through the service role. A failed notification must not turn a filed
 * application into a reported failure, which is the rule
 * `admin/verification-actions.ts` already states, so it is caught and
 * swallowed here and the caller is told about the application it actually
 * made.
 */
async function tellThem(userId: string, reference: string, role: Registration["role"]) {
  const what =
    role === "owner"
      ? "Your owner registration is filed"
      : role === "agent"
        ? "Your agent registration is filed"
        : "Your firm registration is filed";
  try {
    const admin = createAdminClient();
    await admin.from("notifications").insert({
      user_id: userId,
      kind: "agent",
      title: what,
      body: `Filed as ${reference}. A person reads this and we will tell you the moment it comes back.`,
      href: "/profile/application",
    });
  } catch {
    /* Filed is filed. The confirmation screen carries the reference either
       way, and support can find the row by it. */
  }
}
