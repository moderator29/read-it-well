/**
 * THE PHONE GATE, AS ONE REUSABLE SERVER CHECK (Session 2 R2-08).
 *
 * An account that signed up with email confirms a phone from Settings
 * (`/settings/phone`, `sendPhoneCode` and `confirmPhoneCode` in
 * `lib/phone-otp/actions.ts`, which write `public.confirmed_phones`). Anything
 * that must know a real phone stands behind it asks here:
 *
 *   const gate = await requireConfirmedPhone(lookup, userId);
 *   if (!gate.ok) return fail(PHONE_REQUIRED_MESSAGE);
 *
 * FAILS CLOSED. Unlike the reputation gate in `phone-otp/gate.ts` (friction
 * in front of a review, where a blinking read should not refuse a person),
 * this one guards money: a referral reward and a Rewards Balance payout. A
 * read that fails answers "unknown" and the caller refuses. The database
 * enforces the same rule on its own (`rewards_payout_open` and referral
 * qualification both read `confirmed_phones`), so this is the early, polite
 * refusal, never the only one.
 */

export type PhoneLookup = (userId: string) => Promise<string | null>;

export type PhoneGate = { ok: true; phone: string } | { ok: false; reason: "phone_required" | "unknown" };

export const PHONE_REQUIRED_MESSAGE = "Confirm your phone number in Settings first. It takes a minute.";

export async function requireConfirmedPhone(lookup: PhoneLookup, userId: string | null | undefined): Promise<PhoneGate> {
  if (!userId) return { ok: false, reason: "unknown" };
  try {
    const phone = await lookup(userId);
    return phone ? { ok: true, phone } : { ok: false, reason: "phone_required" };
  } catch {
    return { ok: false, reason: "unknown" };
  }
}

type Loose = {
  from: (t: string) => {
    select: (c: string) => {
      eq: (k: string, v: string) => { maybeSingle: () => PromiseLike<{ data: unknown; error: unknown }> };
    };
  };
};

/** A lookup over any Supabase client the caller already holds (RLS lets a member read their own row). */
export function confirmedPhoneLookup(client: unknown): PhoneLookup {
  const db = client as Loose;
  return async (userId) => {
    const { data, error } = await db.from("confirmed_phones").select("phone").eq("user_id", userId).maybeSingle();
    if (error) throw new Error("confirmed_phones read failed");
    const phone = (data as { phone?: unknown } | null)?.phone;
    return typeof phone === "string" && phone.length > 0 ? phone : null;
  };
}
