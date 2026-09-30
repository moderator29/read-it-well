import { describe, expect, it } from "vitest";
import { lastProved, rosterWarning } from "./key-roster-rules";

const key = (lastUsedAt: string | null = null) => ({ label: "iPhone", createdAt: "2026-09-20T10:00:00Z", lastUsedAt });

describe("the console key roster (C14)", () => {
  it("warns on no key and on one key, and holds a super admin to two", () => {
    expect(rosterWarning("staff", [])).toBe("no-key");
    expect(rosterWarning("staff", [key()])).toBe("one-key");
    expect(rosterWarning("staff", [key(), key()])).toBeNull();
    expect(rosterWarning("super_admin", [key()])).toBe("super-admin-needs-two");
    expect(rosterWarning("super_admin", [key(), key()])).toBeNull();
  });
  it("reads the newest proof across keys", () => {
    expect(lastProved([key("2026-09-28T10:00:00Z"), key("2026-09-29T10:00:00Z"), key(null)])).toBe("2026-09-29T10:00:00Z");
    expect(lastProved([key(null)])).toBeNull();
  });
});
