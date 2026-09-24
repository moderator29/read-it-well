import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getDictionary } from "@vallo/i18n";

import { credentialRefusal } from "./credential-answer";

const desk = getDictionary("en").trustVisible.desk;

describe("the desk's credential answers (V-87)", () => {
  it("reads recorded as success and every refusal in words", () => {
    expect(credentialRefusal("recorded", desk)).toBeNull();
    expect(credentialRefusal("forbidden", desk)).toBe(desk.credentialForbidden);
    expect(credentialRefusal("no_name", desk)).toBe(desk.credentialNoName);
    expect(credentialRefusal("needs_aggregator", desk)).toBe(desk.credentialNeedsAggregator);
    expect(credentialRefusal("invalid", desk)).toBe(desk.credentialInvalid);
    expect(credentialRefusal(null, desk)).toBe(desk.credentialInvalid);
  });

  it("offers no CAC directorship on the desk form and asks for the name on the register", () => {
    const form = readFileSync(join(__dirname, "../../app/admin/kyc/CredentialForm.tsx"), "utf8");
    expect(form).not.toContain('value="cac_director"');
    expect(form).toContain("desk.credentialName");
    const action = readFileSync(join(__dirname, "credentials-actions.ts"), "utf8");
    expect(action).toContain('z.enum(["lasrera", "esvarbon"])');
    expect(action).toContain("p_register_name");
  });
});
