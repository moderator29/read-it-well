import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * The inbound webhook's dedupe seam (V-96): Meta redelivers, and only the
 * delivery whose insert made the `whatsapp_inbound_seen` row may answer. A
 * failed insert answers nothing.
 */

const seam = vi.hoisted(() => ({
  seen: new Set<string>(),
  insertFails: false,
  texts: [] as string[],
  deferred: [] as (() => Promise<void>)[],
}));

vi.mock("next/server", async (importOriginal) => {
  const real = await importOriginal<typeof import("next/server")>();
  return { ...real, after: (work: () => Promise<void>) => seam.deferred.push(work) };
});
vi.mock("@/lib/security/rate-limit", () => ({ consume: async () => ({ allowed: true, degraded: false }) }));
vi.mock("@/lib/landlord/inbound", () => ({ handleInboundReply: vi.fn() }));
vi.mock("@/lib/notify/whatsapp", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/notify/whatsapp")>();
  return {
    ...real,
    cloudTransport: () => ({
      configured: true,
      sendTemplate: async () => ({ outcome: "sent" }),
      sendText: async (to: string) => {
        seam.texts.push(to);
        return { outcome: "sent" };
      },
    }),
  };
});
vi.mock("@/lib/wallet/ledger", () => ({
  getAdminClient: () => ({
    from: () => ({
      upsert: (row: { wamid_hash: string }) => ({
        select: async () => {
          if (seam.insertFails) return { data: null, error: { code: "57014" } };
          if (seam.seen.has(row.wamid_hash)) return { data: [], error: null };
          seam.seen.add(row.wamid_hash);
          return { data: [row], error: null };
        },
      }),
    }),
  }),
}));

const SECRET = "test-app-secret";
const body = JSON.stringify({
  entry: [{ changes: [{ value: { messages: [{ id: "wamid.ABC", from: "2348030000000", text: { body: "hello" } }] } }] }],
});
const deliver = () =>
  new Request("https://www.vallospaces.com/api/whatsapp/inbound", {
    method: "POST",
    headers: { "x-hub-signature-256": `sha256=${createHmac("sha256", SECRET).update(body).digest("hex")}` },
    body,
  });

async function drainAfter() {
  while (seam.deferred.length > 0) await seam.deferred.shift()!();
}

beforeEach(() => {
  process.env.WHATSAPP_APP_SECRET = SECRET;
  seam.seen.clear();
  seam.insertFails = false;
  seam.texts = [];
  seam.deferred = [];
});

describe("POST /api/whatsapp/inbound, delivered twice (V-96)", () => {
  it("answers the first delivery and not the redelivery, storing only a hash", async () => {
    const { POST } = await import("./route");
    expect((await POST(deliver())).status).toBe(200);
    expect((await POST(deliver())).status).toBe(200);
    await drainAfter();
    expect(seam.texts).toEqual(["+2348030000000"]);
    expect([...seam.seen][0]).toMatch(/^[0-9a-f]{32}$/);
    expect([...seam.seen][0]).not.toContain("wamid");
  });

  it("answers nothing when the seen row cannot be written", async () => {
    seam.insertFails = true;
    const { POST } = await import("./route");
    expect((await POST(deliver())).status).toBe(200);
    await drainAfter();
    expect(seam.texts).toEqual([]);
  });
});
