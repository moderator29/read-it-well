import { LISTING_ROLE_SENTENCE, type ListingRole } from "@/lib/supply/roles";

/**
 * The sentence a listing shows a reader, filled, or null when it cannot
 * honestly be said.
 *
 * PURE, AND IN ITS OWN FILE ON PURPOSE. `apps/web/vitest.config.ts` aliases the
 * bare specifier `react` at `react.react-server.js`, and Vite matches a string
 * alias by PREFIX, so `react/jsx-dev-runtime` rewrites to a path inside a file
 * and cannot resolve. Nothing that imports a `.tsx` file can be tested under
 * this config. That config is deliberate (it is what makes `cache` behave under
 * test the way it behaves in the app), so the words move out to where they can
 * be proved rather than the config moving to where it is convenient.
 *
 * `{name}` IS FILLED HERE AND THE SENTENCES ARE NOT REBUILT. The three strings
 * live in `lib/supply/roles.ts` and this file holds no copy of them, which is
 * the rule for all fifteen surfaces.
 */
export function fillLister(role: ListingRole, name?: string | null): string | null {
  const sentence = LISTING_ROLE_SENTENCE[role];
  if (!sentence.includes("{name}")) return sentence;
  const trimmed = (name ?? "").trim();
  /* NO NAME, NO SENTENCE. Printing the template with its placeholder showing is
     the one outcome worse than saying nothing, and inventing a name would be
     inventing a fact about a person. */
  if (trimmed === "") return null;
  return sentence.replace("{name}", trimmed);
}

/**
 * WHAT THE AGENT CARD PRINTS AS ITS HEADING, AND WHAT IT REFUSES TO PRINT.
 *
 * THE DEFECT THIS REPLACES. `ListingAgentCard` printed
 * `t.catalogue.detail.agentRole`, the words "Agent on Vallo", as the name
 * fallback for EVERY listing whatever its `listing_role`. On an owner's
 * listing that put "Agent on Vallo" directly above "Listed by the owner". One
 * of those two sentences is false on every owner listing, and it was the one
 * drawn in the heavier weight at the top of the card.
 *
 * THE RULE. A name if we have one. Otherwise a noun ONLY where the noun is
 * true, and nothing at all where it is not:
 *
 *   agent    the agent noun, which is exactly what that listing is.
 *   owner    NOTHING. There is no honest noun that is not a repeat of
 *            "Listed by the owner" on the line below, and that sentence names
 *            nobody on purpose: the offer IS that there is no intermediary.
 *   firm     NOTHING. We know it is a firm and not WHICH firm, the agent noun
 *            is false, and a generic "registered firm" would borrow a trust
 *            word for a claim no member of staff has checked. `listing_role`
 *            stays a claim until `ownership_verified_at` or
 *            `mandate_verified_at` is dated beside it.
 *   absent   the agent noun, UNCHANGED. A listing with no role is the seed
 *            catalogue or an external shape, which is the pre Track G state.
 *            Changing that is a regression dressed as a fix.
 *
 * IN THIS FILE AND NOT IN THE COMPONENT, for the reason at the head of it:
 * `apps/web/vitest.config.ts` aliases `react` by prefix, so nothing importing
 * a `.tsx` file can be tested under this config. A rule that can only be
 * grepped for is a rule that drifts. The noun itself is passed IN, so this
 * file still holds no copy of any copy.
 */
export function listerHeading(
  role: ListingRole | null | undefined,
  name: string | null | undefined,
  agentNoun: string,
): string | null {
  const trimmed = (name ?? "").trim();
  if (trimmed !== "") return trimmed;
  if (!role) return agentNoun;
  /* A LOOKUP AND NOT A CHAIN OF TERNARIES, so a fourth role cannot silently
     inherit the agent's noun. A role missing from this record prints nothing,
     which is the safe direction: the failure mode is a heading that does not
     appear, never a heading that says the wrong thing about somebody. */
  const nounFor: Partial<Record<ListingRole, string>> = { agent: agentNoun };
  return nounFor[role] ?? null;
}
