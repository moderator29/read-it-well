import { sameOriginPath } from "../push/same-origin";

/**
 * WHATSAPP IS A DOORBELL, NEVER A ROOM. V-96.
 *
 * THE CHANNEL POLICY, written once:
 *
 *   PUSH FIRST for everything with a device (`lib/push/policy.ts`).
 *   WHATSAPP only for the five events where a missed notice costs money or
 *     safety, as a Meta utility template that says what happened and carries
 *     ONE link into Vallo. Never the content of a message, a price, an
 *     account number or an address: the template has one variable, and it is
 *     a path on our own origin, checked here and again in the database.
 *   INBOUND WHATSAPP to Vallo's number gets one automatic reply sending the
 *     person into Vallo. No human replies on WhatsApp, ever.
 *   SMS only for one-time codes and money at risk with no WhatsApp (not here).
 *
 * Three of the five events have a source today (inspection confirmed or
 * changed, inspection tomorrow, money arrived or failed). A stop or recall
 * (V-60) and the principal heartbeat (V-31) are named so their templates are
 * approved with the others, and are sent by nothing until those exist.
 *
 * FAIL CLOSED. Nothing is queued unless the `whatsapp_doorbell` flag is on
 * AND the person switched it on (a switch that appears only once a transport
 * exists, V-02), and nothing is sent without the Cloud API credentials.
 */

export const DOORBELL_EVENTS = [
  "inspection_update",
  "inspection_tomorrow",
  "money_update",
  "stop_or_recall",
  "principal_heartbeat",
] as const;
export type DoorbellEvent = (typeof DOORBELL_EVENTS)[number];

/** The Meta-approved utility template for each event. One variable: the path. */
export const DOORBELL_TEMPLATES: Record<DoorbellEvent, string> = {
  inspection_update: "vallo_inspection_update",
  inspection_tomorrow: "vallo_inspection_tomorrow",
  money_update: "vallo_money_update",
  stop_or_recall: "vallo_stop_or_recall",
  principal_heartbeat: "vallo_principal_heartbeat",
};

/**
 * Which doorbell, if any, a notification rings. Mirrored in SQL by
 * `private.whatsapp_event_for` (`20260924160500_v96_...sql`); the test holds
 * the two to the same cases.
 */
export function doorbellEventFor(kind: string, href: string | null, title: string): DoorbellEvent | null {
  const path = sameOriginPath(href);
  if (!path) return null;
  if (kind === "wallet") return "money_update";
  if (kind === "listing" && path.startsWith("/inspections")) {
    return /\btomorrow\b/i.test(title) ? "inspection_tomorrow" : "inspection_update";
  }
  return null;
}

/**
 * The template's one variable. Refused unless it is a same-origin path with
 * no long digit run (an account number or a phone) and no money sign, so a
 * careless caller cannot turn the bell into a room.
 */
export function doorbellParam(path: string | null): string | null {
  const safe = sameOriginPath(path);
  if (!safe || safe.length > 120) return null;
  if (/\d{6,}/.test(safe) || /[₦$]|NGN/i.test(safe)) return null;
  return safe;
}

/** A WhatsApp number in E.164, or null. */
export function e164(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const digits = value.replace(/[\s()-]/g, "");
  return /^\+[1-9]\d{7,14}$/.test(digits) ? digits : null;
}

/* ------------------------------------------------------------ transport */

export type WhatsAppSend = { to: string; template: string; languageCode: string; linkPath: string };
export type WhatsAppResult = { outcome: "sent" | "failed" | "not_configured"; error?: string };

export interface WhatsAppTransport {
  /** False for the stub: nothing is claimed or sent. */
  readonly configured: boolean;
  sendTemplate(message: WhatsAppSend): Promise<WhatsAppResult>;
  sendText(to: string, body: string): Promise<WhatsAppResult>;
}

/** No credentials: says so, touches nothing. */
export const stubTransport: WhatsAppTransport = {
  configured: false,
  async sendTemplate() {
    return { outcome: "not_configured" };
  },
  async sendText() {
    return { outcome: "not_configured" };
  },
};

const LANGUAGE: Record<string, string> = { en: "en", yo: "yo", ha: "ha", ig: "ig" };
export function templateLanguage(locale: string): string {
  return LANGUAGE[locale] ?? "en";
}

/**
 * The WhatsApp Cloud API, when `WHATSAPP_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID`
 * are set. Server only; the token never reaches a browser.
 */
export function cloudTransport(env: Record<string, string | undefined> = process.env): WhatsAppTransport {
  const token = env.WHATSAPP_TOKEN;
  const phoneId = env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) return stubTransport;
  const url = `https://graph.facebook.com/v21.0/${encodeURIComponent(phoneId)}/messages`;
  const post = async (body: unknown): Promise<WhatsAppResult> => {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10_000),
      });
      return response.ok ? { outcome: "sent" } : { outcome: "failed", error: `http_${response.status}` };
    } catch {
      return { outcome: "failed", error: "network" };
    }
  };
  return {
    configured: true,
    sendTemplate(message) {
      return post({
        messaging_product: "whatsapp",
        to: message.to,
        type: "template",
        template: {
          name: message.template,
          language: { code: message.languageCode },
          components: [{ type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: message.linkPath.slice(1) }] }],
        },
      });
    },
    sendText(to, body) {
      return post({ messaging_product: "whatsapp", to, type: "text", text: { body, preview_url: true } });
    },
  };
}

/* -------------------------------------------------------------- inbound */

/** Meta signs every webhook body with the app secret: `sha256=<hex>`. */
export async function inboundSignatureValid(rawBody: string, header: string | null, appSecret: string | undefined): Promise<boolean> {
  if (!appSecret || !header || !header.startsWith("sha256=")) return false;
  const { createHmac, timingSafeEqual } = await import("node:crypto");
  const expected = createHmac("sha256", appSecret).update(rawBody, "utf8").digest();
  const given = Buffer.from(header.slice(7), "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** The inbound messages in a webhook body: Meta's message id, the sender as E.164, and the text, if any. */
export function inboundMessages(payload: unknown): { id: string | null; from: string; text: string | null }[] {
  const out: { id: string | null; from: string; text: string | null }[] = [];
  const entries = (payload as { entry?: unknown })?.entry;
  if (!Array.isArray(entries)) return out;
  for (const entry of entries) {
    const changes = (entry as { changes?: unknown })?.changes;
    if (!Array.isArray(changes)) continue;
    for (const change of changes) {
      const messages = (change as { value?: { messages?: unknown } })?.value?.messages;
      if (!Array.isArray(messages)) continue;
      for (const message of messages) {
        const m = message as { id?: unknown; from?: unknown; text?: { body?: unknown } };
        const from = typeof m.from === "string" && /^\d{8,15}$/.test(m.from) ? `+${m.from}` : null;
        if (!from) continue;
        const id = typeof m.id === "string" && m.id.length > 0 && m.id.length <= 200 ? m.id : null;
        out.push({ id, from, text: typeof m.text?.body === "string" ? m.text.body.slice(0, 500) : null });
        if (out.length >= 20) return out;
      }
    }
  }
  return out;
}
