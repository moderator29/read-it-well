import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * A2: the sign-up options carry the phone door only while phone sign-in is
 * switched on. Source-level pins, because the page is a server component
 * this suite cannot render.
 */
const src = (path: string) => readFileSync(join(__dirname, "../..", path), "utf8");

describe("the phone door on sign-up", () => {
  it("is passed the flag by the page", () => {
    expect(src("app/(auth)/sign-up/page.tsx")).toContain("phoneReady={phoneSignInEnabled()}");
  });

  it("is drawn only when the flag is on, carrying next to the phone sign-in", () => {
    const options = src("components/auth/SignUpOptions.tsx");
    expect(options).toMatch(/phoneReady = false/);
    expect(options).toMatch(/\{phoneReady && \(\s*<AuthPillLink href=\{withNext\("\/sign-in\/phone", next\)\}/);
  });
});
