import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { doorbellEventFor, doorbellParam, e164, inboundMessages, inboundSignatureValid, stubTransport, cloudTransport, DOORBELL_EVENTS } from "./whatsapp";

describe("the doorbell policy (V-96)", () => {
  it("rings only for money and inspections today, never for social events", () => {
    expect(doorbellEventFor("wallet", "/wallet", "Money arrived")).toBe("money_update");
    expect(doorbellEventFor("listing", "/inspections", "Your inspection is tomorrow")).toBe("inspection_tomorrow");
    expect(doorbellEventFor("listing", "/inspections/abc", "Confirmed")).toBe("inspection_update");
    expect(doorbellEventFor("system", "/u/ada", "Someone followed you")).toBeNull();
    expect(doorbellEventFor("wallet", "//evil.com", "x")).toBeNull();
    expect(DOORBELL_EVENTS).toHaveLength(5);
  });
  it("carries one path and never a number, a price or an address", () => {
    expect(doorbellParam("/wallet")).toBe("/wallet");
    expect(doorbellParam("/wallet/0123456789")).toBeNull();
    expect(doorbellParam("/pay?amount=NGN50000")).toBeNull();
    expect(doorbellParam("https://evil.com")).toBeNull();
  });
  it("mirrors the SQL mapping in the migration", () => {
    const sql = readFileSync(join(process.cwd(), "../../supabase/migrations/20260924160500_v96_whatsapp_is_a_doorbell_never_a_room.sql"), "utf8");
    expect(sql).toMatch(/when p_kind = 'wallet' then 'money_update'/);
    expect(sql).toMatch(/p_kind = 'listing' and p_href like '\/inspections%'/);
  });
});

describe("transport", () => {
  it("is the stub, touching nothing, without credentials", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const transport = cloudTransport({});
    expect(transport).toBe(stubTransport);
    expect(await transport.sendText("+2348000000000", "x")).toEqual({ outcome: "not_configured" });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
  it("reads E.164 only", () => {
    expect(e164("+234 803 000 0000")).toBe("+2348030000000");
    expect(e164("08030000000")).toBeNull();
  });
});

describe("inbound", () => {
  it("accepts only a body signed with the app secret", async () => {
    const body = JSON.stringify({ entry: [] });
    const good = `sha256=${createHmac("sha256", "s3cret").update(body).digest("hex")}`;
    expect(await inboundSignatureValid(body, good, "s3cret")).toBe(true);
    expect(await inboundSignatureValid(body, good, "other")).toBe(false);
    expect(await inboundSignatureValid(body, null, "s3cret")).toBe(false);
    expect(await inboundSignatureValid(body, good, undefined)).toBe(false);
  });
  it("reads senders and text from Meta's shape, and nothing malformed", () => {
    const payload = {
      entry: [{ changes: [{ value: { messages: [{ id: "wamid.1", from: "2348030000000", text: { body: "hello" } }, { from: "evil" }] } }] }],
    };
    expect(inboundMessages(payload)).toEqual([{ id: "wamid.1", from: "+2348030000000", text: "hello" }]);
    expect(inboundMessages(null)).toEqual([]);
  });
});

describe("the drain (V-96)", () => {
  it("leaves the queue alone without credentials", async () => {
    vi.doMock("server-only", () => ({}));
    const { whatsappDrain } = await import("./whatsapp-drain");
    const from = vi.fn();
    const counts = await whatsappDrain({ from, auth: { admin: { getUserById: vi.fn() } } } as never, stubTransport);
    expect(counts.idle).toBe(true);
    expect(from).not.toHaveBeenCalled();
  });
});
