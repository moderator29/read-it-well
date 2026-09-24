import { describe, expect, it } from "vitest";
import { intentFromForm, intentLine, sendIntent, withdrawIntent } from "./money-intent";

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

describe("money intents (V-81)", () => {
  it("reads the form the way the action reads its validated input", () => {
    expect(intentLine(intentFromForm("send", form({ amount: "5,000", recipientEmail: "Ada@Example.com" })))).toBe(
      intentLine(sendIntent(500_000, "ada@example.com")),
    );
    expect(intentLine(intentFromForm("withdraw", form({ amount: "5000", bankAccountId: "abc" })))).toBe(
      intentLine(withdrawIntent(500_000, { bankAccountId: "abc" })),
    );
    expect(intentLine(intentFromForm("withdraw", form({ amount: "5000", bankCode: "058", accountNumber: "0123 456 789" })))).toBe(
      intentLine(withdrawIntent(500_000, { bankCode: "058", accountNumber: "0123456789" })),
    );
  });
  it("gives a saved account, a typed account, another amount and another recipient different lines", () => {
    const lines = new Set([
      intentLine(withdrawIntent(500_000, { bankAccountId: "abc" })),
      intentLine(withdrawIntent(500_000, { bankCode: "058", accountNumber: "0123456789" })),
      intentLine(withdrawIntent(500_001, { bankAccountId: "abc" })),
      intentLine(sendIntent(500_000, "ada@example.com")),
      intentLine(sendIntent(500_000, "thief@example.com")),
    ]);
    expect(lines.size).toBe(5);
  });
});
