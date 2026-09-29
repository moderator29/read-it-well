import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { pepQuestionRefusal } from "./pep-gate";

function client(answer: { data: unknown; error: { message: string; code: string | null } | null }) {
  return { rpc: async () => answer };
}

/**
 * SCUML item 20: the PEP gate before a payout account. `my_pep_answered_at`
 * is live (20260929004739), so every failure refuses, a missing function
 * included: there is no "not deployed" pass.
 */
describe("the PEP gate", () => {
  it("refuses when the function is missing, as for any failure", async () => {
    expect(await pepQuestionRefusal(client({ data: null, error: { message: "no function", code: "PGRST202" } }))).toEqual(expect.any(String));
    expect(await pepQuestionRefusal(client({ data: null, error: { message: "no function", code: "42883" } }))).toEqual(expect.any(String));
  });

  it("refuses when the function fails", async () => {
    const refusal = await pepQuestionRefusal(client({ data: null, error: { message: "timeout", code: "57014" } }));
    expect(refusal).toEqual(expect.any(String));
  });

  it("refuses until the question is answered, and passes once it is", async () => {
    expect(await pepQuestionRefusal(client({ data: null, error: null }))).toEqual(expect.any(String));
    expect(await pepQuestionRefusal(client({ data: "2026-09-28T10:00:00Z", error: null }))).toBeNull();
  });
});
