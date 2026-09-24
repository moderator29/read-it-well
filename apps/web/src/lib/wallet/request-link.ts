import { HANDLE_PATTERN } from "../social/profiles-schema";

/**
 * The link a wallet request shares.
 *
 * It used to carry the requester's email address (`/wallet/send?to=<email>`),
 * and the share text carried the link, so every request pasted into a
 * WhatsApp group published the member's sign-in address to everyone in it.
 * The link now names the requester by their public handle (`to=@handle`),
 * which the send page resolves on the server for a signed-in payer. Without a
 * claimed handle the link carries no recipient at all, and the payer enters
 * the address they already know. An email address never goes into the link.
 */
export function walletRequestLink(input: {
  origin: string;
  /** The claimed handle without its @, or null. */
  handle: string | null;
  /** Integer kobo, already validated, or null. MON-17: kobo, so a request
      for 5,000.50 never becomes a link for 5,001. */
  amountMinor: number | null;
  note: string;
}): string {
  const params = new URLSearchParams();
  if (input.handle) params.set("to", `@${input.handle}`);
  if (input.amountMinor !== null) params.set("amount", nairaText(input.amountMinor));
  const note = input.note.trim().slice(0, 140);
  if (note) params.set("note", note);
  const query = params.toString();
  return `${input.origin}/wallet/send${query ? `?${query}` : ""}`;
}

/** Kobo as the amount field reads it: whole naira, or naira and two digits. */
function nairaText(minor: number): string {
  const kobo = minor % 100;
  const naira = (minor - kobo) / 100;
  return kobo === 0 ? String(naira) : `${naira}.${String(kobo).padStart(2, "0")}`;
}

/** A `to=` value that names a handle rather than an address, without its @. */
export function handleFromRecipientParam(raw: string | undefined): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim().toLowerCase();
  if (!value.startsWith("@")) return null;
  const handle = value.slice(1);
  return HANDLE_PATTERN.test(handle) ? handle : null;
}
