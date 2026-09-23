"use server";

import { resolveSession } from "@/lib/actions/session";
import { consume, subjectForUser } from "@/lib/security/rate-limit";
import { displayNameFor, findUserByEmail, getAdminClient, type AdminClient } from "@/lib/wallet/ledger";

/* The recipient's published tier from `public.person_badge`, or none. */
export type BadgeTier = "gold" | "platinum" | null;

/**
 * The recipient lookup for /wallet/send, as the withdraw sheet's account-name
 * check is for a bank account: the moment a well-formed address is in the
 * field, this asks whether a Vallo account uses it and answers with the
 * display name, so the person sees WHO they are about to pay before any money
 * moves. `transferToUser` resolves the address again server-side at the
 * moment of sending; this is the courtesy, never the guard.
 *
 * WHAT IT REVEALS, AND WHY THAT IS ALREADY THE CASE. Whether an address has an
 * account, and the display name on it. The send action already says both:
 * a refusal names the missing account and the receipt names the recipient.
 * Nothing new leaves the server here, and it leaves only to a signed-in
 * person, paced by the rate limiter, one address at a time.
 *
 * NOTHING HERE THROWS. A half-typed address is the ordinary state of the
 * field, so the quiet answers are silent by design and only a complete
 * address that genuinely resolves, or genuinely does not, says anything.
 */

export type RecipientLookup =
  /** An account uses the address; this is the name on it. */
  | { state: "found"; name: string; tier?: BadgeTier }
  /** No account uses the address. The send would be refused. */
  | { state: "none" }
  /** The viewer's own address. The send would be refused. */
  | { state: "self" }
  /** Could not ask (signed out, unconfigured, paced). The send decides. */
  | { state: "unknown"; reason: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function lookupRecipient(rawEmail: string): Promise<RecipientLookup> {
  const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase().slice(0, 254) : "";
  if (!EMAIL_RE.test(email)) return { state: "unknown", reason: "" };

  const session = await resolveSession();
  if (session.state !== "signed-in") return { state: "unknown", reason: "" };
  if ((session.user.email ?? "").toLowerCase() === email) return { state: "self" };

  const admin = getAdminClient();
  if (!admin) return { state: "unknown", reason: "" };

  /* Paced like the address checks a bank app makes: enough for a person
     correcting a typo, not enough to walk a list of addresses. */
  const pace = await consume({
    bucket: "wallet_recipient_lookup",
    subject: subjectForUser(session.user.id),
    limit: 40,
    windowSeconds: 600,
  });
  if (!pace.allowed) return { state: "unknown", reason: `Try again ${pace.retryIn}.` };

  const recipient = await findUserByEmail(email);
  if (!recipient) return { state: "none" };
  if (recipient.id === session.user.id) return { state: "self" };

  let name: string | null = null;
  try {
    name = await displayNameFor(admin, recipient.id);
  } catch {
    /* A missing display name is not a reason to hide that the account exists. */
  }
  return { state: "found", name: name ?? email, tier: await badgeTierFor(admin, recipient.id) };
}

/**
 * The recipient's badge tier, from `public.person_badge`, the one source
 * (scope B-BADGE); never computed here. A person with no row has no badge.
 * The view is newer than the generated database types, so it is read
 * untyped and its one column is checked by hand. Any failure is "no badge",
 * because a missing badge must never stop a person seeing who they pay.
 */
async function badgeTierFor(admin: AdminClient, userId: string): Promise<BadgeTier> {
  try {
    const loose = admin as unknown as {
      from: (table: string) => {
        select: (cols: string) => {
          eq: (col: string, value: string) => {
            maybeSingle: () => Promise<{ data: { tier?: unknown } | null; error: unknown }>;
          };
        };
      };
    };
    const { data, error } = await loose
      .from("person_badge")
      .select("tier")
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data) return null;
    return data.tier === "gold" || data.tier === "platinum" ? data.tier : null;
  } catch {
    return null;
  }
}
