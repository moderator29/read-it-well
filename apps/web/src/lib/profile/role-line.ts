/**
 * THE ONE ROLE LINE UNDER A PERSON'S NAME, AS PURE FUNCTIONS.
 *
 * Both profiles (`/profile` and `/u/[handle]`) say in one line what the person
 * is on Vallo: a renter, a landlord, an agent, a hotel, a restaurant, a
 * short-let host. Every word comes from a row, never from a guess:
 *
 *   landlord / agent   the person's approved supply account, by its side
 *                      (`agents.role`, `owner` or `agent`). On their own
 *                      page the row is readable; on somebody else's page
 *                      `agents` is not, so it is the projection of the same
 *                      column (`social_profiles.supply_role`).
 *   hotel and the rest the kind of each published business they own
 *                      (`businesses.kind`, the `business_kind` enum).
 *   renter             nothing above: "absent means renter only", the rule
 *                      `components/roles/roles.ts` states for the account.
 *
 * Kept free of `server-only` so the unit test reads it in Node and the client
 * profile body can call it. The words are the caller's (`socialProfile.roleLine`).
 */

/** What a person's supply account makes them on the property side. */
export type ListerKind = "owner" | "agent";

/** `public.business_kind`, as the database spells it. */
export const BUSINESS_KINDS = [
  "hotel",
  "serviced_apartments",
  "guest_house",
  "resort",
  "shortlet_operator",
  "restaurant",
  "agency",
] as const;
export type BusinessKind = (typeof BUSINESS_KINDS)[number];

export type RoleWord =
  | "renter"
  | "landlord"
  | "agent"
  | "agency"
  | "hotel"
  | "servicedApartments"
  | "guestHouse"
  | "resort"
  | "shortletHost"
  | "restaurant";

export type RoleLineCopy = Record<RoleWord, string>;

const BUSINESS_WORD: Record<BusinessKind, RoleWord> = {
  hotel: "hotel",
  serviced_apartments: "servicedApartments",
  guest_house: "guestHouse",
  resort: "resort",
  shortlet_operator: "shortletHost",
  restaurant: "restaurant",
  agency: "agency",
};

export function isBusinessKind(value: unknown): value is BusinessKind {
  return typeof value === "string" && (BUSINESS_KINDS as readonly string[]).includes(value);
}

/** `agents.role` (or its projection) as a lister kind. Only `owner` is a landlord. */
export function listerKindFromSupplyRole(role: string | null | undefined): ListerKind {
  return role === "owner" ? "owner" : "agent";
}

/**
 * The words, in a fixed order: the person first (landlord, agent), then what
 * they run, each once. Nothing at all is a renter.
 */
export function roleWords({
  listers,
  businesses,
}: {
  listers: readonly ListerKind[];
  businesses: readonly unknown[];
}): RoleWord[] {
  const words: RoleWord[] = [];
  if (listers.includes("owner")) words.push("landlord");
  if (listers.includes("agent")) words.push("agent");
  for (const kind of BUSINESS_KINDS) {
    if (businesses.includes(kind)) {
      const word = BUSINESS_WORD[kind];
      if (!words.includes(word)) words.push(word);
    }
  }
  return words.length > 0 ? words : ["renter"];
}

/** The line itself, the words joined by a middle dot. */
export function roleLine(words: readonly RoleWord[], copy: RoleLineCopy): string {
  return words.map((word) => copy[word]).join(" · ");
}
