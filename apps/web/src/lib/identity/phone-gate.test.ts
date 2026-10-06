import { describe, expect, it } from "vitest";

import { confirmedPhoneLookup, requireConfirmedPhone } from "./phone-gate";

function client(result: { data: unknown; error: unknown }) {
  const seen: string[] = [];
  return {
    seen,
    from: (t: string) => ({
      select: (c: string) => ({
        eq: (k: string, v: string) => ({
          maybeSingle: async () => {
            seen.push(`${t}.${c} ${k}=${v}`);
            return result;
          },
        }),
      }),
    }),
  };
}

describe("phone gate", () => {
  it("passes a confirmed phone", async () => {
    const c = client({ data: { phone: "+2348031234567" }, error: null });
    expect(await requireConfirmedPhone(confirmedPhoneLookup(c), "u1")).toEqual({ ok: true, phone: "+2348031234567" });
    expect(c.seen).toEqual(["confirmed_phones.phone user_id=u1"]);
  });

  it("refuses without one", async () => {
    expect(await requireConfirmedPhone(confirmedPhoneLookup(client({ data: null, error: null })), "u1")).toEqual({
      ok: false,
      reason: "phone_required",
    });
  });

  it("fails closed on a failed read or no member", async () => {
    expect(await requireConfirmedPhone(confirmedPhoneLookup(client({ data: null, error: { message: "x" } })), "u1")).toEqual({
      ok: false,
      reason: "unknown",
    });
    expect((await requireConfirmedPhone(async () => "+234", null)).ok).toBe(false);
  });
});
