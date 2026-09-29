import { describe, expect, it, vi } from "vitest";

vi.mock("../actions/session", () => ({ resolveSession: vi.fn() }));
vi.mock("../supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { orderBlocked } from "./blocks-queries";

describe("the blocked accounts list", () => {
  it("is newest first, one row per person, with a name only where one was read", () => {
    const rows = [
      { other_id: "a", created_at: "2026-09-01T10:00:00Z" },
      { other_id: "b", created_at: "2026-09-20T10:00:00Z" },
      { other_id: "a", created_at: "2026-08-01T10:00:00Z" },
    ];
    const people = orderBlocked(rows, new Map([["b", "Bola"]]));
    expect(people.map((p) => p.userId)).toEqual(["b", "a"]);
    expect(people[0]).toEqual({ userId: "b", name: "Bola", blockedAt: "2026-09-20T10:00:00Z" });
    expect(people[1]?.name).toBeNull();
  });

  it("is empty when nobody is blocked", () => {
    expect(orderBlocked([], new Map())).toEqual([]);
  });
});
