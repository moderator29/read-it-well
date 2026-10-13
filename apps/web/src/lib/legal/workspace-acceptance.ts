import { PAY_ON_VALLO_VERSION, PRIVACY_VERSION, TERMS_VERSION } from "./versions";

/**
 * THE ACCEPTANCE EVERY WORKSPACE APPLICATION AND SETUP RECORDS (founder
 * ruling 6, 13 October 2026).
 *
 * Before an owner, agent or firm registration, the professional application,
 * or a host's setup (hotel, shortlet, restaurant) is sent, the person ticks:
 *
 *   1. "I have read and accept the Terms of Service and the Privacy Policy"
 *   2. "Every payment for a deal I make on Vallo happens inside Vallo."
 *
 * It is recorded the way the host publish step already records the Host
 * Agreement: appended to the row's `consents.agreements` as
 * `{document, version, at}` (`businesses.consents`, and since pending
 * migration pov07 `agent_applications.consents`). The server actions refuse a
 * submission without both ticks, and pov08 refuses it in the database too.
 *
 * Pure and client-safe.
 */

export type AcceptanceDocument = "terms" | "privacy" | "pay_on_vallo";

export type AcceptanceEntry = { document: AcceptanceDocument; version: string; at: string };

export const WORKSPACE_DOCUMENTS: readonly { document: AcceptanceDocument; version: string }[] = [
  { document: "terms", version: TERMS_VERSION },
  { document: "privacy", version: PRIVACY_VERSION },
  { document: "pay_on_vallo", version: PAY_ON_VALLO_VERSION },
];

/** The three entries one acceptance appends, each with its version and the moment. */
export function workspaceAcceptanceEntries(at: string): AcceptanceEntry[] {
  return WORKSPACE_DOCUMENTS.map((d) => ({ document: d.document, version: d.version, at }));
}

/** `consents` with this acceptance appended (the older entries are kept: the record is a history). */
export function withWorkspaceAcceptance(consents: unknown, at: string): Record<string, unknown> {
  const base =
    consents !== null && typeof consents === "object" && !Array.isArray(consents)
      ? { ...(consents as Record<string, unknown>) }
      : {};
  const list = Array.isArray(base.agreements) ? base.agreements : [];
  return { ...base, agreements: [...list, ...workspaceAcceptanceEntries(at)] };
}

/** The newest version recorded for one document, or null (malformed entries are skipped). */
export function acceptedVersion(consents: unknown, document: AcceptanceDocument): string | null {
  if (consents === null || typeof consents !== "object" || Array.isArray(consents)) return null;
  const list = (consents as Record<string, unknown>).agreements;
  if (!Array.isArray(list)) return null;
  let latest: { version: string; at: string } | null = null;
  for (const entry of list) {
    const row = (entry ?? {}) as Record<string, unknown>;
    if (row.document !== document || typeof row.version !== "string" || typeof row.at !== "string") continue;
    if (!latest || row.at > latest.at) latest = { version: row.version, at: row.at };
  }
  return latest?.version ?? null;
}

/** Whether the pay-on-Vallo statement is on record at its current version. */
export function payOnValloAccepted(consents: unknown): boolean {
  return acceptedVersion(consents, "pay_on_vallo") === PAY_ON_VALLO_VERSION;
}

/** The two ticks a submission must carry, as the server reads them. */
export function bothTicked(input: { acceptTerms?: unknown; acceptPayOnVallo?: unknown }): boolean {
  return input.acceptTerms === true && input.acceptPayOnVallo === true;
}

/** The server's sentences when a tick is missing (the form asks first). */
export const ACCEPT_TERMS_REQUIRED = "Tick to accept the Terms of Service and the Privacy Policy.";
export const ACCEPT_PAY_REQUIRED = "Tick to confirm that every payment for a deal you make on Vallo happens inside Vallo.";
