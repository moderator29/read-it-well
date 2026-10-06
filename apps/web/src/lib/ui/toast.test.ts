import { describe, expect, it } from "vitest";
import { currentToast, dismissToast, dwellFor, subscribeToast, swipeDismisses, toast } from "./toast";

describe("the one toast", () => {
  it("shows the newest message and replaces the last", () => {
    const seen: (string | null)[] = [];
    const off = subscribeToast((item) => seen.push(item?.message ?? null));
    toast("Link copied");
    toast.success("Saved");
    expect(currentToast()?.message).toBe("Saved");
    expect(currentToast()?.tone).toBe("success");
    dismissToast();
    expect(currentToast()).toBeNull();
    off();
    expect(seen).toEqual(["Link copied", "Saved", null]);
  });

  it("dismisses by id only while that message is up", () => {
    const first = toast("One");
    toast("Two");
    dismissToast(first);
    expect(currentToast()?.message).toBe("Two");
    dismissToast();
  });

  it("gives errors and undo offers the longer dwell", () => {
    expect(dwellFor("neutral", false)).toBe(2400);
    expect(dwellFor("error", false)).toBe(6000);
    expect(dwellFor("success", true)).toBe(6000);
    const id = toast.error("Could not copy");
    expect(currentToast()?.durationMs).toBe(6000);
    dismissToast(id);
  });

  it("swipes away far enough or fast enough, and springs back otherwise", () => {
    expect(swipeDismisses(80, 0.1)).toBe(true);
    expect(swipeDismisses(-80, -0.1)).toBe(true);
    expect(swipeDismisses(20, 0.6)).toBe(true);
    expect(swipeDismisses(30, 0.1)).toBe(false);
  });
});
