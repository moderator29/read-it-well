import { describe, expect, it } from "vitest";
import { createMatcher } from "./match";
import { screenParties } from "./screen";

const matcher = createMatcher([
  { entryId: "e1", source: "ng", reference: "FXN.001", primaryName: "Quorvin Adelmaro Tesk", names: ["adelmaro quorvin tesk"] },
]);

describe("screening a set of parties (SCUML item 8)", () => {
  it("records a clean screening, with the names it screened", () => {
    expect(screenParties([{ personId: "p1", names: ["Ada Obi", "ADA OBI "] }], matcher)).toEqual({
      outcome: "clear",
      best: 0,
      namesScreened: ["Ada Obi", "ADA OBI"],
      matches: [],
    });
  });

  it("gives each match to the party it belongs to, on a transaction with two", () => {
    const record = screenParties(
      [
        { personId: "guest", names: ["Ada Obi"] },
        { personId: "agent", names: ["Tesk Quorvin Adelmaro"] },
      ],
      matcher,
    );
    expect(record.outcome).toBe("exact");
    expect(record.matches).toHaveLength(1);
    expect(record.matches[0]).toMatchObject({ personId: "agent", reference: "FXN.001", kind: "exact" });
  });

  it("says no_list, never clear, with no list loaded, and no_name with nothing to screen", () => {
    expect(screenParties([{ personId: "p1", names: ["Ada Obi"] }], null).outcome).toBe("no_list");
    expect(screenParties([{ personId: "p1", names: [" "] }], matcher).outcome).toBe("no_name");
  });
});
