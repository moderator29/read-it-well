import { describe, expect, it } from "vitest";
import { screenName } from "@/lib/nav/route-labels";
import { ROUTE_PARENTS } from "@/lib/nav/route-parents";
import { isKnownRoute } from "@/lib/routing/known-routes";
import { findScreens, findScreenTool, MAX_SCREENS, NO_SCREEN_NOTE, screensFor, type Screen } from "./find-screen";
import { runTool } from "./registry";
import { TOOL_FRAMES, type ToolFrame } from "./types";

/** The rules every href this tool can ever return obeys, in `frame`. */
function expectOfferable(screens: Screen[], frame: ToolFrame) {
  for (const { href, label } of screens) {
    expect(isKnownRoute(href), href).toBe(true);
    expect(href, href).not.toContain("[");
    expect(href.startsWith("/admin"), href).toBe(false);
    expect(href in ROUTE_PARENTS, href).toBe(true);
    expect(label, href).toBe(screenName(href));
    const first = href.split("/").filter(Boolean)[0];
    if (frame === "agent") expect(first, href).toBe("agent");
    else if (frame === "host") expect(first, href).toBe("host");
    else expect(["agent", "host", "admin"], href).not.toContain(first);
  }
}

const NEEDS = [
  "where do I set my viewing times",
  "where are my payouts",
  "how do I change my settings",
  "where do I see my messages",
  "photos",
  "admin console",
  "listing",
  "reviews and ratings",
  "notifications",
  "verification",
  "calendar",
  "booking",
];

describe("the screens find_screen may name", () => {
  it.each(TOOL_FRAMES)("in the %s frame are known, static, never /admin and inside the frame", (frame) => {
    const all = screensFor(frame);
    expect(all.length).toBeGreaterThan(3);
    expectOfferable(all, frame);
  });

  it.each(TOOL_FRAMES)("every answer in the %s frame obeys the same rules", (frame) => {
    for (const need of NEEDS) {
      const found = findScreens(need, frame);
      expect(found.length).toBeLessThanOrEqual(MAX_SCREENS);
      expectOfferable(found, frame);
    }
  });

  it("never offers an admin screen, whatever the frame or the words", () => {
    for (const frame of TOOL_FRAMES) {
      for (const need of ["admin", "console", "staff switches", "audit", "kyc", "operations providers"]) {
        expect(findScreens(need, frame).some((s) => s.href.startsWith("/admin"))).toBe(false);
      }
    }
  });
});

describe("find_screen answers", () => {
  it("'where do I set my viewing times' from the agent frame with real agent routes only", () => {
    const found = findScreens("where do I set my viewing times", "agent");
    expect(found[0]).toEqual({ href: "/agent/inspections", label: "Inspections" });
    for (const s of found) expect(s.href.startsWith("/agent/")).toBe(true);
  });

  it("finds the host's photos from the host frame", () => {
    expect(findScreens("where do I upload photographs of my rooms", "host")[0]?.href).toBe("/host/photos");
  });

  it("finds saved places from the plain concierge", () => {
    expect(findScreens("where are my saved places", "consumer")[0]?.href).toBe("/saved");
  });

  it("does not hand a workspace screen to the plain concierge", () => {
    for (const s of findScreens("my earnings and payouts", "consumer")) {
      expect(s.href.startsWith("/agent") || s.href.startsWith("/host")).toBe(false);
    }
  });

  it("answers nothing, with Vallo's note, when no screen fits", async () => {
    expect(findScreens("where", "agent")).toEqual([]);
    const run = await runTool("find_screen", { need: "zzzz qqqq" }, { frame: "agent" });
    expect(run).toEqual({ ok: true, outcome: { data: { screens: [] }, note: NO_SCREEN_NOTE } });
  });

  it("runs through the registry in the caller's frame", async () => {
    const run = await runTool("find_screen", { need: "set my viewing times" }, { frame: "agent" });
    expect(run.ok).toBe(true);
    if (run.ok) expect((run.outcome.data as { screens: Screen[] }).screens[0]?.href).toBe("/agent/inspections");
    expect(findScreenTool.mode).toBe("read");
  });
});
