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

export type TermiiFetch = (url: string, init: RequestInit) => Promise<Response>;

/** One attempt on one channel. `refused` is Termii answering no; `network` is no answer. */
export type TermiiAttempt = { ok: true; messageId: string | null } | { ok: false; reason: "refused" | "network" };

/**
 * THE ONE TERMII CALL. Every Termii send in the app (codes here, the landlord
 * line in `lib/landlord/sms-channel.ts`) goes through this, so there is one
 * request shape and one reading of the answer. `to` is already in Termii's
 * form (`termiiNumber`). It never logs the number or the message.
 */
export async function termiiPost(
  config: TermiiConfig,
  to: string,
  message: string,
  channel: TermiiChannel,
  fetcher: TermiiFetch = fetch,
): Promise<TermiiAttempt> {
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
    if (!response.ok) return { ok: false, reason: "refused" };
    const body = (await response.json().catch(() => null)) as { code?: string; message_id?: string } | null;
    if (body && (body.code === "ok" || typeof body.message_id === "string")) {
      return { ok: true, messageId: typeof body.message_id === "string" ? body.message_id : null };
    }
    return { ok: false, reason: "refused" };
  } catch {
    return { ok: false, reason: "network" };
  }
}

export function termiiTransport(config: TermiiConfig, fetcher: TermiiFetch = fetch): OtpTransport {
  return {
    name: "termii",
    async send(phoneE164: string, message: string): Promise<SendResult> {
      const to = termiiNumber(phoneE164);
      if (!to) return { ok: false, reason: "failed" };
      for (const channel of termiiChannels(config)) {
        /* On any refusal or network failure, try the next channel. */
        if ((await termiiPost(config, to, message, channel, fetcher)).ok) return { ok: true };
      }
      return { ok: false, reason: "failed" };
    },
  };
}
