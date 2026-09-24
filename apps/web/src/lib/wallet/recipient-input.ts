import { HANDLE_PATTERN } from "../social/profiles-schema";

/**
 * What the send form's recipient field accepts: a Vallo account's email
 * address, or a public `@handle`. A handle is resolved to an account on the
 * server (handle-recipient.ts) and never to an address the payer can see.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type RecipientInput =
  | { kind: "email"; email: string }
  | { kind: "handle"; handle: string };

export function parseRecipientInput(raw: unknown): RecipientInput | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim().toLowerCase().slice(0, 254);
  if (value.startsWith("@")) {
    const handle = value.slice(1);
    return HANDLE_PATTERN.test(handle) ? { kind: "handle", handle } : null;
  }
  return EMAIL_RE.test(value) ? { kind: "email", email: value } : null;
}

export function isRecipientInput(raw: unknown): boolean {
  return parseRecipientInput(raw) !== null;
}
