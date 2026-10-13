import { describe, expect, it } from "vitest";
import { REFUSAL } from "@/lib/money/balance-copy";
import { reach } from "./reach";

describe("reach: a money action that throws is a refusal, never a stuck sheet", () => {
  it("passes an answer through untouched", async () => {
    await expect(reach(async () => ({ ok: true as const, data: 5 }))).resolves.toEqual({ ok: true, data: 5 });
    await expect(reach(async () => ({ ok: false as const, error: "no" }))).resolves.toEqual({ ok: false, error: "no" });
  });

  it("turns a rejection into the no-answer refusal, marked unreached so the key is kept", async () => {
    const r = await reach<null>(() => Promise.reject(new TypeError("Failed to fetch")));
    expect(r).toEqual({ ok: false, error: REFUSAL.noAnswer, unreached: true });
  });
});
