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
