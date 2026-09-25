/**
 * The pure half of `messageVenue`, so the refusals can be tested without a
 * database. Every sentence is the one the guest reads.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/** Trimmed, at most 2,000 characters, or null when there is nothing to send. */
export function normaliseBody(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 2000);
}

export function businessThreadRefusal(input: {
  found: boolean;
  isExample: boolean;
  published: boolean;
  ownerId: string | null;
  callerId: string;
}): string | null {
  if (!input.found) return "We could not find this venue. It may have been taken down.";
  if (input.isExample) return "This is an example venue, so there is nobody behind it to message.";
  if (input.ownerId === input.callerId) return "This is your own venue, so there is nobody else to message.";
  if (!input.published) return "This venue is not taking messages right now.";
  if (!input.ownerId) return "This venue is not reachable right now. Please try again shortly.";
  return null;
}
