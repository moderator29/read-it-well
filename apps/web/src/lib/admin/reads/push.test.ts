import { describe, expect, it } from "vitest";
import { pushDeliveryRow } from "./operations";

describe("pushDeliveryRow", () => {
  const raw = { id: "d1", platform: "web", state: "gone", provider_status: 410, provider_error: "  push subscription\n has expired  ", attempted_at: "2026-09-23T10:00:00Z" };
  it("keeps the state, the provider's status and a tidy error, and nothing that names a device", () => {
    const row = pushDeliveryRow(raw);
    expect(row).toEqual({ id: "d1", platform: "web", state: "gone", providerStatus: 410, error: "push subscription has expired", attemptedAt: "2026-09-23T10:00:00Z" });
    expect(Object.keys(row)).not.toContain("device_ref");
    expect(Object.keys(row)).not.toContain("token_id");
  });
  it("cuts a long error to 160 characters and treats an unknown state as a failure", () => {
    const row = pushDeliveryRow({ ...raw, state: "weird", provider_error: "x".repeat(400), platform: null });
    expect(row.error).toHaveLength(160);
    expect(row.state).toBe("failed");
    expect(row.platform).toBe("web");
  });
  it("reads an empty error as none", () => {
    expect(pushDeliveryRow({ ...raw, provider_error: "   " }).error).toBeNull();
  });
});
