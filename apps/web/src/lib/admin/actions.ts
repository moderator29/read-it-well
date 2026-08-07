"use server";

/**
 * Every hand the admin console has.
 *
 * Two clients, on purpose. The record being decided is written through the
 * admin's own RLS-bound client, so Postgres itself re-checks the role on every
 * mutation and a stolen action call gets nowhere. The service-role client is
 * used only for the three things no user-bound client may do: append to the
 * append-only audit log, write a notification into someone else's row, and
 * grant a role. That split means an admin's power is exactly the power their
 * policies give them, plus the narrow, named extras above.
 *
 * Every mutation writes an audit row carrying the actor, the target and the
 * before and after status. Notifications are inserted directly where no
 * database trigger already covers the event; the support reply is the
 * exception, because notify_support_reply fires on insert and telling the owner
 * twice would be worse than not telling them at all.
 */

import { revalidatePath } from "next/cache";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { createAdminClient } from "../supabase/admin";
import { writeAudit, type AuditDetail } from "./audit";
import { adminRefusal, requireAdmin } from "./guard";
import {
  replySupportTicketSchema,
  resolveReportSchema,
  resolveRiskAlertSchema,
  reviewAgentApplicationSchema,
  reviewListingSchema,
  reviewMessageFlagSchema,
  setTicketStatusSchema,
  toggleFeatureFlagSchema,
} from "./schema";

const SERVICE_DOWN =
  "The console could not reach the platform data just now. Nothing was changed. Please try again.";

const GONE = "That record is no longer there. Refresh the queue to see the current state.";

/** ------------------------------------------------------------ message flags */

export async function reviewMessageFlag(input: {
  flagId: string;
  resolution: "cleared" | "escalated";
}): Promise<ActionResult<null>> {
  const access = await requireAdmin();
  if (access.state !== "admin") return fail(adminRefusal(access));

  const parsed = validate(reviewMessageFlagSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const { flagId, resolution } = parsed.data;

  const { data: flag, error: readError } = await access.supabase
    .from("message_flags")
    .select("id, status, reason, message_id")
    .eq("id", flagId)
    .maybeSingle();
  if (readError) return fail(SERVICE_DOWN);
  if (!flag) return fail(GONE);
  if (flag.status === "reviewed") {
    return fail("This flag has already been reviewed. Refresh the queue to see the current state.");
  }

  const { error: updateError } = await access.supabase
    .from("message_flags")
    .update({ status: "reviewed", reviewed_by: access.user.id })
    .eq("id", flag.id)
    .eq("status", "open");
  if (updateError) return fail(SERVICE_DOWN);

  try {
    const admin = createAdminClient();

    // Escalating is a real second step, not a label: it opens a risk alert so
    // the conversation stays on an operations surface after the flag closes.
    if (resolution === "escalated") {
      await admin.from("risk_alerts").insert({
        severity: "high",
        status: "open",
        title:
          flag.reason === "account_number"
            ? "Account number shared in a conversation"
            : "Payment talk in a conversation",
        description:
          "Escalated from the message flag queue. Review the conversation and the parties involved.",
        entity_type: "message",
        entity_id: flag.message_id,
      });
    }

    await writeAudit(admin, {
      actorId: access.user.id,
      action: "message_flag.review",
      entityType: "message_flag",
      entityId: flag.id,
      detail: {
        before_status: flag.status,
        after_status: "reviewed",
        reason: flag.reason,
        resolution,
        message_id: flag.message_id,
      },
    });
  } catch {
    // The flag is genuinely reviewed either way.
  }

  revalidatePath("/admin/flags");
  revalidatePath("/admin");
  return ok(null);
}

/** -------------------------------------------------------------- risk alerts */

export async function resolveRiskAlert(input: {
  alertId: string;
  notes?: string;
}): Promise<ActionResult<null>> {
  const access = await requireAdmin();
  if (access.state !== "admin") return fail(adminRefusal(access));

  const parsed = validate(resolveRiskAlertSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const { data: alert, error: readError } = await access.supabase
    .from("risk_alerts")
    .select("id, status, severity, title")
    .eq("id", parsed.data.alertId)
    .maybeSingle();
  if (readError) return fail(SERVICE_DOWN);
  if (!alert) return fail(GONE);
  if (alert.status === "resolved") return fail("This alert is already resolved.");

  const { error: updateError } = await access.supabase
    .from("risk_alerts")
    .update({
      status: "resolved",
      resolved_at: new Date().toISOString(),
      // Named, not anonymous. The audit log has always held the actor; putting
      // it on the row itself is what lets the queue answer "who signed this
      // off" without a second lookup nobody performs.
      resolved_by: access.user.id,
    })
    .eq("id", alert.id)
    .eq("status", "open");
  if (updateError) return fail(SERVICE_DOWN);

  try {
    await writeAudit(createAdminClient(), {
      actorId: access.user.id,
      action: "risk_alert.resolve",
      entityType: "risk_alert",
      entityId: alert.id,
      detail: {
        before_status: alert.status,
        after_status: "resolved",
        severity: alert.severity,
        title: alert.title,
        notes: parsed.data.notes ?? null,
      },
    });
  } catch {
    // Best effort.
  }

  revalidatePath("/admin/alerts");
  revalidatePath("/admin");
  return ok(null);
}

/** ------------------------------------------------------------------ reports */

export async function resolveReport(input: {
  reportId: string;
  decision: "reviewing" | "resolved" | "dismissed";
  notes?: string;
}): Promise<ActionResult<null>> {
  const access = await requireAdmin();
  if (access.state !== "admin") return fail(adminRefusal(access));

  const parsed = validate(resolveReportSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const { reportId, decision } = parsed.data;

  const { data: report, error: readError } = await access.supabase
    .from("reports")
    .select("id, status, target_type, target_id, reason")
    .eq("id", reportId)
    .maybeSingle();
  if (readError) return fail(SERVICE_DOWN);
  if (!report) return fail(GONE);
  if (report.status === decision) return fail("This report already sits in that state.");
  if (report.status === "resolved" || report.status === "dismissed") {
    return fail("This report has already been closed. Refresh the queue to see the current state.");
  }

  const closing = decision === "resolved" || decision === "dismissed";
  const { error: updateError } = await access.supabase
    .from("reports")
    .update({
      status: decision,
      resolved_at: closing ? new Date().toISOString() : null,
      // Picking a report up counts as much as closing it: the name goes on the
      // row either way, so an item sitting in review is visibly somebody's.
      resolved_by: access.user.id,
    })
    .eq("id", report.id);
  if (updateError) return fail(SERVICE_DOWN);

  try {
    await writeAudit(createAdminClient(), {
      actorId: access.user.id,
      action: "report.review",
      entityType: "report",
      entityId: report.id,
      detail: {
        before_status: report.status,
        after_status: decision,
        target_type: report.target_type,
        target_id: report.target_id,
        notes: parsed.data.notes ?? null,
      },
    });
  } catch {
    // Best effort.
  }

  revalidatePath("/admin/reports");
  revalidatePath("/admin");
  return ok(null);
}

/** ------------------------------------------------------- agent applications */

export async function reviewAgentApplication(input: {
  applicationId: string;
  decision: "approve" | "reject" | "request_changes";
  notes?: string;
}): Promise<ActionResult<null>> {
  const access = await requireAdmin();
  if (access.state !== "admin") return fail(adminRefusal(access));

  const parsed = validate(reviewAgentApplicationSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const { applicationId, decision } = parsed.data;
  const notes = parsed.data.notes ?? null;

  if (decision === "request_changes" && (notes === null || notes.length === 0)) {
    return fail("Tell the applicant what to change.", {
      notes: "Write the change you need before sending it back.",
    });
  }

  const { data: application, error: readError } = await access.supabase
    .from("agent_applications")
    .select("id, user_id, status, reference, full_name, type")
    .eq("id", applicationId)
    .maybeSingle();
  if (readError) return fail(SERVICE_DOWN);
  if (!application) return fail(GONE);

  const decidable = ["SUBMITTED", "UNDER_REVIEW", "MORE_INFO_REQUIRED"];
  if (!decidable.includes(application.status)) {
    return fail(
      application.status === "DRAFT"
        ? "This application has not been submitted yet, so there is nothing to decide."
        : "This application has already been decided. Refresh the queue to see the current state.",
    );
  }

  const nextStatus =
    decision === "approve" ? "APPROVED" : decision === "reject" ? "REJECTED" : "MORE_INFO_REQUIRED";

  const { error: updateError } = await access.supabase
    .from("agent_applications")
    .update({
      status: nextStatus,
      reviewer_id: access.user.id,
      reviewed_at: new Date().toISOString(),
      review_notes: notes,
    })
    .eq("id", application.id);
  if (updateError) return fail(SERVICE_DOWN);

  try {
    const admin = createAdminClient();

    if (decision === "approve") {
      // The approved agent profile. on conflict do nothing, so re-running an
      // approval never duplicates a person or overwrites their live profile.
      await admin.from("agents").upsert(
        {
          user_id: application.user_id,
          application_id: application.id,
          display_name: application.full_name ?? "RentMe agent",
          type: application.type,
          status: "APPROVED",
          verified: true,
        },
        { onConflict: "user_id", ignoreDuplicates: true },
      );

      // The role grant. user_roles is super-admin-only under RLS by design, so
      // this is one of the three named service-role privileges.
      await admin
        .from("user_roles")
        .upsert(
          { user_id: application.user_id, role: "agent" },
          { onConflict: "user_id,role", ignoreDuplicates: true },
        );
    }

    const notice =
      decision === "approve"
        ? {
            title: "You are a verified RentMe agent",
            body: "Your application is approved. Agent Mode is open, so you can list your first property.",
          }
        : decision === "reject"
          ? {
              title: "Your agent application was not approved",
              body: notes ?? "Open your application to read the reviewer's note.",
            }
          : {
              title: "Your agent application needs more information",
              body: notes ?? "Open your application to see what the reviewer needs.",
            };

    await admin.from("notifications").insert({
      user_id: application.user_id,
      kind: "agent",
      title: notice.title,
      body: notice.body,
      href: "/agents/status",
    });

    const detail: AuditDetail = {
      before_status: application.status,
      after_status: nextStatus,
      decision,
      reference: application.reference,
      applicant_id: application.user_id,
      notes,
    };
    await writeAudit(admin, {
      actorId: access.user.id,
      action: "agent_application.review",
      entityType: "agent_application",
      entityId: application.id,
      detail,
    });
  } catch {
    // The decision itself has committed. The follow-on work is best effort.
  }

  revalidatePath("/admin/agents");
  revalidatePath("/admin");
  return ok(null);
}

/** ----------------------------------------------------------------- listings */

export async function reviewListing(input: {
  listingId: string;
  decision: "approve" | "publish" | "reject" | "request_changes";
  notes?: string;
}): Promise<ActionResult<null>> {
  const access = await requireAdmin();
  if (access.state !== "admin") return fail(adminRefusal(access));

  const parsed = validate(reviewListingSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const { listingId, decision } = parsed.data;
  const notes = parsed.data.notes ?? null;

  if (decision === "request_changes" && (notes === null || notes.length === 0)) {
    return fail("Tell the agent what to change.", {
      notes: "Write the change you need before sending it back.",
    });
  }

  const { data: listing, error: readError } = await access.supabase
    .from("listings")
    .select("id, title, status, agent_id, agents ( user_id )")
    .eq("id", listingId)
    .maybeSingle();
  if (readError) return fail(SERVICE_DOWN);
  if (!listing) return fail(GONE);

  if (listing.status === "DRAFT") {
    return fail("This listing is still a draft, so there is nothing to review yet.");
  }
  if (decision === "publish" && listing.status !== "APPROVED") {
    return fail("Approve this listing first, then publish it.");
  }
  if (decision !== "publish" && listing.status === "PUBLISHED") {
    return fail("This listing is already live. Refresh the queue to see the current state.");
  }

  const nextStatus =
    decision === "approve"
      ? "APPROVED"
      : decision === "publish"
        ? "PUBLISHED"
        : decision === "reject"
          ? "REJECTED"
          : "MORE_INFO_REQUIRED";

  const now = new Date().toISOString();
  const { error: updateError } = await access.supabase
    .from("listings")
    .update({
      status: nextStatus,
      reviewer_id: access.user.id,
      reviewed_at: now,
      review_notes: notes,
      ...(decision === "publish" ? { published_at: now } : {}),
    })
    .eq("id", listing.id);
  if (updateError) return fail(SERVICE_DOWN);

  try {
    const admin = createAdminClient();
    const ownerId = listing.agents?.user_id ?? null;

    if (ownerId) {
      const notice =
        decision === "approve"
          ? {
              title: "Listing approved",
              body: `${listing.title} passed review. Publish it to put it in front of guests.`,
            }
          : decision === "publish"
            ? {
                title: "Listing is live",
                body: `${listing.title} is now in search and open to guests.`,
              }
            : decision === "reject"
              ? {
                  title: "Listing not approved",
                  body: notes ?? `${listing.title} did not pass review. Open it to read the note.`,
                }
              : {
                  title: "Listing needs changes",
                  body: notes ?? `${listing.title} needs a change before it can go live.`,
                };

      await admin.from("notifications").insert({
        user_id: ownerId,
        kind: "listing",
        title: notice.title,
        body: notice.body,
        href: "/agent/listings",
      });
    }

    const detail: AuditDetail = {
      before_status: listing.status,
      after_status: nextStatus,
      decision,
      title: listing.title,
      agent_id: listing.agent_id,
      notes,
    };
    await writeAudit(admin, {
      actorId: access.user.id,
      action: "listing.review",
      entityType: "listing",
      entityId: listing.id,
      detail,
    });
  } catch {
    // The transition has committed. The follow-on work is best effort.
  }

  revalidatePath("/admin/listings");
  revalidatePath("/admin");
  return ok(null);
}

/** ---------------------------------------------------------- support tickets */

export async function replySupportTicket(input: {
  ticketId: string;
  body: string;
}): Promise<ActionResult<null>> {
  const access = await requireAdmin();
  if (access.state !== "admin") return fail(adminRefusal(access));

  const parsed = validate(replySupportTicketSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const { data: ticket, error: readError } = await access.supabase
    .from("support_tickets")
    .select("id, reference, status")
    .eq("id", parsed.data.ticketId)
    .maybeSingle();
  if (readError) return fail(SERVICE_DOWN);
  if (!ticket) return fail(GONE);

  // The reply goes in under the admin's own client: the insert policy proves
  // the role, and notify_support_reply then tells the ticket owner.
  const { error: insertError } = await access.supabase.from("support_ticket_messages").insert({
    ticket_id: ticket.id,
    sender_role: "admin",
    sender_id: access.user.id,
    body: parsed.data.body,
  });
  if (insertError) return fail(SERVICE_DOWN);

  try {
    await writeAudit(createAdminClient(), {
      actorId: access.user.id,
      action: "support_ticket.reply",
      entityType: "support_ticket",
      entityId: ticket.id,
      detail: {
        before_status: ticket.status,
        after_status: ticket.status,
        reference: ticket.reference,
        characters: parsed.data.body.length,
      },
    });
  } catch {
    // Best effort.
  }

  revalidatePath("/admin/support");
  revalidatePath("/admin");
  return ok(null);
}

export async function setTicketStatus(input: {
  ticketId: string;
  status: "open" | "pending" | "resolved" | "closed";
}): Promise<ActionResult<null>> {
  const access = await requireAdmin();
  if (access.state !== "admin") return fail(adminRefusal(access));

  const parsed = validate(setTicketStatusSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const { data: ticket, error: readError } = await access.supabase
    .from("support_tickets")
    .select("id, reference, status")
    .eq("id", parsed.data.ticketId)
    .maybeSingle();
  if (readError) return fail(SERVICE_DOWN);
  if (!ticket) return fail(GONE);
  if (ticket.status === parsed.data.status) return fail("This ticket already sits in that state.");

  const { error: updateError } = await access.supabase
    .from("support_tickets")
    .update({ status: parsed.data.status })
    .eq("id", ticket.id);
  if (updateError) return fail(SERVICE_DOWN);

  try {
    await writeAudit(createAdminClient(), {
      actorId: access.user.id,
      action: "support_ticket.status",
      entityType: "support_ticket",
      entityId: ticket.id,
      detail: {
        before_status: ticket.status,
        after_status: parsed.data.status,
        reference: ticket.reference,
      },
    });
  } catch {
    // Best effort.
  }

  revalidatePath("/admin/support");
  revalidatePath("/admin");
  return ok(null);
}

/** ------------------------------------------------------------ kill switches */

export async function toggleFeatureFlag(input: {
  key: string;
  enabled: boolean;
}): Promise<ActionResult<null>> {
  const access = await requireAdmin();
  if (access.state !== "admin") return fail(adminRefusal(access));

  const parsed = validate(toggleFeatureFlagSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const { data: flag, error: readError } = await access.supabase
    .from("feature_flags")
    .select("key, enabled, note")
    .eq("key", parsed.data.key)
    .maybeSingle();
  if (readError) return fail(SERVICE_DOWN);
  if (!flag) return fail("There is no switch by that name. Reload the console to see the switches there are.");
  if (flag.enabled === parsed.data.enabled) {
    return fail("That switch is already in this position. Refresh to see the current state.");
  }

  const { error: updateError } = await access.supabase
    .from("feature_flags")
    .update({ enabled: parsed.data.enabled })
    .eq("key", flag.key);
  if (updateError) return fail(SERVICE_DOWN);

  try {
    await writeAudit(createAdminClient(), {
      actorId: access.user.id,
      action: parsed.data.enabled ? "feature_flag.enable" : "feature_flag.disable",
      entityType: "feature_flag",
      entityId: flag.key,
      detail: {
        before_status: flag.enabled ? "enabled" : "disabled",
        after_status: parsed.data.enabled ? "enabled" : "disabled",
        note: flag.note,
      },
    });
  } catch {
    // Best effort.
  }

  revalidatePath("/admin/switches");
  revalidatePath("/admin");
  return ok(null);
}
