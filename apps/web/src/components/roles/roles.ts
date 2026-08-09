import type { UiIconName } from "@/design-system/icons/UiIcon";

/**
 * ONE ACCOUNT, THREE ROLES.
 *
 * RentMe has three kinds of person and they are not three kinds of user:
 *
 *   renting or buying   somebody looking for a place to live or to own
 *   listing or selling  somebody putting their OWN property on the market
 *   professional        an agent or realtor, doing it for other people
 *
 * The same human is routinely two of these at once. Somebody renting a flat in
 * Yaba while selling the family plot in Enugu is not two customers, and the
 * platform they use must not make them hold two accounts, two inboxes and two
 * wallets to do it. Switching context is a VIEW, resolved from what the one
 * account already has on it.
 *
 * WHERE THE STATE COMES FROM. There is no roles table and this file does not
 * invent one. The account's `agents` row already carries everything needed:
 * whether it exists at all, its `type` (`individual` or `business`), and where
 * it stands on the verification ladder. `roleStateFrom` is the whole mapping,
 * in one function, so a screen never reasons about agent rows directly.
 *
 * ---------------------------------------------------------------------------
 * VERIFICATION APPLIES TO TWO OF THE THREE, AND THAT IS A PRODUCT RULE.
 *
 * A seller and a professional are asked to verify, because somebody is going
 * to hand them money for a place they have never stood in, and the only thing
 * standing between that person and a fraud is that we checked who is on the
 * other end.
 *
 * A RENTER OR BUYER IS NEVER ASKED. Not to browse, not to save, not to
 * message, not to rent. Nigeria's rental market already asks a tenant for
 * documents at every turn and a platform that adds one more checkpoint before
 * they can even look is a platform they close. `requiresVerification` returns
 * false for `renter` and nothing anywhere may special-case around it.
 *
 * ---------------------------------------------------------------------------
 * THE COPY LIVES HERE RATHER THAN IN THE DICTIONARY, for now.
 *
 * `packages/i18n` carries the platform's four languages and this text is not in
 * it yet. That is a real gap and it is stated rather than hidden: these strings
 * are the English source, gathered in ONE object so translating them later is a
 * mechanical move rather than a hunt through six components. The same
 * compromise `FollowButton` documents, for the same reason.
 */

export type RoleId = "renter" | "owner" | "professional";

/** The order the sheet lists them in: most people first. */
export const ROLE_ORDER: readonly RoleId[] = ["renter", "owner", "professional"] as const;

export type RoleCopy = {
  /** The name of the role, as the person would say it about themselves. */
  label: string;
  /** ONE line. It sits under the label on a 360px phone and may not wrap to three. */
  description: string;
  icon: UiIconName;
  /** Where switching into this role takes them once they have it. */
  href: string;
  /** The explainer shown when they pick a role they have not set up. */
  setup: {
    title: string;
    /** What this role is. */
    what: string;
    /** What setting it up actually involves, plainly. */
    involves: string;
    /** The one primary action. */
    action: string;
    actionHref: string;
    /**
     * What the setup actually asks for, itemised.
     *
     * A paragraph saying "a short application, then a government issued ID"
     * is read once and forgotten; the same facts as a checklist can be
     * CHECKED, which is what somebody deciding whether to start actually
     * wants to do. Absent on `renter`, because there is nothing to bring.
     */
    needs?: { icon: UiIconName; label: string }[];
  };
};

export const ROLE_COPY: Record<RoleId, RoleCopy> = {
  renter: {
    label: "Renting or buying",
    description: "Find a place to live, or one to own",
    icon: "search",
    href: "/home",
    setup: {
      title: "Renting or buying",
      what: "Search the whole marketplace, save what you like, message whoever listed it, arrange an inspection and pay when you are ready.",
      involves: "Nothing. This is what your account already does, and it never asks you to verify your identity.",
      action: "Start looking",
      actionHref: "/search",
    },
  },
  owner: {
    label: "Listing or selling",
    description: "Put your own property in front of people",
    icon: "key",
    href: "/agent/dashboard",
    setup: {
      title: "List or sell your own property",
      what: "For a landlord or an owner putting their own place up: one property or a handful, rented out or sold, with the enquiries coming to you rather than through an agent.",
      involves: "A short application, then a government issued ID and proof that the property is yours. Most people finish the form in about ten minutes; a decision usually comes back within two working days.",
      action: "Set up this profile",
      actionHref: "/profile/setup/owner",
      needs: [
        { icon: "user", label: "Your name and phone number" },
        { icon: "verified", label: "A government issued ID, or your NIN" },
        { icon: "key", label: "Proof the property is yours" },
        { icon: "wallet", label: "A Nigerian bank account for payouts" },
      ],
    },
  },
  professional: {
    label: "Agent or realtor",
    description: "List and manage property for other people",
    icon: "building-apartment",
    href: "/agent/dashboard",
    setup: {
      title: "Work as an agent or realtor",
      what: "For somebody doing this as a business: listing on behalf of owners, managing enquiries and inspections across a book of properties, and getting paid through the platform.",
      involves: "The same application plus your business details, a government issued ID and proof of address. We check every business by hand before any listing goes live.",
      action: "Set up this profile",
      actionHref: "/profile/setup/professional",
      needs: [
        { icon: "user", label: "Your name and phone number" },
        { icon: "verified", label: "A government issued ID, or your NIN" },
        { icon: "building-apartment", label: "Your business name and RC number" },
        { icon: "location", label: "A business address we can check" },
        { icon: "wallet", label: "A Nigerian bank account for payouts" },
      ],
    },
  },
};

/**
 * The two role ids that have a setup flow, as the URL segment carries them.
 *
 * `renter` is deliberately not one: there is no application to be a renter,
 * which is the rule the whole file is built around.
 */
export const SETUP_ROLES: readonly Exclude<RoleId, "renter">[] = [
  "owner",
  "professional",
] as const;

/** True for the two roles that take other people's money. Never for a renter. */
export function requiresVerification(role: RoleId): boolean {
  return role === "owner" || role === "professional";
}

/**
 * What one role looks like for this account, right now.
 *
 * `setUp` and `verified` are deliberately separate. A seller mid-review is set
 * up and not verified, and that is a real, common, WORKING state: they can fill
 * in a listing, they cannot publish it. Collapsing the two into one boolean is
 * how a product ends up telling somebody who is waiting on a review that they
 * have not started.
 */
export type RoleState = {
  id: RoleId;
  setUp: boolean;
  /** Meaningless for a renter, and always false there. Read with `needsVerification`. */
  verified: boolean;
};

export type RolesView = {
  roles: RoleState[];
  /** The role the person is looking at the product as. */
  current: RoleId;
};

/**
 * The account's `agents` row, reduced to the two fields that decide roles.
 *
 * Null means no row: the account is a renter and nothing else, which is the
 * state the overwhelming majority of accounts are in.
 */
export type AgentFacts = {
  /** `individual` is somebody's own property; `business` is a professional. */
  type: "individual" | "business";
  /** APPROVED, PENDING, REJECTED. Only APPROVED is verified. */
  status: string;
  verified: boolean;
} | null;

export function roleStateFrom(agent: AgentFacts, mode: "personal" | "agent"): RolesView {
  const professional = agent?.type === "business";
  const owner = agent?.type === "individual";
  /* Verified means the platform has actually decided, not that a form was
     submitted. A pending application is set up and unverified. */
  const verified = Boolean(agent?.verified && agent.status === "APPROVED");

  const roles: RoleState[] = [
    /* Always set up. There is no application to be a renter and there never
       will be one. */
    { id: "renter", setUp: true, verified: false },
    { id: "owner", setUp: owner, verified: owner && verified },
    { id: "professional", setUp: professional, verified: professional && verified },
  ];

  /*
   * The current role is the workspace mode narrowed by what the account is.
   *
   * `mode` is a cookie and a cookie is a preference, never an authorisation:
   * an account with no agents row that somehow carries `nf_mode=agent` reads as
   * a renter here, because that is what it is. The server routes under /agent
   * enforce the same thing again, which is the check that matters.
   */
  let current: RoleId = "renter";
  if (mode === "agent") {
    if (professional) current = "professional";
    else if (owner) current = "owner";
  }

  return { roles, current };
}

/**
 * Whether this role should be nagging this person to verify.
 *
 * True only where verification is required, the role is set up, and it has not
 * happened. A renter never returns true; a professional who has not applied
 * never returns true either, because the thing to ask them for is the
 * application, not their passport.
 */
export function needsVerification(role: RoleState): boolean {
  return requiresVerification(role.id) && role.setUp && !role.verified;
}
