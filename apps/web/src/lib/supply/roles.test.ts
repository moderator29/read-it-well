import { describe, expect, it } from "vitest";
import { VERIFICATION_ORDER } from "@/lib/trust/verification";
import {
  DATED_FACTS,
  LISTING_ROLES,
  LISTING_ROLE_FILTER_LABEL,
  LISTING_ROLE_SENTENCE,
  NO_DOCUMENT_ANSWER,
  STAYS_DOORS,
  STAYS_DOOR_ORDER,
  SUPPLY_DOORS,
  SUPPLY_DOOR_ORDER,
  SUPPLY_ROLES,
  WORKSPACE_KINDS,
  WORKSPACE_SIDE,
  WORKSPACE_STANDINGS,
  WORKSPACE_STANDING_COPY,
  isListingRole,
  isSupplyRole,
  isWorkspaceKind,
  ladderSentence,
  supplyPrimer,
} from "./roles";

/**
 * The specs that make this module the only copy of the vocabulary.
 *
 * The model is `lib/trust/agent-badge-derivation.test.ts`: a test that fails
 * when a surface holds its own copy of something this file already states.
 */
describe("the person axis and the pair axis", () => {
  it("has two person roles and three listing values, which is not a contradiction", () => {
    expect(SUPPLY_ROLES).toEqual(["owner", "agent"]);
    expect(LISTING_ROLES).toEqual(["owner", "agent", "firm"]);
  });

  it("does not carry a fourth role for a developer or a property manager", () => {
    /* A developer is an owner plus an off plan disclosure and a property
       manager is an agent with a management mandate. Both are a flag and a
       mandate kind, and this is the test that says so out loud. */
    expect(SUPPLY_ROLES).not.toContain("developer");
    expect(SUPPLY_ROLES).not.toContain("manager");
    expect(LISTING_ROLES).not.toContain("developer");
  });

  it("guards each axis without letting one accept the other's values", () => {
    expect(isSupplyRole("owner")).toBe(true);
    expect(isSupplyRole("firm")).toBe(false);
    expect(isListingRole("firm")).toBe(true);
    expect(isListingRole("host")).toBe(false);
    expect(isWorkspaceKind("host")).toBe(true);
    expect(isWorkspaceKind("personal")).toBe(false);
  });
});

describe("workspaces", () => {
  it("files every kind on exactly one side, so the sheet cannot drift from the coin", () => {
    for (const kind of WORKSPACE_KINDS) {
      expect(WORKSPACE_SIDE[kind]).toMatch(/^(property|stays)$/);
    }
    expect(WORKSPACE_SIDE.host).toBe("stays");
  });

  it("makes every standing selectable, including the three that are bad news", () => {
    for (const standing of WORKSPACE_STANDINGS) {
      expect(WORKSPACE_STANDING_COPY[standing].selectable).toBe(true);
    }
  });

  it("labels the bad standings in text rather than leaving them to colour", () => {
    expect(WORKSPACE_STANDING_COPY.pending.label).toBeTruthy();
    expect(WORKSPACE_STANDING_COPY.refused.label).toBeTruthy();
    expect(WORKSPACE_STANDING_COPY.suspended.label).toBeTruthy();
  });

  it("says nothing at all about a workspace in good standing", () => {
    expect(WORKSPACE_STANDING_COPY.active.label).toBeNull();
  });
});

describe("the doors", () => {
  it("puts the owner first, because that is the supply this platform now wants", () => {
    expect(SUPPLY_DOOR_ORDER[0]).toBe("owner");
    expect([...SUPPLY_DOOR_ORDER]).toEqual(["owner", "agent", "firm"]);
  });

  it("gives every property door a failure it answers and a proof that answers it", () => {
    for (const id of ["owner", "agent", "firm"] as const) {
      const door = SUPPLY_DOORS[id];
      expect(door.whatCanGoWrong.length).toBeGreaterThan(40);
      expect(door.thereforeProve.length).toBeGreaterThan(20);
      expect(door.needs.length).toBeGreaterThan(2);
    }
  });

  it("makes the firm's checklist a superset in spirit: it starts from the agent's", () => {
    expect(SUPPLY_DOORS.firm.needs[0]).toMatch(/agent/i);
  });

  it("offers three stays doors, and they are the founder's three", () => {
    expect([...STAYS_DOOR_ORDER]).toEqual(["hotel", "shortlet", "restaurant"]);
    for (const id of STAYS_DOOR_ORDER) expect(STAYS_DOORS[id].title).toBeTruthy();
  });
});

describe("what a reader is told", () => {
  it("names the lister for an agent and a firm and never for an owner", () => {
    expect(LISTING_ROLE_SENTENCE.owner).not.toContain("{name}");
    expect(LISTING_ROLE_SENTENCE.agent).toContain("{name}");
    expect(LISTING_ROLE_SENTENCE.firm).toContain("{name}");
  });

  it("has a filter label for every listing role", () => {
    for (const role of LISTING_ROLES) {
      expect(LISTING_ROLE_FILTER_LABEL[role]).toBeTruthy();
    }
  });

  it("dates every fact, because an old check is not the same statement as a new one", () => {
    for (const fact of Object.values(DATED_FACTS)) {
      expect(fact.meaning).toContain("{date}");
    }
  });

  it("refuses to turn an ownership document into a statement about title", () => {
    expect(DATED_FACTS.ownership.meaning).toMatch(/not a land registry/i);
  });

  it("keeps the three facts on three different subjects", () => {
    expect(DATED_FACTS.registration.subject).toBe("business");
    expect(DATED_FACTS.ownership.subject).toBe("property");
    expect(DATED_FACTS.mandate.subject).toBe("property");
  });
});

describe("the answer that keeps nine owners in ten in the product", () => {
  it("offers having no document at all as a first class answer", () => {
    expect(NO_DOCUMENT_ANSWER.label).toBe("I have none of these");
  });

  it("promises a published listing and withholds only the mark", () => {
    expect(NO_DOCUMENT_ANSWER.reassurance).toMatch(/does not stop you listing/i);
    expect(NO_DOCUMENT_ANSWER.reassurance).toMatch(/ownership mark/i);
  });

  /*
   * The two titling figures rest on a search summary rather than a primary
   * source, and they wait on a lawyer's confirmation.
   * The behaviour needs no citation, so the behaviour is what ships.
   */
  it("prints no statutory figure or percentage a lawyer has not confirmed", () => {
    const strings: string[] = [NO_DOCUMENT_ANSWER.reassurance, NO_DOCUMENT_ANSWER.label];
    for (const door of Object.values(SUPPLY_DOORS)) {
      strings.push(door.whatCanGoWrong, door.thereforeProve, ...door.needs);
    }
    expect(strings.join(" ")).not.toMatch(/per cent|%|₦|LASRERA|Certificate of Occupancy/);
  });
});

describe("the ladder, stated once", () => {
  it("builds its sentence from the ladder itself rather than from a hardcoded list", () => {
    const sentence = ladderSentence();
    for (const rung of VERIFICATION_ORDER) {
      expect(sentence).toContain(rung.label.toLowerCase());
    }
  });

  it("describes no rung the ladder does not have, which is the drift that shipped", () => {
    expect(ladderSentence()).not.toMatch(/phone/i);
    expect(supplyPrimer()).not.toMatch(/phone/i);
  });

  it("includes the payout rung, which the assistant's own paragraph left out", () => {
    expect(ladderSentence()).toMatch(/bank account/i);
  });

  it("states the position the platform now holds", () => {
    expect(supplyPrimer()).toMatch(/removes the runaround/i);
  });
});
