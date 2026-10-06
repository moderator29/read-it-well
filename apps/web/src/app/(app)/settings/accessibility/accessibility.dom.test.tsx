import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, describe, expect, it } from "vitest";
import { axe, closeAxe, hasBrowser } from "@/lib/a11y/axe";
import { getDictionary } from "@vallo/i18n";
import { AccessibilitySettings } from "./AccessibilitySettings";

const copy = getDictionary("en").experienceSettings.accessibility;

afterAll(closeAxe);

describe("Settings > Accessibility (R3-15)", () => {
  const html = renderToStaticMarkup(<AccessibilitySettings copy={copy} />);

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
  return renderToStaticMarkup(<AccessibilitySettings copy={copy} />);
}
