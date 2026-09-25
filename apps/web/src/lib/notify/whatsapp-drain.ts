import "server-only";

import { isLocale } from "@vallo/i18n/core";
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
 *     the past is noise, and the app already shows it. Age counts from when
 *     the bell was FREE to ring: `not_before` for a bell held through quiet
 *     hours, `created_at` otherwise, so a ten-hour night kills nothing;
 *   - quiet hours are honoured, except for money (the urgent class): a held
 *     row gets `not_before` = the end of the window and is not even read
 *     again until then;
 *   - money bells are read first, so a queue of social bells cannot starve
 *     them out of a drain's fifty;
 *   - the row is CLAIMED first (status `queued`/`failed` to `sending` in one
 *     update, with `claimed_at`), so two drains cannot both send it; a claim
 *     older than ten minutes (a drain that died mid-send) is swept back to
 *     `failed` at the start of every drain;
 *   - the one variable, the path, is re-checked by `doorbellParam`, and the
 *     number is read from the account's confirmed phone, never stored here.
 *
 * NO CREDENTIALS, NO TOUCH: with the stub transport the queue is left alone.
 * Not scheduled yet (see the migration).
 */

const MAX_AGE_MS = 6 * 60 * 60 * 1000;
const STUCK_CLAIM_MS = 10 * 60 * 1000;
const SEEN_KEEP_MS = 7 * 86_400_000;

type Row = {
  id: string;
  user_id: string;
  event: DoorbellEvent;
  path: string;
  attempts: number;
  created_at: string;
  not_before: string | null;
};

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
  const nowIso = now.toISOString();

  /* A drain that died mid-send left its claim: hand the row back. */
  await admin
    .from("whatsapp_queue")
    .update({ status: "failed", last_error: "claim_expired" })
    .eq("status", "sending")
    .lt("claimed_at", new Date(now.getTime() - STUCK_CLAIM_MS).toISOString());
  await admin.from("whatsapp_inbound_seen").delete().lt("seen_at", new Date(now.getTime() - SEEN_KEEP_MS).toISOString());

  /* Money first, then the rest; neither reads a row still held. */
  const due = (urgent: boolean, room: number) => {
    const query = admin
      .from("whatsapp_queue")
      .select("id, user_id, event, path, attempts, created_at, not_before")
      .in("status", ["queued", "failed"])
      .lt("attempts", 5)
      .or(`not_before.is.null,not_before.lte.${nowIso}`);
    return (urgent ? query.eq("event", "money_update") : query.neq("event", "money_update"))
      .order("created_at", { ascending: true })
      .limit(room);
  };
  const { data: money } = await due(true, limit);
  const moneyRows = (Array.isArray(money) ? money : []) as Row[];
  const { data: rest } = moneyRows.length < limit ? await due(false, limit - moneyRows.length) : { data: [] };
  const rows = [...moneyRows, ...((Array.isArray(rest) ? rest : []) as Row[])];

  for (const row of rows) {
    if (!open) {
      await dead(admin, row.id, "flag_shut");
      counts.skipped += 1;
      continue;
    }
    if (now.getTime() - Date.parse(row.not_before ?? row.created_at) > MAX_AGE_MS) {
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
      await admin.from("whatsapp_queue").update({ not_before: quiet.until.toISOString() }).eq("id", row.id);
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
      .update({ status: "sending", attempts: row.attempts + 1, claimed_at: nowIso })
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
