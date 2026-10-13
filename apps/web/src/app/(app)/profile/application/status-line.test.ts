import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";
import { withoutComments } from "@/lib/copy/source-scan";

/*
 * WHERE AN APPLICATION STANDS, SAID FOR THE STATE IT IS IN.
 *
 * The line under the heading was "you will be notified once it is approved"
 * whatever the state, so a refused applicant read it above their refusal and
 * an applicant the reviewer was waiting on was told to wait. The empty state's
 * one button read "Apply to become an agent" and opened the owner form, and a
 * refusal offered no way forward at all.
 */

const page = withoutComments(
  readFileSync(join(process.cwd(), "src/app/(app)/profile/application/page.tsx"), "utf8"),
);
const s = getDictionary("en").agent.status;

describe("the application status page", () => {
  it("draws the line for the application's own state", () => {
    expect(page).toContain("subtitle={statusLine[application.status]}");
    expect(page).not.toContain("subtitle={s.submittedBody}");
  });

  it("gives each state its own words, and only a waiting one says it is being reviewed", () => {
    const lines = {
      draft: s.draftBody,
      waiting: s.submittedBody,
      moreInfo: s.moreInfoBody,
      approved: s.approvedBody,
      refused: s.rejectedBody,
      suspended: s.suspendedBody,
    };
    for (const [state, line] of Object.entries(lines)) {
      expect(line.trim().length, state).toBeGreaterThan(0);
    }
    expect(new Set(Object.values(lines)).size).toBe(Object.keys(lines).length);
    for (const line of [s.moreInfoBody, s.rejectedBody, s.suspendedBody, s.approvedBody]) {
      expect(line).not.toMatch(/once it is approved/i);
    }
    expect(s.suspended).not.toBe(s.rejected);
  });

  it("starts an application at the chooser, and offers a refused applicant the way back", () => {
    expect(page).toContain('cta: { href: "/profile/setup", label: s.startApplication }');
    expect(page).not.toContain('href: "/profile/setup/owner"');
    expect(page).toMatch(/application\.status === "REJECTED" &&[\s\S]{0,200}href="\/profile\/setup"/);
    expect(s.applyAgain.length).toBeGreaterThan(0);
  });

  it("lets a business answer with its registration papers", () => {
    expect(page).toContain("<RespondToReview t={forRespond(t)} business={business} />");
  });
});
