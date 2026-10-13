import { describe, expect, it, vi } from "vitest";
import { readSenderIdPage, senderIdVerdict, senderStatusOf } from "./termii-sender-ids";
import { termiiSenderIdsCheck } from "./provider-checks";

const KEY = "TLsecretkey-do-not-print";

const laravelPage = {
  current_page: 1,
  last_page: 1,
  data: [
    { sender_id: "Vallo", status: "unblock", company: "Vallo Ltd", usecase: "OTP", country: "Nigeria", created_at: "2026-10-01" },
    { sender_id: "ValloNG", status: "pending", company: "Vallo Ltd", created_at: "2026-10-05" },
  ],
};

describe("the Termii sender ID list", () => {
  it("reads both page shapes Termii has answered with", () => {
    expect(readSenderIdPage(laravelPage).rows.map((r) => r.senderId)).toEqual(["Vallo", "ValloNG"]);
    const newer = readSenderIdPage({ content: [{ sender_id: "Vallo", status: "active", createdAt: "2026-10-01" }], totalPages: 3 });
    expect(newer.rows[0]).toMatchObject({ senderId: "Vallo", status: "approved", createdAt: "2026-10-01" });
    expect(newer.pages).toBe(3);
    expect(readSenderIdPage(null)).toEqual({ rows: [], pages: 1 });
    expect(readSenderIdPage({ message: "nope" }).rows).toEqual([]);
  });

  it("names a status in words the founder can act on", () => {
    expect(senderStatusOf("unblock")).toBe("approved");
    expect(senderStatusOf("Active")).toBe("approved");
    expect(senderStatusOf("pending")).toBe("pending");
    expect(senderStatusOf("blocked")).toBe("blocked");
    expect(senderStatusOf("something new")).toBe("unknown");
    expect(senderStatusOf(undefined)).toBe("unknown");
  });

  it("says whether TERMII_SENDER_ID matches an approved one", () => {
    const rows = readSenderIdPage(laravelPage).rows;
    expect(senderIdVerdict("Vallo", rows)).toMatchObject({ ok: true });
    expect(senderIdVerdict("ValloNG", rows)).toMatchObject({ ok: false });
    expect(senderIdVerdict("ValloNG", rows).line).toContain("pending");
    expect(senderIdVerdict("vallo", rows).line).toContain("Match the spelling exactly");
    expect(senderIdVerdict("Other", rows).line).toContain("not registered");
    expect(senderIdVerdict("Other", rows).line).toContain("Approved: Vallo");
    expect(senderIdVerdict("", rows).line).toContain("not set");
  });
});

describe("the provider check that lists them", () => {
  const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }));

  it("lists the sender IDs and calls the sender-id endpoint with the key, once per page", async () => {
    const fetcher = vi.fn(() => json(laravelPage));
    const out = await termiiSenderIdsCheck({ TERMII_API_KEY: KEY, TERMII_SENDER_ID: "Vallo" }, fetcher);
    expect(out.ok).toBe(true);
    expect(out.senders?.map((s) => [s.senderId, s.status])).toEqual([
      ["Vallo", "approved"],
      ["ValloNG", "pending"],
    ]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url] = fetcher.mock.calls[0] as unknown as [string];
    expect(url).toMatch(/^https:\/\/api\.ng\.termii\.com\/api\/sender-id\?api_key=/);
  });

  it("never returns the key, in a result or in any failure", async () => {
    const results = [
      await termiiSenderIdsCheck({ TERMII_API_KEY: KEY, TERMII_SENDER_ID: "Vallo" }, () => json(laravelPage)),
      await termiiSenderIdsCheck({ TERMII_API_KEY: KEY }, () => json({}, 401)),
      await termiiSenderIdsCheck({ TERMII_API_KEY: KEY }, () => Promise.reject(new Error(`boom ${KEY}`))),
      await termiiSenderIdsCheck({ TERMII_API_KEY: KEY, TERMII_SENDER_ID: "X" }, () => json({ data: [] })),
    ];
    for (const out of results) expect(JSON.stringify(out)).not.toContain(KEY);
  });

  it("explains each way it can fail", async () => {
    expect((await termiiSenderIdsCheck({}, () => json({}))).detail).toContain("TERMII_API_KEY not set");
    expect((await termiiSenderIdsCheck({ TERMII_API_KEY: KEY }, () => json({}, 401))).detail).toContain("HTTP 401");
    expect((await termiiSenderIdsCheck({ TERMII_API_KEY: KEY }, () => Promise.reject(new Error("x")))).detail).toContain("No answer");
    const none = await termiiSenderIdsCheck({ TERMII_API_KEY: KEY, TERMII_SENDER_ID: "Vallo" }, () => json({ data: [] }));
    expect(none.ok).toBe(false);
    expect(none.detail).toContain("no sender IDs");
  });

  it("flags a TERMII_SENDER_ID that is not the approved one", async () => {
    const out = await termiiSenderIdsCheck({ TERMII_API_KEY: KEY, TERMII_SENDER_ID: "ValloNG" }, () => json(laravelPage));
    expect(out.ok).toBe(false);
    expect(out.detail).toContain("Approved: Vallo");
  });
});
