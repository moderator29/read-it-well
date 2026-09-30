import type { OtpTransport, SendResult } from "./transport";

/**
 * A2. TERMII, THE CODE TRANSPORT FOR NIGERIAN NUMBERS. Off until configured.
 *
 * Termii's messaging API (`POST /api/sms/send`) with three channels, tried in
 * order, each only when the previous one refused:
 *
 *   whatsapp   when `TERMII_WHATSAPP_ENABLED=true` (needs a WhatsApp sender
 *              and an approved authentication template on the Termii account);
 *   dnd        the transactional route that still reaches numbers on MTN and
 *              Airtel Do-Not-Disturb, so a code is not silently dropped;
 *   generic    the ordinary route, the last resort.
 *
 * It is one implementation of `OtpTransport` (`transport.ts`), the thin
 * provider interface: a Twilio Verify transport can replace it with no
 * change to any screen. It never logs the number or the message.
 *
 * Nothing about email goes through here, ever: the email auth mail is the
 * Send Email hook through Resend, unchanged.
 */
export type TermiiConfig = {
  apiKey: string;
  senderId: string;
  whatsapp: boolean;
  baseUrl: string;
};

export const TERMII_DEFAULT_BASE = "https://api.ng.termii.com";

export function termiiConfig(env: Record<string, string | undefined> = process.env): TermiiConfig | null {
  const apiKey = (env.TERMII_API_KEY ?? "").trim();
  const senderId = (env.TERMII_SENDER_ID ?? "").trim();
  if (!apiKey || !senderId) return null;
  return {
    apiKey,
    senderId,
    whatsapp: (env.TERMII_WHATSAPP_ENABLED ?? "").trim() === "true",
    baseUrl: TERMII_DEFAULT_BASE,
  };
}

/** Termii wants the number without the plus: 2348031234567. */
export function termiiNumber(e164: string): string | null {
  return /^\+234[7-9]\d{9}$/.test(e164) ? e164.slice(1) : null;
}

export type TermiiChannel = "whatsapp" | "dnd" | "generic";

export function termiiChannels(config: TermiiConfig): TermiiChannel[] {
  return config.whatsapp ? ["whatsapp", "dnd", "generic"] : ["dnd", "generic"];
}

type Fetch = (url: string, init: RequestInit) => Promise<Response>;

export function termiiTransport(config: TermiiConfig, fetcher: Fetch = fetch): OtpTransport {
  return {
    name: "termii",
    async send(phoneE164: string, message: string): Promise<SendResult> {
      const to = termiiNumber(phoneE164);
      if (!to) return { ok: false, reason: "failed" };
      for (const channel of termiiChannels(config)) {
        try {
          const response = await fetcher(`${config.baseUrl}/api/sms/send`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              api_key: config.apiKey,
              to,
              from: config.senderId,
              sms: message,
              type: "plain",
              channel,
            }),
            signal: AbortSignal.timeout(8_000),
          });
          if (response.ok) {
            const body = (await response.json().catch(() => null)) as { code?: string; message_id?: string } | null;
            if (body && (body.code === "ok" || typeof body.message_id === "string")) return { ok: true };
          }
        } catch {
          /* Try the next channel. */
        }
      }
      return { ok: false, reason: "failed" };
    },
  };
}
