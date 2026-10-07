import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { renderClient } from "@/lib/testing/render-client";

/**
 * A SIGN-IN PROMPT IS NOT GOOD NEWS (Round 3 sweep, C3).
 *
 * The three pages a signed-out payer can land on (a stay's checkout, a rent
 * payment, a crypto payment) drew their "sign in first" screen in the
 * `confirmed` state: the brand plate with the "verified" shield tick and the
 * brand ink, the mark this product keeps for a settled outcome. Nothing has
 * happened yet on those screens, so they use the neutral `sign-in` state: a
 * lock on the neutral plate, muted ink.
 */
const src = (p: string) => readFileSync(join(process.cwd(), "src", p), "utf8");

describe("a sign-in prompt reads as neutral", () => {
  it("the three signed-out payment screens use the sign-in state", () => {
    for (const [file, from] of [
      ["app/(app)/checkout/[bookingId]/page.tsx", 'read.state === "signed-out"'],
      ["app/(app)/rent/pay/[inspectionId]/page.tsx", 'read.state === "signed-out"'],
      ["app/(app)/pay/crypto/[reference]/page.tsx", 'session.state !== "signed-in"'],
      /* A9: the review of a stay drew the same confirmed shield over its sign-in prompt. */
      ["app/(app)/bookings/[bookingId]/review/page.tsx", 'read.state === "signed-out"'],
    ] as const) {
      const text = src(file);
      const at = text.indexOf(from);
      expect(at, file).toBeGreaterThan(-1);
      const block = text.slice(at, text.indexOf("</Shell>", at));
      expect(block, file).toContain('state="sign-in"');
      expect(block, file).not.toContain('state="confirmed"');
      expect(block, file).not.toContain("shield-check");
    }
  });

  it("the review's sign-in prompt returns to the review, in the reader's words", () => {
    const text = src("app/(app)/bookings/[bookingId]/review/page.tsx");
    const at = text.indexOf('read.state === "signed-out"');
    const block = text.slice(at, text.indexOf("</Shell>", at));
    /* "Sign in and you land straight back here" is only true with a `next`. */
    expect(block).toContain('withNext("/sign-in", `/bookings/${encodeURIComponent(bookingId)}/review`)');
    expect(block).not.toMatch(/href: "\/sign-in"/);
    /* Words from the dictionary, not typed into the page. */
    expect(block).toContain("words.signedOutTitle");
    expect(block).not.toContain('"Sign in to review your stay"');
  });

  it("draws a lock on the neutral plate, not the brand verified mark", async () => {
    const render = (state: string) =>
      renderClient(`
        import { renderToStaticMarkup } from "react-dom/server";
        import { ResultScreen } from "@/components/app/ResultSheet";
        export const html = () => renderToStaticMarkup(
          <ResultScreen state="${state}" verdict="Sign in to pay for this stay" consequence="We will bring you back here." />);
      `);
    const [signIn, confirmed] = await Promise.all([render("sign-in"), render("confirmed")]);
    expect(signIn).toContain("nf-plate--neutral");
    expect(signIn).not.toContain("nf-plate--brand");
    expect(signIn).not.toContain("--nf-brand-primary");
    expect(signIn).toContain("--nf-content-muted");
    expect(signIn).not.toContain('role="alert"');
    /* The glyph differs from the confirmed screen's: same words, other mark. */
    const svg = (html: string) => html.slice(html.indexOf("<svg"), html.indexOf("</svg>"));
    expect(svg(signIn)).not.toBe(svg(confirmed));
  }, 30_000);
});
