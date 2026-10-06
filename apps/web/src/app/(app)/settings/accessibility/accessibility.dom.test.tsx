import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, describe, expect, it } from "vitest";
import { axe, closeAxe, hasBrowser } from "@/lib/a11y/axe";
import { AccessibilitySettings } from "./AccessibilitySettings";

afterAll(closeAxe);

describe("Settings > Accessibility (R3-15)", () => {
  const html = renderToStaticMarkup(<AccessibilitySettings />);

  it("holds contrast, transparency and text size together", () => {
    expect(html).toContain('data-testid="a11y-contrast"');
    expect(html).toContain('data-testid="a11y-transparency"');
    expect(html).toContain("Text size");
  });
});

describe.skipIf(!hasBrowser && !process.env.CI)("Settings > Accessibility (axe)", () => {
  it("has no axe violations", async () => {
    expect(await axe(`<h1>Accessibility</h1>${html()}`)).toEqual([]);
  });
});

function html(): string {
  return renderToStaticMarkup(<AccessibilitySettings />);
}
