import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { pepQuestionRefusal } from "./pep-gate";
import { isUndeployed } from "./rpc";

function client(answer: { data: unknown; error: { message: string; code: string | null } | null }) {
  return { rpc: async () => answer };
}

/**
 * SCUML item 20: the PEP gate before a payout account. The migration that
 * creates `my_pep_answered_at` may not be applied yet, and "not deployed" must
 * not read as "the check failed", or no lister can add a payout account.
 */
describe("the PEP gate", () => {
  it("does not refuse while the function is not deployed", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await pepQuestionRefusal(client({ data: null, error: { message: "no function", code: "PGRST202" } }))).toBeNull();
    expect(await pepQuestionRefusal(client({ data: null, error: { message: "no function", code: "42883" } }))).toBeNull();
    warn.mockRestore();
  });

  it("still refuses when a deployed function fails", async () => {
    const refusal = await pepQuestionRefusal(client({ data: null, error: { message: "timeout", code: "57014" } }));
    expect(refusal).toEqual(expect.any(String));
  });

  it("refuses until the question is answered, and passes once it is", async () => {
    expect(await pepQuestionRefusal(client({ data: null, error: null }))).toEqual(expect.any(String));
    expect(await pepQuestionRefusal(client({ data: "2026-09-28T10:00:00Z", error: null }))).toBeNull();
  });

  it("recognises only the undefined-function codes as undeployed", () => {
    expect(isUndeployed({ message: "x", code: "PGRST202" })).toBe(true);
    expect(isUndeployed({ message: "relation does not exist", code: "42P01" })).toBe(false);
    expect(isUndeployed({ message: "function does not exist", code: null })).toBe(false);
    expect(isUndeployed(null)).toBe(false);
  });
});
