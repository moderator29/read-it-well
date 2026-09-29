import { describe, expect, it } from "vitest";
import { ROOM_COPY, ROOM_ITEMS, allChecked, canEditReport, canSubmit, checkedCount, fromSaved, isRoomItem, photosShort } from "./report";

const ALL = Object.fromEntries(ROOM_ITEMS.map((item) => [item, true]));

describe("the inspection report", () => {
  it("has the render's eight rooms, in the render's order, with its words", () => {
    expect(ROOM_ITEMS).toEqual(["exterior", "interior", "kitchen", "bathrooms", "utilities", "appliances", "safety", "overall"]);
    expect(ROOM_COPY.overall.title).toBe("Overall Condition");
    expect(ROOM_COPY.utilities.detail).toBe("Power, water, internet, AC");
  });

  it("counts only what was saved as checked", () => {
    expect(checkedCount({})).toEqual({ done: 0, total: 8 });
    expect(checkedCount({ exterior: true, kitchen: false })).toEqual({ done: 1, total: 8 });
    expect(allChecked(ALL)).toBe(true);
    expect(allChecked({ ...ALL, safety: false })).toBe(false);
  });

  it("recognises only the eight room keys", () => {
    expect(isRoomItem("kitchen")).toBe(true);
    expect(isRoomItem("garden")).toBe(false);
    expect(isRoomItem(null)).toBe(false);
  });

  it("lets nobody tick a room while report storage is off", () => {
    expect(canEditReport(false, "CONFIRMED", null)).toBe(false);
    expect(canEditReport(true, "CONFIRMED", null)).toBe(true);
    expect(canEditReport(true, "REQUESTED", null)).toBe(false);
    expect(canEditReport(true, "CONFIRMED", { notes: null, items: {}, photoCount: 0, submittedAt: "2026-09-23T10:00:00Z" })).toBe(false);
  });

  it("keeps Submit disabled until all eight rooms are ticked, once storage is live", () => {
    const report = { notes: null, items: { exterior: true }, photoCount: 0, submittedAt: null };
    expect(canSubmit(true, "CONFIRMED", report, null)).toBe(false);
    expect(canSubmit(true, "CONFIRMED", { ...report, items: ALL }, null)).toBe(true);
    expect(canSubmit(true, "CONFIRMED", { ...report, items: ALL, submittedAt: "2026-09-23T10:00:00Z" }, null)).toBe(false);
  });

  it("keeps a rental's Submit disabled until the photos its agreement needs are attached", () => {
    const ticked = { notes: null, items: ALL, photoCount: 2, submittedAt: null };
    expect(canSubmit(true, "CONFIRMED", ticked, null, 3)).toBe(false);
    expect(canSubmit(true, "CONFIRMED", { ...ticked, photoCount: 3 }, null, 3)).toBe(true);
    /* A listing that is not a rental keeps the eight-tick rule alone. */
    expect(canSubmit(true, "CONFIRMED", { ...ticked, photoCount: 0 }, null, 0)).toBe(true);
    expect(photosShort(ticked, 3)).toBe(1);
    expect(photosShort({ ...ticked, photoCount: 5 }, 3)).toBe(0);
    expect(photosShort(null, 3)).toBe(3);
  });

  it("falls back to recording the outcome alone while storage is off, and never outside CONFIRMED", () => {
    expect(canSubmit(false, "CONFIRMED", null, "no_deal")).toBe(true);
    expect(canSubmit(false, "CONFIRMED", null, null)).toBe(false);
    expect(canSubmit(false, "PROPOSED", null, "inspected")).toBe(false);
    expect(canSubmit(true, "PROPOSED", { notes: null, items: ALL, photoCount: 0, submittedAt: null }, null)).toBe(false);
  });

  it("reads the action's saved report back onto the screen's view, dropping unknown rooms", () => {
    const view = fromSaved(
      { notes: "Gate sticks.", submittedAt: null, items: [{ item: "kitchen", checked: true }, { item: "garden", checked: true }, { item: "safety", checked: false }] },
      2,
    );
    expect(view).toEqual({ notes: "Gate sticks.", submittedAt: null, items: { kitchen: true, safety: false }, photoCount: 2 });
  });
});
