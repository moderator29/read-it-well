import { createHash } from "node:crypto";

/**
 * PAYSTACK'S SUBSCRIPTION EVENTS, READ INTO WHAT THE DATABASE ACTS ON.
 *
 * The webhook route verifies the signature; this file only reads a verified
 * payload into the normalised shape `public.subscription_apply_event` takes,
 * and names each delivery with a stable EVENT KEY. Paystack sends no event id,
 * so the key is built from what makes the delivery unique (the charge's
 * reference, the subscription code, the invoice code and its status). A
 * redelivery of the same event builds the same key, and the database answers
 * it `duplicate` and moves nothing.
 *
 * WHAT IS KEPT. Codes, amounts in integer kobo, dates and Paystack's status
 * word. Never the card (`authorization`), never an email address: the
 * customer's email is reduced to a sha256 of its lowercase form, which is what
 * lets `subscription.create` find the checkout it came from.
 *
 * Pure apart from the hash, and every branch is a unit test.
 */

export const SUBSCRIPTION_PREFIX = "rm-sub-";

const SUBSCRIPTION_REFERENCE_RE =
  /^rm-sub-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A subscription checkout's reference: `rm-sub-<subscription uuid>`, minted by the database. */
export function isSubscriptionReference(value: string): boolean {
  return SUBSCRIPTION_REFERENCE_RE.test(value);
}

export const SUBSCRIPTION_EVENTS = [
  "charge.success",
  "subscription.create",
  "subscription.not_renew",
  "subscription.disable",
  "invoice.create",
  "invoice.update",
  "invoice.payment_failed",
] as const;
export type SubscriptionEventType = (typeof SUBSCRIPTION_EVENTS)[number];

export function isSubscriptionEventType(event: string): event is SubscriptionEventType {
  return (SUBSCRIPTION_EVENTS as readonly string[]).includes(event);
}

/** What `subscription_apply_event` reads from `p_data`. Every field optional. */
export type NormalisedSubscriptionData = {
  reference?: string;
  amount_minor?: number;
  currency?: string;
  paid_at?: string;
  customer_code?: string;
  email_sha256?: string;
  plan_code?: string;
  subscription_code?: string;
  email_token?: string;
  next_payment_date?: string;
  invoice_code?: string;
  provider_status?: string;
  paid?: boolean;
  period_end?: string;
};

export type SubscriptionEvent = {
  event: SubscriptionEventType;
  eventKey: string;
  data: NormalisedSubscriptionData;
};

/** sha256 hex of a lowercase, trimmed email: the only form an address reaches the database in. */
export function emailSha256(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase(), "utf8").digest("hex");
}

function obj(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function text(value: unknown, max = 200): string | undefined {
  if (typeof value !== "string") return undefined;
  const t = value.trim();
  return t.length > 0 && t.length <= max ? t : undefined;
}

function code(value: unknown, prefix: string): string | undefined {
  const t = text(value, 100);
  return t && t.startsWith(prefix) && /^[A-Za-z0-9_]+$/.test(t) ? t : undefined;
}

/** An ISO instant, or nothing: a malformed date must never reach a timestamptz cast. */
function instant(value: unknown): string | undefined {
  const t = text(value, 64);
  if (!t) return undefined;
  const ms = Date.parse(t);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : undefined;
}

function kobo(value: unknown): number | undefined {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}

/** The `PLN_` code a payload carries in `plan` or `plan_object` (object or bare code). */
export function planCodeIn(data: Record<string, unknown>): string | undefined {
  for (const candidate of [data["plan_object"], data["plan"]]) {
    const direct = code(candidate, "PLN_");
    if (direct) return direct;
    const inner = obj(candidate);
    if (inner) {
      const nested = code(inner["plan_code"], "PLN_");
      if (nested) return nested;
    }
  }
  return undefined;
}

function customerOf(data: Record<string, unknown>): { customer_code?: string; email_sha256?: string } {
  const customer = obj(data["customer"]);
  if (!customer) return {};
  const email = text(customer["email"], 320);
  return {
    ...(code(customer["customer_code"], "CUS_") ? { customer_code: code(customer["customer_code"], "CUS_") } : {}),
    ...(email && email.includes("@") ? { email_sha256: emailSha256(email) } : {}),
  };
}

function compact<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T;
}

/**
 * A charge.success that belongs to a subscription: our own checkout reference,
 * or a renewal Paystack charged under a plan (its reference is Paystack's own).
 */
export function isSubscriptionCharge(data: unknown): boolean {
  const d = obj(data);
  if (!d) return false;
  const reference = text(d["reference"]) ?? "";
  return isSubscriptionReference(reference) || planCodeIn(d) !== undefined;
}

/**
 * Read one verified delivery. Null when it is not a subscription event, or when
 * it carries nothing that could name it (no reference, no code): such a
 * delivery cannot be made idempotent, so it is not acted on.
 */
export function readSubscriptionEvent(event: string, payloadData: unknown): SubscriptionEvent | null {
  if (!isSubscriptionEventType(event)) return null;
  const d = obj(payloadData);
  if (!d) return null;

  if (event === "charge.success") {
    if (!isSubscriptionCharge(d)) return null;
    const reference = text(d["reference"]);
    if (!reference) return null;
    return {
      event,
      eventKey: `charge.success:${reference}`,
      data: compact({
        reference,
        amount_minor: kobo(d["amount"]),
        currency: text(d["currency"], 8),
        paid_at: instant(d["paid_at"]) ?? instant(d["paidAt"]),
        plan_code: planCodeIn(d),
        provider_status: text(d["status"], 40),
        ...customerOf(d),
      }),
    };
  }

  if (event === "subscription.create" || event === "subscription.not_renew" || event === "subscription.disable") {
    const subscriptionCode = code(d["subscription_code"], "SUB_");
    if (!subscriptionCode) return null;
    /* The same subscription can stop renewing, be re-enabled and stop again:
       Paystack's own update time tells those deliveries apart, and a
       redelivery repeats it exactly. */
    const stamp = instant(d["updatedAt"]) ?? instant(d["updated_at"]) ?? "";
    return {
      event,
      eventKey: `${event}:${subscriptionCode}${stamp ? `:${stamp}` : ""}`,
      data: compact({
        subscription_code: subscriptionCode,
        email_token: text(d["email_token"], 100),
        plan_code: planCodeIn(d),
        next_payment_date: instant(d["next_payment_date"]),
        amount_minor: kobo(d["amount"]),
        provider_status: text(d["status"], 40),
        ...customerOf(d),
      }),
    };
  }

  // invoice.create, invoice.update, invoice.payment_failed
  const subscription = obj(d["subscription"]) ?? {};
  const transaction = obj(d["transaction"]) ?? {};
  const invoiceCode = code(d["invoice_code"], "INV_");
  const subscriptionCode = code(subscription["subscription_code"], "SUB_");
  if (!invoiceCode && !subscriptionCode) return null;
  const status = text(d["status"], 40);
  const name = invoiceCode ?? `${subscriptionCode}:${instant(d["period_end"]) ?? ""}`;
  return {
    event,
    eventKey: event === "invoice.update" ? `${event}:${name}:${status ?? ""}` : `${event}:${name}`,
    data: compact({
      invoice_code: invoiceCode,
      subscription_code: subscriptionCode,
      next_payment_date: instant(subscription["next_payment_date"]),
      period_end: instant(d["period_end"]),
      provider_status: status,
      paid: typeof d["paid"] === "boolean" ? d["paid"] : undefined,
      amount_minor: kobo(d["amount"]),
      currency: text(transaction["currency"], 8) ?? text(d["currency"], 8),
      reference: text(transaction["reference"]),
      ...customerOf(d),
    }),
  };
}
