import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The lookup box finds an agent by the VA- code on their advert (A9): it reads
 * `agents.public_code` (migration 20260924104806), the column `/check` reads,
 * and links to the person behind the agent.
 */
const calls: { table: string; column?: string; value?: unknown }[] = [];

vi.mock("./guard", () => ({ requireAdmin: async () => ({ state: "admin" }) }));
vi.mock("../supabase/service", () => ({ findUserByEmail: async () => null }));
vi.mock("../supabase/admin", () => ({
  createAdminClient: () => ({
    from(table: string) {
      const call: (typeof calls)[number] = { table };
      calls.push(call);
      const chain = {
        select: () => chain,
        eq: (column: string, value: unknown) => {
          call.column = column;
          call.value = value;
          return chain;
        },
        ilike: (column: string, value: unknown) => chain.eq(column, value),
        limit: async () => ({
          data:
            table === "agents" && call.value === "VA-7KMNP"
              ? [{ id: "a1", user_id: "u1", display_name: "Tunde Bello", status: "APPROVED", public_code: "VA-7KMNP" }]
              : [],
        }),
      };
      return chain;
    },
  }),
}));

const { lookup } = await import("./lookup-reads");

describe("the lookup box and an agent's code", () => {
  beforeEach(() => {
    calls.length = 0;
  });

  it("reads agents.public_code with the code as minted, from lower case and padding", async () => {
    const result = await lookup("  va-7kmnp ");
    expect(result.kind).toBe("agent");
    expect(calls).toEqual([{ table: "agents", column: "public_code", value: "VA-7KMNP" }]);
    expect(result.hits).toEqual([{ kind: "Agent", title: "VA-7KMNP, Tunde Bello", sub: "Approved", href: "/admin/people/u1" }]);
  });

  it("answers nothing, rather than something wrong, for a code nobody holds", async () => {
    const result = await lookup("VA-3479A");
    expect(result.hits).toEqual([]);
    expect(calls.map((c) => c.table)).toEqual(["agents"]);
  });
});
