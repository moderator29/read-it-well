import "server-only";
import { BRAND_DOMAIN } from "@/lib/brand-domain";

/**
 * Resend client. Server-only, typed, no SDK.
 *
 * A thin fetch layer over the one endpoint we need, POST
 * https://api.resend.com/emails. Deliberately tiny: transactional mail is a
 * side effect of an action that has already succeeded, so this module never
 * throws and never reports failure by exception. Every call answers with a
 * typed result the caller may ignore.
 *
 * The API key is read lazily, so importing this module is safe on a platform
 * with no email configured at all. With no key present sendEmail returns
 * {sent: false, reason: "unconfigured"} and nothing leaves the process.
 *
 * Logging is deliberately thin: a failure logs the reason and, when there was
 * one, the HTTP status. Never the recipient, never the subject, never the body.
 */

const API_URL = "https://api.resend.com/emails";
const REQUEST_TIMEOUT_MS = 10_000;

/** The sender used when EMAIL_FROM is not set. */
const DEFAULT_FROM = `Vallo <hello@${BRAND_DOMAIN}>`;

/** Deliberately forgiving: one @, a dot in the domain, no whitespace. */
const ADDRESS_RE = /^[^\s@]+@[^\s@.]+\.[^\s@]+$/;

export type SendFailureReason =
  /** RESEND_API_KEY is absent. Nothing was attempted. */
  | "unconfigured"
  /** The address did not look like an address, so nothing was attempted. */
  | "invalid-recipient"
  /** Resend answered, and said no. */
  | "rejected"
  /** Ten seconds passed with no answer. */
  | "timeout"
  /** DNS, TLS, socket: the service could not be reached at all. */
  | "unreachable";

export type SendEmailResult =
  | { sent: true; id: string | null }
  | { sent: false; reason: SendFailureReason; status?: number };

export type SendEmailMessage = {
  /** A single recipient address. One email, one person. */
  to: string;
  subject: string;
  html: string;
  /**
   * The text/plain alternative.
   *
   * Optional on this type and required on every message the catalogue builds,
   * which is the split that matters: a message always has one, and a call site
   * that has not been moved to `sendMessage` yet still compiles. Sending
   * without it is worse in two ways that are easy to miss until they bite. A
   * multipart message with no text part is a bulk-mail signature to every
   * major spam filter, and a text-only client shows an empty body rather than
   * a degraded one.
   */
  text?: string;
  /** Where a reply should land, when it is not the sending address. */
  replyTo?: string;
};

function apiKey(): string {
  return (process.env.RESEND_API_KEY ?? "").trim();
}

/**
 * True when RESEND_API_KEY is present. Read lazily on every call so a key
 * added to the environment takes effect without a rebuild, and so importing
 * this module can never fail. Callers use this to skip the work of gathering
 * recipients and rendering when no mail can be sent anyway.
 */
export function isEmailConfigured(): boolean {
  return apiKey().length > 0;
}

/** The From address: EMAIL_FROM when set, otherwise the Vallo default. */
export function emailFrom(): string {
  const configured = (process.env.EMAIL_FROM ?? "").trim();
  return configured.length > 0 ? configured : DEFAULT_FROM;
}

/** Resend's success body is {id}; its error body is {name, message, statusCode}. */
type ResendResponse = {
  id?: unknown;
  name?: unknown;
  message?: unknown;
};

/**
 * Send one email. Never throws, never blocks longer than ten seconds, and
 * returns a typed result rather than reporting failure by exception, because
 * every caller is a best-effort side effect of an action that has already
 * committed to the database.
 */
export async function sendEmail(message: SendEmailMessage): Promise<SendEmailResult> {
  const key = apiKey();
  if (key.length === 0) return { sent: false, reason: "unconfigured" };

  const to = message.to.trim();
  if (!ADDRESS_RE.test(to)) return { sent: false, reason: "invalid-recipient" };

  const replyTo = message.replyTo?.trim() ?? "";

  let res: Response;
  try {
    res = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      // The REST API speaks snake_case: reply_to, not the SDK's replyTo.
      body: JSON.stringify({
        from: emailFrom(),
        to: [to],
        subject: message.subject,
        html: message.html,
        ...(typeof message.text === "string" && message.text.length > 0
          ? { text: message.text }
          : {}),
        ...(ADDRESS_RE.test(replyTo) ? { reply_to: replyTo } : {}),
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (e) {
    const reason: SendFailureReason =
      e instanceof Error && e.name === "TimeoutError" ? "timeout" : "unreachable";
    console.warn(`[email] send did not complete: ${reason}`);
    return { sent: false, reason };
  }

  let body: ResendResponse | null = null;
  try {
    body = (await res.json()) as ResendResponse;
  } catch {
    body = null;
  }

  if (!res.ok) {
    // The error name is Resend's own machine code (validation_error,
    // rate_limit_exceeded and friends). It carries no user data.
    const code = typeof body?.name === "string" ? body.name : "unknown_error";
    console.warn(`[email] send rejected: ${res.status} ${code}`);
    return { sent: false, reason: "rejected", status: res.status };
  }

  return { sent: true, id: typeof body?.id === "string" ? body.id : null };
}

/**
 * Send a catalogue message to one person.
 *
 * The one-liner every send site should use. It exists because the alternative,
 * spreading a message into sendEmail by hand, is how the text alternative gets
 * left off: `{ to, subject: m.subject, html: m.html }` compiles perfectly and
 * silently drops the part that keeps the mail out of spam. Passing the whole
 * message means a field added to the catalogue reaches the wire without every
 * call site being edited again.
 */
export async function sendMessage(
  to: string,
  message: { subject: string; html: string; text: string },
  options?: { replyTo?: string },
): Promise<SendEmailResult> {
  return sendEmail({
    to,
    subject: message.subject,
    html: message.html,
    text: message.text,
    ...(options?.replyTo ? { replyTo: options.replyTo } : {}),
  });
}

/**
 * Run an email side effect that must never affect its caller.
 *
 * The two guarantees every send site in this codebase relies on, in one place:
 * nothing is attempted when there is no API key, and no failure inside the
 * work, including rendering and recipient lookups, can propagate. A booking
 * that saved is a booking that succeeded, whatever happens to its email.
 */
export async function bestEffortEmail(work: () => Promise<unknown>): Promise<void> {
  if (!isEmailConfigured()) return;
  try {
    await work();
  } catch {
    // Swallowed by design. A failed email never fails a user's action.
  }
}
