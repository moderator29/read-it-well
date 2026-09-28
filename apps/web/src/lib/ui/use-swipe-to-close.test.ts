import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { swipeCloses } from "./use-swipe-to-close";

/** F-15: the side drawer closes on a swipe, and the dock tray is an overlay. */
describe("swipe to close the drawer", () => {
  it("closes past a third of the panel's width", () => {
    expect(swipeCloses(-120, 0, 300)).toBe(true);
    expect(swipeCloses(-60, 0, 300)).toBe(false);
  });

  it("closes on a quick flick towards the edge, whatever the distance", () => {
    expect(swipeCloses(-20, -0.8, 300)).toBe(true);
  });

  it("never closes on a drag away from the edge", () => {
    expect(swipeCloses(0, -1, 300)).toBe(false);
    expect(swipeCloses(40, 0, 300)).toBe(false);
  });

  it("is wired to the drawer panel, and the dock tray registers as an overlay", () => {
    const src = (path: string) => readFileSync(join(__dirname, "../..", path), "utf8");
    expect(src("components/app/AppShell.tsx")).toMatch(
      /className="nf-drawer nf-drawer--left absolute" \{\.\.\.drawerSwipe\}/,
    );
    expect(src("components/app/DockMore.tsx")).toMatch(
      /useOverlay\(\{ open, onClose: close, panelRef: root, autoFocus: false \}\)/,
    );
  });
});
