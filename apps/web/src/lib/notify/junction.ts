import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { bestEffortEmail, sendMessage } from "@/lib/email/client";
import type { EmailMessage } from "@/lib/email/messages";
import { contactForAgent, contactForUser, type Contact } from "@/lib/email/recipients";
import type { Database } from "@/lib/supabase/database.types";

/**
 * THE EMAIL AND NOTIFICATION JUNCTION.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS FILE EXISTS.
 *
 * This platform had two halves of one idea and they had never met. The in-app
 * notification layer worked: `lib/admin/actions.ts` inserted a `notifications`
 * row on all four listing decisions and all three registration decisions, with
 * the reviewer's own words carried verbatim. The email layer worked too: a
 * hand-written Resend client, a block renderer, a catalogue of builders and a
 * fixture set.
 *
 * NOT ONE DECISION SENT AN EMAIL. `listingApproved`, `listingRejected` and
 * `welcome` were all complete, all in the fixtures, and all had zero callers,
 * because the two modules that take every listing and registration decision
 * imported nothing from `lib/email`. For a marketplace whose listers are
 * agents working from a phone and who will not be sitting inside the app at
 * eleven on a Tuesday when a reviewer clicks a button, an in-app row on its
 * own is a note left in an empty room.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS MODULE PROMISES, AND WHY EACH ONE IS LOAD BEARING.
 *
 * 1. ONE CALL, BOTH HALVES. A decision announces itself once. There is no way
 *    to write the row and forget the mail, which is the failure this whole
 *    file exists to make impossible rather than merely discouraged.
 *
 * 2. NEITHER HALF CAN BREAK THE OTHER, AND NEITHER CAN BREAK THE DECISION.
 *    The transition has already committed by the time anything here runs. The
 *    row and the send are guarded separately, so a Resend outage still leaves
 *    the in-app row, and a notifications insert that fails still lets the
 *    email go. Nothing here throws, ever.
 *
 * 3. THE IN-APP ROW IS ATTEMPTED FIRST, because it is free, it is in our own
 *    database, and it is the half that is still there next week when somebody
 *    finally opens the app.
 *
 * 4. THE ADDRESS IS NEVER SUPPLIED BY A CALLER. It is resolved here through
 *    `lib/email/recipients`, which reads it with the service role from the
 *    auth record. A function that accepted an address would eventually be
 *    handed one from a form.
 *
 * 5. THE RESULT IS RETURNED RATHER THAN SWALLOWED. The caller may ignore it,
 *    and the admin console does, but a test can assert that a decision really
 *    did try to email somebody, which is the only way this stays wired.
 *
 * ---------------------------------------------------------------------------
 * WHAT IS DELIBERATELY NOT HERE.
 *
 * NO CHANNEL MUTE. `emailMuted` exists and is honoured on bookings, messages,
 * wallet and marketing. A decision about your own listing or your own
 * application is none of those: it is the platform answering something you
 * asked it, and there is no setting on `/settings` that claims to switch it
 * off. Passing a channel here would silence a message the product has promised
 * to send.
 *
 * NO OUTBOX, YET. Every event this module serves is raised by a server action
 * that is already awaiting a database write, so a direct send is honest here.
 * The events only a database trigger can see (a new enquiry, a saved search
 * match) need a durable outbox, and that is written up in
 * `docs/research/EMAIL_AND_NOTIFICATIONS_RESEARCH.md` rather than half built
 * here.
 *
 * NO PUSH. There is no device token table and no FCM registration, and the
 * Android manifest's own comment is the right policy: do not spend the one
 * notification prompt a person reliably grants on a channel that cannot
 * deliver.
 */

type AdminClient = SupabaseClient<Database>;

/** Who the announcement is about. */
export type Recipient =
  | { kind: "user"; userId: string }
  /** A listing's owner, which is one hop further: `listings.agent_id` points
      at `public.agents`, whose `user_id` is the auth user. */
  | { kind: "agent"; agentId: string };

export type InAppNotice = {
  kind: Database["public"]["Enums"]["notification_kind"];
  title: string;
  body: string;
  /**
   * Where tapping it should land.
   *
   * Worth being exact about: every host notification points at `/host` and
   * every listing notification at `/agent/listings`, whatever happened. A
   * person told "we need something more" lands on their standing page rather
   * than on the step that is short. That flatness is a real defect and it is
   * named here so the next person to pass through fixes it rather than
   * inheriting it silently.
   */
  href: string;
};

export type Announcement = {
  recipient: Recipient;
  notice: InAppNotice;
  /**
   * The email, built from the contact once it is resolved, or null when this
   * event has no email.
   *
   * A function rather than a value because the greeting name is part of the
   * message and is not known until the recipient has been looked up. Building
   * it early would mean either greeting nobody or greeting them by a name read
   * twice.
   */
  email: ((contact: Contact) => Pick<EmailMessage, "subject" | "html" | "text">) | null;
};

export type AnnounceResult = {
  /** True when the in-app row was written. */
  notified: boolean;
  /**
   * What happened to the email. `skipped` covers the three honest cases: this
   * event has no email, nobody could be resolved to send it to, or there is no
   * Resend key configured on this deployment.
   */
  emailed: "sent" | "failed" | "skipped";
};

/**
 * Tell somebody what was decided, in both channels.
 *
 * Never throws. The caller's transition has already committed and nothing
 * here is allowed to undo that, so every failure resolves to a quieter result
 * rather than to an exception.
 */
export async function announce(
  admin: AdminClient,
  announcement: Announcement,
): Promise<AnnounceResult> {
  const userId = await resolveUserId(admin, announcement.recipient);
  if (!userId) return { notified: false, emailed: "skipped" };

  /* The in-app row first: our own database, no network beyond it, and the half
     that is still there next week. */
  let notified = false;
  try {
    const { error } = await admin.from("notifications").insert({
      user_id: userId,
      kind: announcement.notice.kind,
      title: announcement.notice.title,
      body: announcement.notice.body,
      href: announcement.notice.href,
    });
    notified = !error;
  } catch {
    notified = false;
  }

  if (!announcement.email) return { notified, emailed: "skipped" };

  let emailed: AnnounceResult["emailed"] = "skipped";
  await bestEffortEmail(async () => {
    const contact =
      announcement.recipient.kind === "agent"
        ? await contactForAgent(admin, announcement.recipient.agentId)
        : await contactForUser(admin, userId);
    if (!contact) return;
    const built = announcement.email?.(contact);
    if (!built) return;
    const result = await sendMessage(contact.email, built);
    emailed = result.sent ? "sent" : "failed";
  });

  return { notified, emailed };
}

/** The auth user behind a recipient, or null when there is not one any more. */
async function resolveUserId(admin: AdminClient, recipient: Recipient): Promise<string | null> {
  if (recipient.kind === "user") return recipient.userId;
  try {
    const { data } = await admin
      .from("agents")
      .select("user_id")
      .eq("id", recipient.agentId)
      .maybeSingle();
    return data?.user_id ?? null;
  } catch {
    return null;
  }
}
