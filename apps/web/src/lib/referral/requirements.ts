/**
 * THE QUALIFICATION REGISTRY (D62). A fixed set of named checks, each one SQL
 * function in `b4_referral_campaigns.sql` (`private.referral_req_<key>`),
 * and a campaign stores an ordered array of these keys. Never an expression
 * language. `requirements.test.ts` fails if this list and the migration's
 * registry drift.
 *
 * The copy is what a member reads BEFORE inviting anyone (architecture
 * section 6, rule 2): the conditions are visible up front.
 */

export const REQUIREMENT_KEYS = [
  "phone_verified",
  "email_verified",
  "onboarding_completed",
  "meaningful_activity",
  "business_profile_completed",
  "business_verified",
  "property_owner_verified",
  "space_published",
] as const;

export type RequirementKey = (typeof REQUIREMENT_KEYS)[number];

export function isRequirementKey(value: unknown): value is RequirementKey {
  return typeof value === "string" && (REQUIREMENT_KEYS as readonly string[]).includes(value);
}

/** What the person you invite has to do, one line per key. */
export const REQUIREMENT_COPY: Record<RequirementKey, string> = {
  phone_verified: "Confirms their own phone number",
  email_verified: "Confirms their own email address",
  onboarding_completed: "Finishes setting up their account",
  meaningful_activity: "Completes a payment of their own on Vallo",
  business_profile_completed: "Completes their business profile",
  business_verified: "Passes Vallo's business review",
  property_owner_verified: "Has their ownership of a property accepted",
  space_published: "Publishes a space that passes review",
};

/** The keys a campaign lists, in its order, dropping anything unknown. */
export function requirementLines(keys: unknown): string[] {
  if (!Array.isArray(keys)) return [];
  return keys.filter(isRequirementKey).map((k) => REQUIREMENT_COPY[k]);
}
