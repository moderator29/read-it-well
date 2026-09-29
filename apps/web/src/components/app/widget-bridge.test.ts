import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The widget bridge is mounted on every in-app page, so the Supabase browser
 * client must stay out of its static imports and be created only in the
 * native shell.
 */
const source = readFileSync(join(process.cwd(), "src/components/app/WidgetBridge.tsx"), "utf8");

describe("WidgetBridge", () => {
  it("imports the browser client and the widget helper only dynamically", () => {
    expect(source).not.toMatch(/^import[^;]*["']@\/lib\/supabase\/client["']/m);
    expect(source).not.toMatch(/^import[^;]*["']@\/lib\/native\/widget["']/m);
    expect(source).toContain('import("@/lib/supabase/client")');
  });

  it("checks for the native shell before loading anything", () => {
    const gate = source.indexOf("if (!looksNative()) return;");
    expect(gate).toBeGreaterThan(-1);
    expect(gate).toBeLessThan(source.indexOf('import("@/lib/supabase/client")'));
  });
});
