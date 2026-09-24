import { describe, expect, it } from "vitest";
import { readSanctionsDesk, strHref } from "./desk";

describe("the sanctions desk read (SCUML item 8)", () => {
  it("never reads a failure as an empty desk", () => {
    expect(readSanctionsDesk(null, { message: "down" })).toEqual({ state: "unreadable" });
    expect(readSanctionsDesk({ status: "ok" }, null)).toEqual({ state: "unreadable" });
    expect(readSanctionsDesk({ status: "forbidden" }, null)).toEqual({ state: "forbidden" });
  });

  it("shapes lists, hits with their pending proposal, and recent screenings", () => {
    const desk = readSanctionsDesk(
      {
        status: "ok",
        me: "a1",
        lists: [{ source: "un", activatedAt: "2026-09-24T06:10:00Z", entries: 3, origin: "url" }],
        hits: [
          {
            id: "h1", personId: "p1", source: "un", reference: "FXi.001", kind: "fuzzy", score: 0.91,
            screenedName: "Zeph Braxtov", matchedName: "ZEPHYRIN QUILLAN BRAXTOVÉ", createdAt: "2026-09-24T07:00:00Z", trigger: "payout_account",
            status: "open", datesOfBirth: ["1971-07-02"], nationalities: ["Testland"], delisted: false,
            pending: { id: "d1", decision: "clear", note: "DOB differs", proposedBy: "a2", proposedAt: "2026-09-24T08:00:00Z" },
          },
        ],
        recent: [{ id: "s1", subject: "transaction", trigger: "transaction", outcome: "clear", at: "2026-09-24T07:00:00Z" }],
        waiting: 4,
        waitingLists: [{ id: "v2", source: "ng", entries: 80, previousEntries: 100, origin: "upload", loadedBy: "a2", loadedAt: "2026-09-24T09:00:00Z" }],
      },
      null,
    );
    expect(desk.state).toBe("ok");
    if (desk.state !== "ok") return;
    expect(desk.hits[0]).toMatchObject({ kind: "fuzzy", score: 0.91, pending: { id: "d1", proposedBy: "a2" } });
    expect(desk.recent[0]!.subject).toBe("transaction");
    expect(desk.waiting).toBe(4);
    expect(desk.hits[0]).toMatchObject({ datesOfBirth: ["1971-07-02"], nationalities: ["Testland"], status: "open" });
    expect(desk.waitingLists[0]).toMatchObject({ id: "v2", previousEntries: 100, loadedBy: "a2" });
  });

  it("hands the person and the hit to the STR lane", () => {
    expect(strHref({ id: "h1", personId: "p1" })).toBe("/admin/compliance?tab=str&person=p1&from=sanctions%3Ah1");
  });
});
