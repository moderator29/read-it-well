/**
 * The passcode screen's presentation (docs/PASSCODE.md; MOTION_SYSTEM.md
 * section 6): the frame is always a night island, the brand is Vallo's own
 * vector mark, the dots are the subject, and setup names its step under the
 * title. Behaviour is covered by PasscodeGate.dom.test.tsx and lib/passcode;
 * this is only what is drawn.
 *
 * UPDATED DELIBERATELY ON 6 OCTOBER 2026. This file asserted the dome, the
 * raster mark and wordmark, and the ring with the photo, initial or padlock
 * (`ringContent`). Directive D32 and MOTION_SYSTEM section 6 rebuilt the
 * screen: a quiet monotone ground matching Get Started, a small mark at the
 * top, a line naming who is signing in, and the dots as the one subject. The
 * dome and the ring are gone from the screen, so the assertions that they are
 * drawn went with them, and `ringContent` (which only chose what the ring
 * showed) was removed with its tests. What replaces them asserts the new
 * screen's rules: the vector mark, no dome, no ring, no raster logo.
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

import { PasscodeFrame } from "./PasscodeFrame";
import { PasscodeLock } from "./PasscodeLock";
import { PasscodeSetup } from "./PasscodeSetup";

const copy = getDictionary("en").passcode;

describe("PasscodeFrame", () => {
  const draw = (overlay: boolean) =>
    renderToStaticMarkup(
      <PasscodeFrame overlay={overlay} titleId="t" title="Welcome back, Ada" subtitle="Enter your passcode" name="Ada" wordmark="VALLO">
        <span />
      </PasscodeFrame>,
    );

  it("is a night island as the lock, and follows the theme as the settings card", () => {
    expect(draw(true)).toMatch(/<dialog[^>]*data-theme="dark"/);
    /* The settings card sits on the member's own ground, so it forces nothing
       (W11): a dark island on a Light page is what D28.1 rules out. */
    expect(draw(false)).not.toMatch(/<section[^>]*data-theme=/);
  });

  it("draws Vallo's vector mark, small, and no dome, ring or raster logo", () => {
    const html = draw(true);
    expect(html).toMatch(/<svg[^>]*class="nf-vmark nf-passcode__mark"[^>]*aria-label="Vallo"/);
    expect(html).not.toContain("nf-passcode__dome");
    expect(html).not.toContain("data-ring");
    expect(html).not.toContain(".png");
  });

  it("marks the door open only once the right code has landed", () => {
    expect(draw(true)).not.toContain('data-door="open"');
    const opening = renderToStaticMarkup(
      <PasscodeFrame overlay titleId="t" title="Welcome back, Ada" opening>
        <span />
      </PasscodeFrame>,
    );
    expect(opening).toContain('data-door="open"');
  });
});

describe("the lock and setup screens", () => {
  it("the lock greets by first name over the dots and eleven keys", () => {
    const html = renderToStaticMarkup(
      <PasscodeLock copy={copy} locale="en" mode="code" length={6} name="Ada Okafor" verify={async () => ({ status: "error" })} />,
    );
    expect(html).toContain("Welcome back, Ada");
    expect(html).toContain(copy.enterCode);
    expect(html.match(/class="nf-passcode__key(?: nf-passcode__key--quiet)?"/g)?.length).toBe(11);
  });

  it("setup draws the title and step one, with the why under the dots", () => {
    const html = renderToStaticMarkup(<PasscodeSetup copy={copy} locale="en" mode="first" name="Ada" overlay />);
    expect(html).toContain(copy.setupTitle);
    expect(html).toContain("Step 1 of 2. Choose 4 digits.");
    expect(html).toContain(copy.setupBody);
  });

  it("the confirm step is titled and numbered as step two", () => {
    expect(copy.confirmTitle).toBe("Confirm your passcode");
    expect(copy.stepConfirm).toContain("Step 2 of 2");
  });

  it("offers the biometric first where the member has a platform key, the keypad one tap away", () => {
    const html = renderToStaticMarkup(
      <PasscodeLock copy={copy} locale="en" mode="code" length={4} name="Ada" passkey verify={async () => ({ status: "error" })} />,
    );
    expect(html).toContain(copy.passkeyUnlock);
    expect(html).toContain(copy.usePasscode);
    expect(html).not.toContain('data-testid="passcode-keypad"');
    expect(html.match(/nf-passcode__dot(?!s)/g)?.length).toBe(4);
  });
});
