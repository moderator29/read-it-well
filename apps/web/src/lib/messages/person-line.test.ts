import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getDictionary } from "@vallo/i18n";

import { counterpartFactsFrom, personFacts } from "./person-line";

const copy = getDictionary("en").trustVisible.person;

describe("the person line (V-23)", () => {
  it("prints every fact, in order, when every fact is there", () => {
    const facts = counterpartFactsFrom({
      identity_seen_at: "2026-08-12T10:00:00Z",
      identity_nimc: true,
      member_since: "2026-03-02T10:00:00Z",
      phone_confirmed: true,
      viewings_arranged: 4,
    });
    expect(personFacts(facts, copy, "en").map((f) => f.text)).toEqual([
      "Identity matched with NIMC, 12 Aug 2026",
      "On Vallo since March 2026",
      "Phone confirmed",
      "4 viewings arranged on Vallo",
    ]);
  });

  it("prints nothing for a null, a false or a zero: no 'not verified', no '0 viewings'", () => {
    const facts = counterpartFactsFrom({
      identity_seen_at: null,
      identity_nimc: false,
      member_since: null,
      phone_confirmed: false,
      viewings_arranged: 0,
    });
    expect(personFacts(facts, copy, "en")).toEqual([]);
    expect(personFacts(null, copy, "en")).toEqual([]);
    expect(counterpartFactsFrom(undefined)).toBeNull();
  });

  it("says seen, not matched, unless NIMC matched it", () => {
    const facts = counterpartFactsFrom({ identity_seen_at: "2026-08-12T10:00:00Z", identity_nimc: false });
    expect(personFacts(facts, copy, "en")[0]!.text).toBe("Identity document seen by Vallo, 12 Aug 2026");
  });

  it("is read from the RPC and drawn under the header", () => {
    const root = join(__dirname, "..", "..");
    const page = readFileSync(join(root, "app/(app)/messages/[id]/page.tsx"), "utf8");
    expect(page).toContain('rpc("thread_counterpart_facts", { p_conversation: id })');
    const view = readFileSync(join(root, "app/(app)/messages/[id]/ThreadView.tsx"), "utf8");
    expect(view).toContain('data-testid="thread-person"');
  });
});
