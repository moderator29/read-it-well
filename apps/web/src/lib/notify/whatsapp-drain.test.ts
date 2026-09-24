import { describe, expect, it } from "vitest";
import type { WhatsAppTransport } from "./whatsapp";

/*
 * The drain against a recorded fake of the service-role client: every
 * `from(...)` chain is kept as the steps it was built with, and answered by
 * `respond`. The seams under test are the stuck-claim sweep, money first,
 * `not_before` (the query skips a held row; age counts from it), and the claim.
 */

type Call = { table: string; op: string; steps: [string, unknown[]][] };
const OPS = new Set(["select", "update", "delete", "insert", "upsert"]);

function fakeAdmin(respond: (call: Call) => unknown) {
  const calls: Call[] = [];
  const chain = (call: Call): unknown =>
    new Proxy(
      {},
      {
        get(_target, prop: string) {
          if (prop === "then") {
            return (resolve: (v: unknown) => void) => resolve({ data: respond(call), error: null });
          }
          return (...args: unknown[]) => {
            if (!call.op && OPS.has(prop)) call.op = prop;
            call.steps.push([prop, args]);
            return chain(call);
          };
        },
      },
    );
  const admin = {
    from(table: string) {
      const call: Call = { table, op: "", steps: [] };
      calls.push(call);
      return chain(call);
    },
    auth: {
      admin: { getUserById: async () => ({ data: { user: { phone: "2348030000000", phone_confirmed_at: "2026-01-01T00:00:00Z" } } }) },
    },
  };
  return { admin, calls };
}

const has = (call: Call, step: string, ...args: unknown[]) =>
  call.steps.some(([name, got]) => name === step && args.every((a, i) => JSON.stringify(got[i]) === JSON.stringify(a)));

function transport() {
  const sent: string[] = [];
  const t: WhatsAppTransport = {
    configured: true,
    async sendTemplate(message) {
      sent.push(message.template);
      return { outcome: "sent" };
    },
    async sendText() {
      return { outcome: "sent" };
    },
  };
  return { t, sent };
}

const NOW = new Date("2026-09-24T12:00:00Z");
const ago = (hours: number) => new Date(NOW.getTime() - hours * 3_600_000).toISOString();
const row = (id: string, event: string, created: string, notBefore: string | null = null) => ({
  id,
  user_id: "u-1",
  event,
  path: "/wallet",
  attempts: 0,
  created_at: created,
  not_before: notBefore,
});

function standard(queue: { money: unknown[]; rest: unknown[] }) {
  return (call: Call) => {
    if (call.table === "feature_flags") return { enabled: true };
    if (call.table === "profiles") return { settings: { whatsappDoorbell: true } };
    if (call.table === "whatsapp_queue" && call.op === "select") {
      return has(call, "eq", "event", "money_update") ? queue.money : queue.rest;
    }
    if (call.table === "whatsapp_queue" && call.op === "update" && has(call, "in", "status", ["queued", "failed"])) {
      return [{ id: "claimed" }];
    }
    return null;
  };
}

describe("the WhatsApp drain (V-96)", () => {
  it("sweeps claims older than ten minutes back to failed before it reads", async () => {
    const { whatsappDrain } = await import("./whatsapp-drain");
    const { admin, calls } = fakeAdmin(standard({ money: [], rest: [] }));
    await whatsappDrain(admin as never, transport().t, NOW);
    const sweep = calls.find((c) => c.table === "whatsapp_queue" && c.op === "update");
    expect(sweep).toBeDefined();
    expect(has(sweep!, "update", { status: "failed", last_error: "claim_expired" })).toBe(true);
    expect(has(sweep!, "eq", "status", "sending")).toBe(true);
    expect(has(sweep!, "lt", "claimed_at", new Date(NOW.getTime() - 10 * 60_000).toISOString())).toBe(true);
    const firstRead = calls.findIndex((c) => c.table === "whatsapp_queue" && c.op === "select");
    expect(calls.indexOf(sweep!)).toBeLessThan(firstRead);
  });

  it("sends money before an older social bell, and never reads a row still held", async () => {
    const { whatsappDrain } = await import("./whatsapp-drain");
    const { t, sent } = transport();
    const { admin, calls } = fakeAdmin(
      standard({ money: [row("m", "money_update", ago(1))], rest: [row("s", "inspection_update", ago(3))] }),
    );
    const counts = await whatsappDrain(admin as never, t, NOW);
    expect(counts.sent).toBe(2);
    expect(sent[0]).toMatch(/money/);
    const reads = calls.filter((c) => c.table === "whatsapp_queue" && c.op === "select");
    expect(reads).toHaveLength(2);
    for (const read of reads) expect(has(read, "or", `not_before.is.null,not_before.lte.${NOW.toISOString()}`)).toBe(true);
  });

  it("ages a held bell from when it could ring, and kills an unheld one past six hours", async () => {
    const { whatsappDrain } = await import("./whatsapp-drain");
    const { t, sent } = transport();
    const { admin, calls } = fakeAdmin(
      standard({
        money: [],
        rest: [row("held-all-night", "inspection_update", ago(10), ago(1)), row("stale", "inspection_update", ago(7))],
      }),
    );
    const counts = await whatsappDrain(admin as never, t, NOW);
    expect(counts.sent).toBe(1);
    expect(sent).toHaveLength(1);
    const dead = calls.find((c) => c.op === "update" && has(c, "update", { status: "dead", last_error: "too_old" }));
    expect(dead && has(dead, "eq", "id", "stale")).toBe(true);
  });

  it("claims a row before sending it, and sends nothing it could not claim", async () => {
    const { whatsappDrain } = await import("./whatsapp-drain");
    const { t, sent } = transport();
    const lostRace = (call: Call) =>
      call.table === "whatsapp_queue" && call.op === "update" && has(call, "in", "status", ["queued", "failed"])
        ? []
        : standard({ money: [row("m", "money_update", ago(1))], rest: [] })(call);
    const { admin } = fakeAdmin(lostRace);
    await whatsappDrain(admin as never, t, NOW);
    expect(sent).toHaveLength(0);
  });
});
