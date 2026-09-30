import { describe, expect, it } from "vitest";
import { digestFor, referenceFor, shortReference } from "./reference";

describe("error references (C13)", () => {
  it("shows eight upper-case characters of a server digest", () => {
    expect(shortReference("3f9a1c2e77b04d11")).toBe("3F9A1C2E");
    expect(referenceFor({ digest: "3f9a1c2e77b04d11" })).toBe("3F9A1C2E");
  });

  it("is null without a digest", () => {
    expect(shortReference(undefined)).toBeNull();
    expect(shortReference("")).toBeNull();
  });

  it("makes one client reference per error and keeps it", () => {
    const err = new Error("boom");
    const a = digestFor(err);
    expect(a).toMatch(/^C-[A-Z2-9]{6}$/);
    expect(digestFor(err)).toBe(a);
    expect(referenceFor(err)).toBe(a);
  });

  it("prefers the server digest when there is one", () => {
    const err = Object.assign(new Error("x"), { digest: "abcdef0123456789" });
    expect(digestFor(err)).toBe("abcdef0123456789");
  });

  it("strips anything that is not a plain id character", () => {
    expect(shortReference("<ab>cd ef01 23")).toBe("ABCDEF01");
  });
});
