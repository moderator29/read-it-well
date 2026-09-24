import { describe, expect, it } from "vitest";
import type { DrainResult } from "../../landlord/drain";
import { landlordLineVerdict } from "./landlord-line";

function result(over: Partial<DrainResult> = {}): DrainResult {
  return {
    open: true,
    queued: { fortnightly: 2, inspectionConfirmed: 1, rentPaid: 1 },
    issued: 4,
    sent: 4,
    failed: 0,
    refused: 0,
    transport: "sms",
    error: null,
    ...over,
  };
}

describe("the landlord line job's verdict", () => {
  it("is a clean, quiet run while the flag is off", () => {
    const verdict = landlordLineVerdict(result({ open: false, issued: 0, sent: 0, transport: "stub" }), true);
    expect(verdict.outcome).toBe("ok");
    expect(verdict.alert).toBeNull();
  });

  it("is clean when everything issued was sent", () => {
    expect(landlordLineVerdict(result(), true)).toMatchObject({ outcome: "ok", alert: null, counts: { sent: 4, rent_paid: 1 } });
  });

  it("puts it on the desk when the line is on in production with nothing to deliver it", () => {
    const verdict = landlordLineVerdict(result({ transport: "stub" }), true);
    expect(verdict.alert?.kind).toBe("landlord_line.stub_transport");
  });

  it("does not alarm about the stub outside production", () => {
    expect(landlordLineVerdict(result({ transport: "stub" }), false).alert).toBeNull();
  });

  it("raises a failed send and a failed run", () => {
    expect(landlordLineVerdict(result({ failed: 1, sent: 3 }), true).alert?.kind).toBe("landlord_line.send_failed");
    expect(landlordLineVerdict(result({ error: "issue: boom" }), true).alert?.kind).toBe("landlord_line.failed");
  });
});
