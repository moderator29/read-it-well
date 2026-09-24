import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { renderClient } from "@/lib/testing/render-client";

/**
 * UI-14: nothing renders `displayHost()` directly, because it answers
 * differently on the server and in the browser (error #418 on every load of
 * the profile editor). The hook renders the server's answer during
 * hydration.
 */
describe("a host printed in copy is hydration-safe", () => {
  it("renders the brand domain on the server", async () => {
    const html = await renderClient(`
      import { renderToString } from "react-dom/server";
      import { useDisplayHost } from "@/lib/ui/use-display-host";
      function Host() { return <span>{useDisplayHost()}</span>; }
      export const html = () => renderToString(<Host />);
    `);
    expect(html).toBe("<span>vallospaces.com</span>");
  }, 30_000);

  it("no component calls displayHost() while rendering JSX", () => {
    for (const file of ["components/social/profile/ProfileEditor.tsx", "app/(app)/around/new/ProposeAreaForm.tsx"]) {
      const text = readFileSync(join(process.cwd(), "src", file), "utf8");
      expect(text, file).not.toMatch(/\{displayHost\(\)\}/);
      expect(text, file).toContain("useDisplayHost()");
    }
  });
});
