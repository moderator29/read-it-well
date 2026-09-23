import { describe, expect, it } from "vitest";
import { QA_ACCOUNT_IDS, QA_NOT_IN, isQaAccount, withoutQa } from "./shapes";
import { assemblePulse } from "./overview";

/** The founder's ruling of 23 September: QA accounts are out of every statistic and still findable, labelled. */
describe("the QA accounts", () => {
  it("names exactly the two accounts the founder created", () => {
    expect([...QA_ACCOUNT_IDS]).toEqual(["957b3bd2-cce3-425d-bba9-5cd876ca3d62", "03f3dd52-ea28-4852-9abe-e5b0a67c2a43"]);
    expect(QA_NOT_IN).toBe("(957b3bd2-cce3-425d-bba9-5cd876ca3d62,03f3dd52-ea28-4852-9abe-e5b0a67c2a43)");
  });
  it("drops them from a person-keyed statistic and keeps everyone else", () => {
    const rows = [{ who: "957b3bd2-cce3-425d-bba9-5cd876ca3d62" }, { who: "real-1" }, { who: "03f3dd52-ea28-4852-9abe-e5b0a67c2a43" }, { who: null }];
    expect(withoutQa(rows, (r) => r.who)).toEqual([{ who: "real-1" }, { who: null }]);
    expect(isQaAccount(null)).toBe(false);
  });
  it("carries the real people count through the pulse", () => {
    const days = ["2026-09-22", "2026-09-23"];
    const pulse = assemblePulse({ days, liveNow: 0, liveWeekAgo: 0, publishedAt: [], signups: [], submitted: [], collected: [], people: 7 });
    expect(pulse.peopleTotal).toBe(7);
  });
  it("recognises each QA account so a list can label it QA", () => {
    for (const id of QA_ACCOUNT_IDS) expect(isQaAccount(id)).toBe(true);
    expect(isQaAccount("real-1")).toBe(false);
  });
});
