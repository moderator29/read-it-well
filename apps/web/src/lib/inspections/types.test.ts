import { describe, expect, it } from "vitest";
import { isOpen, OPEN_STATES, waitingOn, type InspectionState } from "./types";

/**
 * The inspection vocabulary, tested directly.
 *
 * Two functions, and both of them decide what a person SEES about whose turn
 * it is. That is worth pinning: the whole point of making an inspection a real
 * object is that a lister and a renter looking at the same request agree about
 * who is holding it up, and both surfaces read these two functions to say so.
 *
 * The exhaustive list below is deliberate. When a seventh state is added to
 * `public.inspection_state` the union changes, this array stops covering it,
 * and the first test fails - which is the point at which somebody has to
 * decide whether the new state is open work or a record, rather than
 * discovering it as a blank pill on an agent's dashboard.
 */
const ALL: InspectionState[] = [
  "REQUESTED",
  "CONFIRMED",
  "PROPOSED",
  "DECLINED",
  "COMPLETED",
  "WITHDRAWN",
];

describe("isOpen", () => {
  it("counts exactly the two states somebody still has to act on", () => {
    expect(ALL.filter(isOpen)).toEqual(["REQUESTED", "PROPOSED"]);
  });

  it("agrees with OPEN_STATES", () => {
    for (const state of ALL) {
      expect(isOpen(state)).toBe(OPEN_STATES.includes(state));
    }
  });

  it("treats every finished state as closed", () => {
    expect(isOpen("DECLINED")).toBe(false);
    expect(isOpen("COMPLETED")).toBe(false);
    expect(isOpen("WITHDRAWN")).toBe(false);
  });

  it("does not treat a confirmed viewing as open work", () => {
    /* A confirmed inspection is agreed. Nobody owes anybody an answer, so it
       must not sit in the lister's "waiting on you" queue. */
    expect(isOpen("CONFIRMED")).toBe(false);
  });
});

describe("waitingOn", () => {
  it("puts a fresh request on the lister", () => {
    expect(waitingOn("REQUESTED")).toBe("lister");
  });

  it("puts a proposed time back on the person who asked", () => {
    /* This is the transition that stops a reschedule reading as a refusal:
       the lister has answered, so the ball moves. */
    expect(waitingOn("PROPOSED")).toBe("requester");
  });

  it("leaves every settled state waiting on nobody", () => {
    for (const state of ["CONFIRMED", "DECLINED", "COMPLETED", "WITHDRAWN"] as const) {
      expect(waitingOn(state)).toBe("nobody");
    }
  });

  it("never says both parties are waiting", () => {
    for (const state of ALL) {
      const side = waitingOn(state);
      expect(["lister", "requester", "nobody"]).toContain(side);
    }
  });

  it("waits on somebody exactly when the state is open", () => {
    /* The two functions are read by the same row: one decides whether the
       request appears in a queue, the other decides whether that row draws
       controls. They must not disagree, or a request sits in a queue with
       nothing to press. */
    for (const state of ALL) {
      expect(waitingOn(state) !== "nobody").toBe(isOpen(state));
    }
  });
});
