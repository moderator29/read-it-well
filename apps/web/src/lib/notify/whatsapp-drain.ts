import "server-only";

import { isLocale } from "@vallo/i18n";
import { DOORBELL_TEMPLATES, cloudTransport, doorbellParam, e164, templateLanguage, type DoorbellEvent, type WhatsAppTransport } from "./whatsapp";

/**
 * THE DOORBELL QUEUE, DRAINED. V-96.
 *
 * Reads `whatsapp_queue` with the service role, and for each row sends the
 * event's template with its ONE variable, the path, re-checked by
 * `doorbellParam` on the way out. The number comes from the account's
 * confirmed phone at send time and is never stored in the queue.
 *
 * NO CREDENTIALS, NO TOUCH: with the stub transport the queue is left exactly
 * as it is, so the day a key arrives everything waiting is still there.
 * Not scheduled yet (see the migration); the function is what a cron route
 * calls when it is.
 */

type Row = { id: string; user_id: string; event: DoorbellEvent; path: string; attempts: number };

type Admin = {
  from: (t: string) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
  auth: { admin: { getUserById: (id: string) => Promise<{ data: { user: { phone?: string | null; phone_confirmed_at?: string | null } | null } }> } };
};

export type DrainCounts = { sent: number; failed: number; skipped: number; idle: boolean };

export async function whatsappDrain(admin: Admin, transport: WhatsAppTransport = cloudTransport(), limit = 50): Promise<DrainCounts> {
  const counts: DrainCounts = { sent: 0, failed: 0, skipped: 0, idle: false };
  if (!transport.configured) return { ...counts, idle: true };

  const { data } = await admin
    .from("whatsapp_queue")
    .select("id, user_id, event, path, attempts")
    .in("status", ["queued", "failed"])
    .lt("attempts", 5)
    .order("created_at", { ascending: true })
    .limit(limit);
  for (const row of (Array.isArray(data) ? data : []) as Row[]) {
    const param = doorbellParam(row.path);
    const user = await admin.auth.admin.getUserById(row.user_id).catch(() => ({ data: { user: null } }));
    const to = user.data.user?.phone_confirmed_at ? e164(user.data.user.phone ? `+${user.data.user.phone.replace(/^\+/, "")}` : null) : null;
    if (!param || !to) {
      await admin.from("whatsapp_queue").update({ status: "dead", last_error: !param ? "unsafe_path" : "no_phone" }).eq("id", row.id);
      counts.skipped += 1;
      continue;
    }
    const { data: profile } = await admin.from("profiles").select("settings").eq("id", row.user_id).maybeSingle();
    const locale = (profile?.settings as { locale?: unknown } | null)?.locale;
    const result = await transport.sendTemplate({
      to,
      template: DOORBELL_TEMPLATES[row.event],
      languageCode: templateLanguage(typeof locale === "string" && isLocale(locale) ? locale : "en"),
      linkPath: param,
    });
    if (result.outcome === "sent") {
      await admin.from("whatsapp_queue").update({ status: "sent", sent_at: new Date().toISOString(), attempts: row.attempts + 1 }).eq("id", row.id);
      counts.sent += 1;
    } else {
      await admin
        .from("whatsapp_queue")
        .update({ status: row.attempts + 1 >= 5 ? "dead" : "failed", attempts: row.attempts + 1, last_error: (result.error ?? "failed").slice(0, 60) })
        .eq("id", row.id);
      counts.failed += 1;
    }
  }
  return counts;
}
