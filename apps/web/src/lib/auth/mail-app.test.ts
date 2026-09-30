import { describe, expect, it } from "vitest";
import { mailAppFor, resendLabel, RESEND_WAIT_SECONDS } from "./mail-app";

describe("mailAppFor (A4)", () => {
  it("names Gmail for a Gmail address, with a search for mail from Vallo", () => {
    const app = mailAppFor("Ada@Gmail.com ");
    expect(app?.app).toBe("Gmail");
    expect(app?.href).toContain("mail.google.com");
    expect(app?.href).toContain("from%3Avallo");
  });

  it("names Outlook, Yahoo and iCloud for their own domains", () => {
    expect(mailAppFor("a@hotmail.com")?.app).toBe("Outlook");
    expect(mailAppFor("a@yahoo.com")?.app).toBe("Yahoo Mail");
    expect(mailAppFor("a@icloud.com")?.app).toBe("iCloud Mail");
  });

  it("offers nothing for anything else, and never guesses", () => {
    expect(mailAppFor("a@company.ng")).toBeNull();
    expect(mailAppFor("gmail.com")).toBeNull();
    expect(mailAppFor("")).toBeNull();
    expect(mailAppFor("a@gmail.com.evil.example")).toBeNull();
  });
});

describe("resendLabel", () => {
  it("fills the seconds and never goes below zero", () => {
    expect(resendLabel("in {s}s", RESEND_WAIT_SECONDS)).toBe("in 30s");
    expect(resendLabel("in {s}s", 2.2)).toBe("in 3s");
    expect(resendLabel("in {s}s", -4)).toBe("in 0s");
  });
});
