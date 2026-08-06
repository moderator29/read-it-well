import { describe, expect, it, vi } from "vitest";
import { createUndoWindow } from "./undo-window";

/**
 * The undo window, proved where a browser cannot go.
 *
 * The surface this was written for is the agent's listings workspace, and
 * reaching it needs somebody signed up, approved as an agent, with a draft
 * saved. None of that exists yet. What can be wrong here is not the markup, it
 * is the timing: a delete sent twice, a delete sent after it was taken back, or
 * one quietly dropped because the screen closed first. Each of those is a real
 * listing and its photos, so each one gets a test.
 */

function harness(windowMs = 6000) {
  const committed: string[] = [];
  const window = createUndoWindow({ windowMs, onCommit: (id) => committed.push(id) });
  return { committed, window };
}

describe("createUndoWindow", () => {
  it("sends nothing while the offer stands", () => {
    vi.useFakeTimers();
    const { committed, window } = harness();
    window.schedule("draft-1");
    vi.advanceTimersByTime(5999);
    expect(committed).toEqual([]);
    expect(window.held()).toEqual(["draft-1"]);
    vi.useRealTimers();
  });

  it("sends it once the offer runs out", () => {
    vi.useFakeTimers();
    const { committed, window } = harness();
    window.schedule("draft-1");
    vi.advanceTimersByTime(6000);
    expect(committed).toEqual(["draft-1"]);
    expect(window.held()).toEqual([]);
    vi.useRealTimers();
  });

  it("never sends one that was taken back", () => {
    vi.useFakeTimers();
    const { committed, window } = harness();
    window.schedule("draft-1");
    expect(window.cancel("draft-1")).toBe(true);
    vi.advanceTimersByTime(60_000);
    expect(committed).toEqual([]);
    vi.useRealTimers();
  });

  it("cannot take back one that has already gone", () => {
    vi.useFakeTimers();
    const { committed, window } = harness();
    window.schedule("draft-1");
    vi.advanceTimersByTime(6000);
    expect(window.cancel("draft-1")).toBe(false);
    expect(committed).toEqual(["draft-1"]);
    vi.useRealTimers();
  });

  it("holds several at once and takes back only the one named", () => {
    vi.useFakeTimers();
    const { committed, window } = harness();
    window.schedule("a");
    window.schedule("b");
    window.schedule("c");
    window.cancel("b");
    vi.advanceTimersByTime(6000);
    expect(committed).toEqual(["a", "c"]);
    vi.useRealTimers();
  });

  it("scheduling the same draft twice does not send it twice", () => {
    vi.useFakeTimers();
    const { committed, window } = harness();
    window.schedule("draft-1");
    vi.advanceTimersByTime(3000);
    window.schedule("draft-1");
    vi.advanceTimersByTime(3000);
    expect(committed).toEqual(["draft-1"]);
    /* And the second schedule did not extend the first window either. */
    vi.advanceTimersByTime(60_000);
    expect(committed).toEqual(["draft-1"]);
    vi.useRealTimers();
  });

  /* Leaving the screen commits what was asked for. The agent tapped delete;
     walking away is not a change of mind, and a draft that quietly survived
     because somebody tapped Bookings is the worse surprise. */
  it("commits everything outstanding when the screen closes", () => {
    vi.useFakeTimers();
    const { committed, window } = harness();
    window.schedule("a");
    window.schedule("b");
    window.flush();
    expect(committed).toEqual(["a", "b"]);
    expect(window.held()).toEqual([]);
    /* And the timers it cleared cannot fire behind it. */
    vi.advanceTimersByTime(60_000);
    expect(committed).toEqual(["a", "b"]);
    vi.useRealTimers();
  });

  it("a flush racing the timer still sends it once", () => {
    vi.useFakeTimers();
    const { committed, window } = harness();
    window.schedule("draft-1");
    vi.advanceTimersByTime(6000);
    window.flush();
    expect(committed).toEqual(["draft-1"]);
    vi.useRealTimers();
  });

  it("flushing nothing does nothing", () => {
    const { committed, window } = harness();
    window.flush();
    expect(committed).toEqual([]);
  });
});
