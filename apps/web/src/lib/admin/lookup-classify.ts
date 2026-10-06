/**
 * ONE LOOKUP BOX FOR THE CONSOLE (C6): what kind of identifier was pasted.
 *
 * A staff member holding a reference from a phone call (a VAL-SUP ticket, a
 * booking id, a Paystack reference, an email, a listing code, the short
 * reference an error screen printed) used to guess which desk to open. The
 * box classifies the text and `lookup-reads.ts` asks only the desks the
 * viewer may open. Pure and tested.
 */
export type LookupKind = "ticket" | "listing" | "agent" | "uuid" | "email" | "payment" | "error" | "text";

/**
 * The code an agent prints on their own adverts and a renter checks at
 * /check: `VA-` and five characters from `private.new_agent_code`'s alphabet
 * (migration 20260924104806, stored in `agents.public_code`). A caller reading
 * it down the phone may drop the hyphen or say a space; it is kept as minted.
 */
const AGENT_CODE = /^VA[-\s]?([ACDEFHJKMNPRTUVWXY3479]{5})$/i;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function classifyLookup(raw: string): { kind: LookupKind; value: string } {
  const value = raw.trim().slice(0, 200);
  if (/^VAL-SUP-\d+$/i.test(value)) return { kind: "ticket", value: value.toUpperCase() };
  if (UUID.test(value)) return { kind: "uuid", value: value.toLowerCase() };
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return { kind: "email", value: value.toLowerCase() };
  /* VA- came back as a word, so the code on an advert found nothing (A9). */
  const agent = AGENT_CODE.exec(value);
  if (agent) return { kind: "agent", value: `VA-${agent[1]!.toUpperCase()}` };
  /* VL- is the code the database mints for a listing (20260922110000, "VL-" and six characters); the
     classifier only knew the older prefixes, so the code a caller reads off a listing came back as a word. */
  if (/^(VL|LST|VAL|STY|RST)-[A-Z0-9-]{3,}$/i.test(value)) return { kind: "listing", value: value.toUpperCase() };
  /* The short reference an error screen shows (lib/observability/reference.ts). */
  if (/^(C-[A-Z2-9]{6}|[0-9A-F]{8})$/i.test(value) && /\d/.test(value)) return { kind: "error", value: value.toUpperCase() };
  /* Paystack references are long mixed tokens with no spaces. */
  if (/^[A-Za-z0-9_.-]{10,100}$/.test(value) && /\d/.test(value) && /[A-Za-z]/.test(value)) return { kind: "payment", value };
  return { kind: "text", value };
}

/** Whether the box should go to the lookup page rather than the desk's own search. */
export function isIdentifier(raw: string): boolean {
  return classifyLookup(raw).kind !== "text";
}
