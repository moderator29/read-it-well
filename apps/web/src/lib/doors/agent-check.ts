import { normalisePhone } from "../phone";

/**
 * V-61. "IS THIS A VALLO AGENT?" THE PURE HALVES. Client-safe.
 *
 * `readCheckQuery` decides what a person pasted: a Nigerian mobile number in
 * any of the ways people write one (0803 123 4567, +234 803..., 234803...), or
 * a Vallo agent code (VA- and five characters from the reply alphabet, in any
 * case, with or without the dash). Anything else is refused before a lookup is
 * spent on it.
 *
 * `readCheckResult` reads what `public.agent_lookup` answered. There are only
 * two answers a person is ever given: yes, with the agent's public name and,
 * only when a document was approved, the date their identity was checked; or
 * one plain no. The database never says why a number is not found, and neither
 * does this: THE_HUNDRED rejects a public list of stopped agents.
 */

export const AGENT_CODE_ALPHABET = "ACDEFHJKMNPRTUVWXY3479";

export type CheckQuery = { kind: "phone"; value: string } | { kind: "code"; value: string };

export function readCheckQuery(raw: string): CheckQuery | null {
  const text = raw.trim();
  if (text.length === 0 || text.length > 40) return null;
  const compact = text.toUpperCase().replace(/[\s.]/g, "");
  const code = compact.match(new RegExp(`^VA-?([${AGENT_CODE_ALPHABET}]{5})$`));
  if (code) return { kind: "code", value: `VA-${code[1]}` };
  if (/[A-Z]/.test(compact)) return null;
  const phone = normalisePhone(text);
  return phone ? { kind: "phone", value: phone } : null;
}

export type CheckResult =
  | {
      found: true;
      kind: "phone" | "code";
      displayName: string | null;
      role: "agent" | "owner" | "firm" | null;
      code: string | null;
      /** Last three digits of the registered number, on a code answer only. */
      hint: string | null;
      identityCheckedAt: string | null;
      handle: string | null;
    }
  | { found: false; kind: "phone" | "code" };

export function readCheckResult(raw: unknown, asked: CheckQuery): CheckResult | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (row.found !== true) {
    if (row.found === false) return { found: false, kind: asked.kind };
    return null;
  }
  const role = row.role;
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  return {
    found: true,
    kind: asked.kind,
    displayName: str(row.display_name),
    role: role === "agent" || role === "owner" || role === "firm" ? role : null,
    code: str(row.code),
    hint: asked.kind === "code" && typeof row.hint === "string" && /^[0-9]{3}$/.test(row.hint) ? row.hint : null,
    identityCheckedAt: str(row.identity_checked_at),
    handle: str(row.handle),
  };
}

/** Does a search box query look like something /check can answer? */
export function looksCheckable(raw: string | undefined | null): boolean {
  return raw ? readCheckQuery(raw) !== null : false;
}

/**
 * The start of the fixed rate-limit window `nowMs` falls in, as the database
 * computes it (`floor(epoch / window) * window`), in ISO form. The agent check
 * names it when it reserves a slot, so the refund goes back to that window.
 */
export function reservationWindowStart(nowMs: number, windowSeconds: number): string {
  const seconds = Math.floor(nowMs / 1000 / windowSeconds) * windowSeconds;
  return new Date(seconds * 1000).toISOString();
}
