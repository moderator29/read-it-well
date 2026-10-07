import { describe, expect, it } from "vitest";
import { isSocialPath, settlePausedBack } from "./paused-back";

describe("the paused social back", () => {
  it("knows the four social areas, and only them", () => {
    for (const href of ["/around", "/around/yaba", "/post/1", "/stories/new", "/u/ada", "/u?x=1", "/around?tab=a#b"]) {
      expect(isSocialPath(href), href).toBe(true);
    }
    for (const href of ["/messages/abc", "/home", "/profile", "/postcode", "/users", "/aroundx"]) {
      expect(isSocialPath(href), href).toBe(false);
    }
  });

  it("goes back to the thread a post was opened from", () => {
    const thread: Parameters<typeof settlePausedBack>[0] = { action: "back", href: "/messages/abc", delta: 1, reason: "history-is-origin" };
    expect(settlePausedBack(thread, "/home")).toBe(thread);
  });

  it("replaces to the side's home when the decision lands on another social screen", () => {
    expect(settlePausedBack({ action: "replace", href: "/around", reason: "declared-parent" }, "/stays")).toEqual({
      action: "replace",
      href: "/stays",
      reason: "root-fallback",
    });
    expect(settlePausedBack({ action: "back", href: "/post/9", delta: 2, reason: "history-is-origin" }, "/home")).toMatchObject({
      action: "replace",
      href: "/home",
    });
  });

  it("leaves an exit alone", () => {
    expect(settlePausedBack({ action: "exit", reason: "root" }, "/home")).toEqual({ action: "exit", reason: "root" });
  });
});
