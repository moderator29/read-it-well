import { describe, expect, it } from "vitest";
import { readPersonFile } from "./person-file";

describe("readPersonFile", () => {
  it("reads a file and keeps links inside the console", () => {
    const file = readPersonFile({
      state: "ready",
      senior: true,
      person: { user_id: "u", name: "Ada", roles: ["user", 7], agent: { id: "a", tier: 1 }, stop: { id: "s", reason: "fraud" } },
      timeline: [
        { at: "2026-09-01", desk: "stops", title: "Stopped", href: "/admin/stops" },
        { at: "2026-09-02", title: "x", href: "https://evil.example/" },
        { title: "no date" },
      ],
      linked: [
        { user_id: "v", via: "payout", fraud_upheld: true },
        { user_id: "w", via: "gossip" },
      ],
      matches: [{ kind: "phone", sentence: "matches an identity stopped on 3 October 2026 for fraud" }, { kind: "nin" }],
    });
    expect(file.state).toBe("ready");
    if (file.state !== "ready") return;
    expect(file.person.roles).toEqual(["user"]);
    expect(file.timeline).toHaveLength(2);
    expect(file.timeline[1]!.href).toBe("/admin/audit");
    expect(file.linked).toEqual([{ userId: "v", name: "An account", via: "payout", agentStatus: null, stoppedOn: null, fraudUpheld: true }]);
    expect(file.matches).toHaveLength(1);
  });

  it("is unknown or failed otherwise", () => {
    expect(readPersonFile({ state: "unknown" }).state).toBe("unknown");
    expect(readPersonFile(null).state).toBe("failed");
    expect(readPersonFile({ state: "ready", person: {} }).state).toBe("failed");
  });
});
