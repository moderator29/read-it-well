/**
 * The 3D passcode's presentation states (docs/PASSCODE.md; founder reference
 * 56): the frame is always a night island, the ring shows the photo, the
 * initial or the padlock, the brand is Vallo's own lockup, and setup names
 * its step under the title. Behaviour is covered by PasscodeGate.dom.test.tsx
 * and lib/passcode; this is only what is drawn.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { getDictionary } from "@vallo/i18n";

vi.mock("@/lib/passcode/actions", () => ({
  verifyPasscodeAction: async () => ({ status: "error" }),
  setPasscodeAction: async () => ({ ok: false, reason: "error" }),
  forgotPasscodeAction: async () => undefined,
}));
vi.mock("@/lib/profile/actions", () => ({ signOut: async () => ({ ok: true, data: null }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => undefined, push: () => undefined }) }));

import { PasscodeFrame, ringContent } from "./PasscodeFrame";
import { PasscodeLock } from "./PasscodeLock";
import { PasscodeSetup } from "./PasscodeSetup";

const copy = getDictionary("en").passcode;

describe("ringContent", () => {
  it("shows the photo on the lock when there is one, else the initial", () => {
    expect(ringContent("face", "https://example.test/a.jpg", true)).toBe("photo");
    expect(ringContent("face", null, true)).toBe("initial");
    expect(ringContent("face", "", true)).toBe("initial");
  });
  it("shows the padlock on setup, and the initial if the object is not ready", () => {
    expect(ringContent("lock", "https://example.test/a.jpg", true)).toBe("padlock");
    expect(ringContent("lock", null, false)).toBe("initial");
  });
});

describe("PasscodeFrame", () => {
  const draw = (overlay: boolean) =>
    renderToStaticMarkup(
      <PasscodeFrame overlay={overlay} titleId="t" title="Welcome back, Ada" subtitle="Enter your passcode" name="Ada" wordmark="VALLO">
        <span />
      </PasscodeFrame>,
    );

  it("is always a night island, as the lock and as the settings card", () => {
    expect(draw(true)).toMatch(/<dialog[^>]*data-theme="dark"/);
    expect(draw(false)).toMatch(/<section[^>]*data-theme="dark"/);
  });

  it("draws the dome, Vallo's own mark and wordmark, and the ring with the initial", () => {
    const html = draw(true);
    expect(html).toContain("nf-passcode__dome");
    expect(html).toContain("vallo-mark.png");
    expect(html).toContain("vallo-wordmark.png");
    expect(html).toContain('data-ring="initial"');
    expect(html).toMatch(/nf-passcode__initial">A</);
  });
});

describe("the lock and setup screens", () => {
  it("the lock greets by first name over the dots and eleven keys", () => {
    const html = renderToStaticMarkup(
      <PasscodeLock copy={copy} locale="en" mode="code" length={6} name="Ada Okafor" verify={async () => ({ status: "error" })} />,
    );
    expect(html).toContain("Welcome back, Ada");
    expect(html).toContain(copy.enterCode);
    expect(html).toContain('data-ring="initial"');
    expect(html.match(/class="nf-passcode__key(?: nf-passcode__key--quiet)?"/g)?.length).toBe(11);
  });

  it("setup draws the padlock, the title and step one, with the why under the dots", () => {
    const html = renderToStaticMarkup(<PasscodeSetup copy={copy} locale="en" mode="first" name="Ada" overlay />);
    expect(html).toContain('data-ring="padlock"');
    expect(html).toContain(copy.setupTitle);
    expect(html).toContain("Step 1 of 2. Choose 6 digits.");
    expect(html).toContain(copy.setupBody);
  });

  it("the confirm step is titled and numbered as step two", () => {
    expect(copy.confirmTitle).toBe("Confirm your passcode");
    expect(copy.stepConfirm).toContain("Step 2 of 2");
  });
});
