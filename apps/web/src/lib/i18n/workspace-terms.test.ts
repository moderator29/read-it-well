import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";

/*
 * V-75. ONE NOUN FOR WHO YOU ARE BEING: WORKSPACE.
 *
 * The product had five names for the second switch ("Switch profile",
 * "Switch role", "Agent Mode", "Personal Mode", "Register as a supplier"), and
 * the dock's centre drew the swap arrows that mean the side flip. PRODUCT.md
 * section 7 now says Workspace, and this walks every English UI string so a
 * synonym cannot come back quietly. The side switch keeps its own word, Flip.
 */
const BANNED = /\b(switch profile|switch role|agent mode|personal mode|register as a supplier|choose your mode|between modes)\b/i;

function strings(value: unknown, path: string, out: [string, string][]): void {
  if (typeof value === "string") out.push([path, value]);
  else if (Array.isArray(value)) value.forEach((v, i) => strings(v, `${path}[${i}]`, out));
  else if (value && typeof value === "object") {
    for (const [key, v] of Object.entries(value)) strings(v, path ? `${path}.${key}` : key, out);
  }
}

describe("the workspace noun (V-75)", () => {
  it("no English UI string uses a retired synonym", () => {
    const all: [string, string][] = [];
    strings(getDictionary("en"), "", all);
    const offenders = all.filter(([, text]) => BANNED.test(text)).map(([path, text]) => `${path}: ${text}`);
    expect(offenders).toEqual([]);
  });
});
