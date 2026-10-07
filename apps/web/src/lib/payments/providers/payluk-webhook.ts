import { createHmac, timingSafeEqual } from "node:crypto";
import { parseMovement } from "./payluk-client";
import type { RailMovement } from "../provider";

/**
 * PAYLUK WEBHOOKS, the pure half (Part B phase 15; concepts_webhooks.txt).
 *
 *  - `x-payluk-signature` is the hex HMAC-SHA512 of the RAW body, keyed with
 *    the environment's secret key. Checked byte for byte, constant time, and
 *    a missing or malformed header is simply false.
 *  - Envelope `{ event, data, timestamp }`. Two families: `payment.*`
 *    (`payment.<transactionType>.<success|failed|reversed>`) and `escrow.*`.
 *  - De-duplicate on `data.reference` for payments and `data.id` for escrows,
 *    each with the event name, so a `.success` then a `.reversed` for the
 *    same reference are two facts while a redelivery of either is one.
 *  - Delivery is unordered and best effort: the handler trusts `data.status`,
 *    never arrival order, and reconciliation reads back what never arrives.
 *  - Unknown event names are acknowledged (2xx) and recorded, never refused.
 */
export function verifyPaylukSignature(rawBody: string, header: string | null, secretKey: string): boolean {
  if (!header || !secretKey) return false;
  const received = header.trim().toLowerCase();
  if (!/^[0-9a-f]{128}$/.test(received)) return false;
  const expected = createHmac("sha512", secretKey).update(rawBody, "utf8").digest("hex");
  return timingSafeEqual(Buffer.from(received, "hex"), Buffer.from(expected, "hex"));
}

export type PaylukWebhook =
  | {
      family: "payment";
      event: string;
      key: string;
      environment: string | null;
      outcome: "success" | "failed" | "reversed" | "other";
      movement: RailMovement;
    }
  | { family: "escrow"; event: string; key: string; environment: string | null; escrowId: string; status: string }
  | { family: "other"; event: string; key: string; environment: string | null };

/** Parse a verified body. Null when it is not a webhook at all (malformed). */
export function parsePaylukWebhook(body: unknown): PaylukWebhook | null {
  if (!body || typeof body !== "object") return null;
  const env = body as { event?: unknown; data?: unknown };
  const event = typeof env.event === "string" ? env.event.trim() : "";
  const data = env.data && typeof env.data === "object" ? (env.data as Record<string, unknown>) : null;
  if (!event || !data) return null;
  const environment = typeof data.environment === "string" ? data.environment : null;

  if (event.startsWith("payment.")) {
    const movement = parseMovement(data);
    if (!movement) return null;
    const last = event.split(".").pop() ?? "";
    const outcome = last === "success" || last === "failed" || last === "reversed" ? last : "other";
    return { family: "payment", event, key: `payment:${movement.reference}:${event}`, environment, outcome, movement };
  }
  if (event.startsWith("escrow.")) {
    const id = typeof data.id === "string" ? data.id : "";
    if (!id) return null;
    return { family: "escrow", event, key: `escrow:${id}:${event}`, environment, escrowId: id, status: String(data.status ?? "") };
  }
  const id = typeof data.id === "string" ? data.id : typeof data.reference === "string" ? data.reference : "";
  if (!id) return null;
  return { family: "other", event, key: `other:${id}:${event}`, environment };
}

/** `data.environment` is `live` or `test`; it must match the key that verified it. */
export function environmentMatches(environment: string | null, configured: "staging" | "production"): boolean {
  if (environment === null) return true;
  return configured === "production" ? environment === "live" : environment === "test";
}
