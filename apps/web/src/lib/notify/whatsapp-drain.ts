import "server-only";

import { isLocale } from "@vallo/i18n";
import { quietVerdict, readQuietHours } from "../push/quiet-hours";
import { DOORBELL_TEMPLATES, cloudTransport, doorbellParam, e164, templateLanguage, type DoorbellEvent, type WhatsAppTransport } from "./whatsapp";

/**
 * THE DOORBELL QUEUE, DRAINED. V-96.
 *
 * Reads `whatsapp_queue` with the service role. For each row, AT SEND TIME:
 *
 *   - the `whatsapp_doorbell` flag must still be on and the person must still
 *     have the switch on, or the row is dead (a switch turned off an hour ago
 *     is not overridden by a row queued before it);
 *   - a row older than six hours is dead: a bell about something that far in
 *     the past is noise, and the app already shows it;
 *   - quiet hours are honoured, except for money (the urgent class), and a
 *     held row simply waits for the next drain;
 *   - the row is CLAIMED first (status `queued`/`failed` to `sending` in one
 *     update), so two drains cannot both send it;
 *   - the one variable, the path, is re-checked by `doorbellParam`, and the
 *     number is read from the account's confirmed phone, never stored here.
 *
 * NO CREDENTIALS, NO TOUCH: with the stub transport the queue is left alone.
 * Not scheduled yet (see the migration).
 */

const MAX_AGE_MS = 6 * 60 * 60 * 1000;

type Row = { id: string; user_id: string; event: DoorbellEvent; path: string; attempts: number; created_at: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = any;
type Admin = {
  from: (t: string) => Loose;
  auth: { admin: { getUserById: (id: string) => Promise<{ data: { user: { phone?: string | null; phone_confirmed_at?: string | null } | null } }> } };
};

export type DrainCounts = { sent: number; failed: number; skipped: number; held: number; idle: boolean };

async function flagOn(admin: Admin): Promise<boolean> {
  try {
    const { data, error } = await admin.from("feature_flags").select("enabled").eq("key", "whatsapp_doorbell").maybeSingle();
    return !error && data?.enabled === true;
  } catch {
    return false;
  }
}

async function dead(admin: Admin, id: string, reason: string): Promise<void> {
  await admin.from("whatsapp_queue").update({ status: "dead", last_error: reason }).eq("id", id);
}

export async function whatsappDrain(
  admin: Admin,
  transport: WhatsAppTransport = cloudTransport(),
  now: Date = new Date(),
  limit = 50,
): Promise<DrainCounts> {
  const counts: DrainCounts = { sent: 0, failed: 0, skipped: 0, held: 0, idle: false };
  if (!transport.configured) return { ...counts, idle: true };
  const open = await flagOn(admin);

  const { data } = await admin
    .from("whatsapp_queue")
    .select("id, user_id, event, path, attempts, created_at")
    .in("status", ["queued", "failed"])
    .lt("attempts", 5)
    .order("created_at", { ascending: true })
    .limit(limit);

  for (const row of (Array.isArray(data) ? data : []) as Row[]) {
    if (!open) {
      await dead(admin, row.id, "flag_shut");
      counts.skipped += 1;
      continue;
    }
    if (now.getTime() - Date.parse(row.created_at) > MAX_AGE_MS) {
      await dead(admin, row.id, "too_old");
      counts.skipped += 1;
      continue;
    }
    const { data: profile } = await admin.from("profiles").select("settings").eq("id", row.user_id).maybeSingle();
    const settings = (profile?.settings ?? null) as { whatsappDoorbell?: unknown; locale?: unknown } | null;
    if (settings?.whatsappDoorbell !== true) {
      await dead(admin, row.id, "switched_off");
      counts.skipped += 1;
      continue;
    }
    const quiet = quietVerdict({ quiet: readQuietHours(settings), at: now, urgent: row.event === "money_update" });
    if (quiet.held) {
      counts.held += 1;
      continue;
    }
    const param = doorbellParam(row.path);
    const user = await admin.auth.admin.getUserById(row.user_id).catch(() => ({ data: { user: null } }));
    const phone = user.data.user?.phone_confirmed_at ? user.data.user.phone ?? null : null;
    const to = phone ? e164(`+${phone.replace(/^\+/, "")}`) : null;
    if (!param || !to) {
      await dead(admin, row.id, !param ? "unsafe_path" : "no_phone");
      counts.skipped += 1;
      continue;
    }

    /* Claim it: only one drain gets the row. */
    const { data: claimed } = await admin
      .from("whatsapp_queue")
      .update({ status: "sending", attempts: row.attempts + 1 })
      .eq("id", row.id)
      .in("status", ["queued", "failed"])
      .select("id");
    if (!Array.isArray(claimed) || claimed.length !== 1) continue;

    const locale = settings?.locale;
    const result = await transport.sendTemplate({
      to,
      template: DOORBELL_TEMPLATES[row.event],
      languageCode: templateLanguage(typeof locale === "string" && isLocale(locale) ? locale : "en"),
      linkPath: param,
    });
    if (result.outcome === "sent") {
      await admin.from("whatsapp_queue").update({ status: "sent", sent_at: now.toISOString() }).eq("id", row.id);
      counts.sent += 1;
    } else {
      await admin
        .from("whatsapp_queue")
        .update({ status: row.attempts + 1 >= 5 ? "dead" : "failed", last_error: (result.error ?? "failed").slice(0, 60) })
        .eq("id", row.id);
      counts.failed += 1;
    }
  }
  return counts;
}
