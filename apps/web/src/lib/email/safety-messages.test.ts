import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { scamRecall } from "./safety-messages";
import { OUTBOX_TEMPLATES } from "../notify/templates";

describe("the scam recall email (V-60)", () => {
  it("names the listing and the reason, and never the account or the reporter", () => {
    const mail = scamRecall({ name: "Ada", listingTitle: "Two bedroom flat in Ikeja GRA", category: "off_platform_payment" });
    const flat = mail.text.replace(/\s+/g, " ");
    expect(flat).toContain("An account you talked to about Two bedroom flat in Ikeja GRA was stopped by Vallo for asking people to pay outside Vallo.");
    expect(flat).toContain("If you paid them anything");
    expect(mail.html).toContain("/safety");
  });

  it("says nothing about a listing it does not have", () => {
    const mail = scamRecall({ category: "scam" });
    expect(mail.text.replace(/\s+/g, " ")).toContain("An account you talked to was stopped by Vallo for breaking Vallo's safety rules.");
  });

  it("is reached: the registry builds it from the exact payload the database writes, and drops an unknown category", () => {
    const entry = OUTBOX_TEMPLATES["safety.scam_recall"];
    const context = { recipientId: "u", recipient: { name: "Ada" }, lookups: {} } as never;
    expect(entry?.build({ listing_title: "Flat", category: "scam" }, context)?.subject).toContain("stopped");
    expect(entry?.build({ listing_title: "Flat", category: "fraud" }, context)).toBeNull();
    const sql = readFileSync(
      join(__dirname, "../../../../../supabase/migrations/20260924131300_v60_scam_exposure_recall.sql"),
      "utf8",
    );
    expect(sql).toContain("'safety.scam_recall'");
    expect(sql).toContain("jsonb_build_object('listing_title', who.listing_title, 'category', cat,");
  });
});
