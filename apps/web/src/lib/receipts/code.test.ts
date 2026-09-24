import { describe, expect, it } from "vitest";
import { formatReceiptCode, normaliseReceiptCode, readVerifyAnswer } from "./code";

describe("receipt codes", () => {
  it("reads what a person types, as the database does", () => {
    expect(normaliseReceiptCode("vr-7k2mq-9abcd")).toBe("7K2MQ9ABCD");
    expect(normaliseReceiptCode("VR 7K2MQ 9ABCD")).toBe("7K2MQ9ABCD");
    expect(normaliseReceiptCode("7K2MO-9ABCL")).toBe("7K2M09ABC1");
  });
  it("refuses what cannot be a code without spending a lookup", () => {
    expect(normaliseReceiptCode("VR-1234")).toBeNull();
    expect(normaliseReceiptCode("VR-UUUUU-UUUUU")).toBeNull();
  });
  it("prints the code the way it is read aloud", () => {
    expect(formatReceiptCode("7K2MQ9ABCD")).toBe("VR-7K2MQ-9ABCD");
  });
});

describe("readVerifyAnswer", () => {
  const ok = {
    status: "ok", paid_minor: 330000000, paid_at: "2026-10-01T10:00:00Z", tenant: "Ada O.", lister: "Musa",
    rent_period: "year", area: "Yaba", city: "Lagos", parts: { rent: 300000000, caution: 30000000, address: "x" },
  };
  it("reads a genuine receipt and keeps only the six named parts", () => {
    const out = readVerifyAnswer(ok);
    expect(out.state).toBe("ok");
    if (out.state === "ok") {
      expect(out.receipt.parts).toEqual({ rent: 300000000, caution: 30000000 });
      expect(out.receipt.area).toBe("Yaba");
    }
  });
  it("passes through not found and rate limited, and refuses a malformed answer", () => {
    expect(readVerifyAnswer({ status: "not_found" }).state).toBe("not_found");
    expect(readVerifyAnswer({ status: "rate_limited" }).state).toBe("rate_limited");
    expect(readVerifyAnswer({ ...ok, paid_minor: -1 }).state).toBe("unavailable");
    expect(readVerifyAnswer(null).state).toBe("unavailable");
  });
});
