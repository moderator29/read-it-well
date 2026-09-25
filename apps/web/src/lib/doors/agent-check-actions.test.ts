import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * V-61. The check reserves a slot in the platform-wide miss budget BEFORE the
 * lookup, gives it back on a hit in the window it was taken in, refuses every
 * lookup while the budget is spent, and fails closed when the limiter is down.
 */

const consume = vi.fn();
const rpc = vi.fn();

vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": "203.0.113.9" }) }));
vi.mock("../security/rate-limit", () => ({
  consume: (...args: unknown[]) => consume(...args),
  ipFromHeaders: () => "203.0.113.9",
  subjectForIp: (ip: string) => `ip:${ip}`,
}));
vi.mock("@/lib/supabase/service", () => ({ getAdminClient: () => ({}) }));
vi.mock("../landlord/rpc", () => ({ callLandlordRpc: (...args: unknown[]) => rpc(...args) }));
vi.mock("../actions/session", () => ({
  NOT_CONFIGURED_MESSAGE: "nc",
  SIGNED_OUT_MESSAGE: "so",
  resolveSession: async () => ({ state: "signed-out" }),
}));

const { checkAgent } = await import("./agent-check-actions");

function form(query: string): FormData {
  const data = new FormData();
  data.set("query", query);
  return data;
}

const ALLOWED = { allowed: true, degraded: false };

beforeEach(() => {
  consume.mockReset();
  rpc.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("checkAgent", () => {
  it("reserves the miss budget before the lookup and gives it back on a hit, to the reserved window", async () => {
    consume.mockResolvedValue(ALLOWED);
    rpc.mockImplementation(async (_db: unknown, name: string) =>
      name === "agent_lookup" ? { data: { found: true, kind: "code", display_name: "Ada", role: "agent", code: "VA-7K3MP" }, error: null } : { data: null, error: null },
    );
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-24T10:37:12.345Z"));
    const result = await checkAgent(null, form("VA-7K3MP"));
    expect(result.ok && result.data.state).toBe("result");
    const buckets = consume.mock.calls.map((call) => (call[0] as { bucket: string }).bucket);
    expect(buckets).toEqual(["agent_check_code", "agent_check_code_miss"]);
    const names = rpc.mock.calls.map((call) => call[1]);
    expect(names).toEqual(["agent_lookup", "refund_agent_check_slot"]);
    const refund = rpc.mock.calls[1]?.[2] as { p_bucket: string; p_window_start: string };
    expect(refund.p_bucket).toBe("agent_check_code_miss");
    expect(refund.p_window_start).toBe("2026-09-24T10:00:00.000Z");
  });

  it("keeps the slot on a miss", async () => {
    consume.mockResolvedValue(ALLOWED);
    rpc.mockResolvedValue({ data: { found: false }, error: null });
    const result = await checkAgent(null, form("0803 123 4567"));
    expect(result.ok && result.data.state).toBe("result");
    expect(rpc.mock.calls.map((call) => call[1])).toEqual(["agent_lookup"]);
  });

  it("refuses every lookup, without looking, while the budget is spent", async () => {
    consume.mockResolvedValueOnce(ALLOWED).mockResolvedValueOnce({ allowed: false, retryAfterSeconds: 60, retryIn: "in a minute" });
    const result = await checkAgent(null, form("VA-7K3MP"));
    expect(result.ok && result.data.state).toBe("limited");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("fails closed when the limiter is down, for codes and numbers alike", async () => {
    consume.mockResolvedValue({ allowed: true, degraded: true });
    const code = await checkAgent(null, form("VA-7K3MP"));
    const phone = await checkAgent(null, form("0803 123 4567"));
    expect(code.ok).toBe(false);
    expect(phone.ok).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });
});
