import { describe, expect, it } from "vitest";
import {
  BUSINESS_SECTIONS,
  CONSENTS,
  MAX_FILE_BYTES,
  missingFrom,
  progressLabel,
  rejectFile,
  stepsFor,
  type KycSubmission,
} from "./kyc";

const FILE = { name: "id.jpg", size: 1024, type: "image/jpeg" };

function submission(over: Partial<KycSubmission> = {}): KycSubmission {
  return {
    documents: { identity: FILE, address: FILE },
    business: false,
    businessDetails: {},
    consents: ["accuracy", "terms", "processing"],
    ...over,
  };
}

describe("stepsFor", () => {
  /* The branch is the only hard thing in this flow, so it is the thing tested. */
  it("is five steps before the business question is answered", () => {
    expect(stepsFor(null).map((s) => s.id)).toEqual([
      "identity-document",
      "address-document",
      "business-question",
      "consent",
      "review",
    ]);
  });

  it("stays five when they say they do not run a business", () => {
    expect(stepsFor(false)).toHaveLength(5);
  });

  it("grows to six, with business details in the middle, when they say yes", () => {
    const ids = stepsFor(true).map((s) => s.id);
    expect(ids).toHaveLength(6);
    expect(ids[3]).toBe("business-details");
  });

  it("never puts review anywhere but last", () => {
    for (const answer of [null, true, false] as const) {
      const steps = stepsFor(answer);
      expect(steps[steps.length - 1]?.id).toBe("review");
    }
  });
});

describe("progressLabel", () => {
  it("counts from one, not from zero", () => {
    expect(progressLabel(0, 6)).toBe("Step 1 of 6");
    expect(progressLabel(3, 6)).toBe("Step 4 of 6");
  });
});

describe("rejectFile", () => {
  it("accepts the four stated types", () => {
    for (const type of ["image/jpeg", "image/png", "image/heic", "application/pdf"]) {
      expect(rejectFile({ type, size: 1000 })).toBeNull();
    }
  });

  it("names the accepted types when it refuses one", () => {
    const message = rejectFile({ type: "image/gif", size: 1000 });
    expect(message).toContain("JPG, PNG, HEIC or PDF");
  });

  it("names the ceiling when the file is too big", () => {
    expect(rejectFile({ type: "image/jpeg", size: MAX_FILE_BYTES + 1 })).toContain("8MB");
  });

  it("accepts a file exactly on the limit", () => {
    expect(rejectFile({ type: "image/jpeg", size: MAX_FILE_BYTES })).toBeNull();
  });
});

describe("missingFrom", () => {
  it("is empty for a complete personal submission", () => {
    expect(missingFrom(submission())).toEqual([]);
  });

  it("names the document rather than saying something is missing", () => {
    const gaps = missingFrom(submission({ documents: { address: FILE } }));
    expect(gaps).toEqual(["Government issued ID"]);
  });

  it("names every unticked consent separately", () => {
    expect(missingFrom(submission({ consents: ["terms"] }))).toEqual([
      CONSENTS[0]!.label,
      CONSENTS[2]!.label,
    ]);
  });

  it("asks for the required business fields only once the answer is yes", () => {
    expect(missingFrom(submission({ business: false }))).toEqual([]);
    const required = BUSINESS_SECTIONS.flatMap((s) =>
      s.fields.filter((f) => !f.optional).map((f) => f.label),
    );
    expect(missingFrom(submission({ business: true }))).toEqual(required);
  });

  it("never asks for an optional business field", () => {
    const filled: Record<string, string> = {};
    for (const section of BUSINESS_SECTIONS) {
      for (const field of section.fields) {
        if (!field.optional) filled[field.name] = "x";
      }
    }
    expect(missingFrom(submission({ business: true, businessDetails: filled }))).toEqual([]);
  });

  it("treats whitespace as empty", () => {
    const filled: Record<string, string> = {};
    for (const section of BUSINESS_SECTIONS) {
      for (const field of section.fields) filled[field.name] = "   ";
    }
    expect(missingFrom(submission({ business: true, businessDetails: filled })).length).toBeGreaterThan(0);
  });
});
