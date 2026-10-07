import { afterEach, describe, expect, it, vi } from "vitest";
import { ICON_3D_NAMES } from "@/components/ui/icon-3d";
import {
  APP_OBJECTS,
  BENTO_OBJECTS,
  CATEGORY_OBJECTS,
  CLOSE_OBJECTS,
  HERO_OBJECTS,
  JOURNEY_OBJECTS,
  OS_OBJECTS,
  TRUTH_OBJECTS,
} from "./landing-objects";
import { objectsMayMove, pointerOffset } from "./object-field";

/*
 * The landing's 3D objects (30 September): one per card or tile, never the
 * same object twice in a room, every one a real file, and never the receipt
 * (it carries a dollar coin, and the landing's figures are in naira).
 */
const rooms: Record<string, readonly string[]> = {
  journey: JOURNEY_OBJECTS,
  bento: Object.values(BENTO_OBJECTS),
  categories: Object.values(CATEGORY_OBJECTS),
  truths: TRUTH_OBJECTS,
  os: Object.values(OS_OBJECTS),
  app: Object.values(APP_OBJECTS),
  hero: HERO_OBJECTS.map((o) => o.name),
  close: CLOSE_OBJECTS.map((o) => o.name),
};

describe("the landing's 3D objects", () => {
  it.each(Object.entries(rooms))("%s uses each object once, and only real ones", (_room, names) => {
    expect(new Set(names).size).toBe(names.length);
    for (const n of names) expect(ICON_3D_NAMES as readonly string[]).toContain(n);
    expect(names).not.toContain("receipt");
  });

  it("gives the journey one object per step and the categories one per tile", () => {
    expect(JOURNEY_OBJECTS).toHaveLength(4);
    expect(Object.keys(CATEGORY_OBJECTS)).toHaveLength(8);
  });

  it("gives every floating object its own slot", () => {
    for (const field of [HERO_OBJECTS, CLOSE_OBJECTS]) {
      expect(new Set(field.map((o) => o.slot)).size).toBe(field.length);
    }
  });
});

describe("pointerOffset", () => {
  const rect = { left: 100, top: 50, width: 200, height: 100 };
  it("reads the centre as zero and the edges as one", () => {
    expect(pointerOffset(rect, 200, 100)).toEqual({ x: 0, y: 0 });
    expect(pointerOffset(rect, 100, 50)).toEqual({ x: -1, y: -1 });
    expect(pointerOffset(rect, 300, 150)).toEqual({ x: 1, y: 1 });
  });
  it("clamps a pointer outside the room", () => {
    expect(pointerOffset(rect, 900, -400)).toEqual({ x: 1, y: -1 });
  });
  it("answers zero for an empty box", () => {
    expect(pointerOffset({ left: 0, top: 0, width: 0, height: 0 }, 5, 5)).toEqual({ x: 0, y: 0 });
  });
});

describe("objectsMayMove", () => {
  afterEach(() => vi.unstubAllGlobals());

  function stub(reduce: boolean, dataset: Record<string, string>) {
    vi.stubGlobal("window", { matchMedia: () => ({ matches: reduce }) });
    vi.stubGlobal("document", { documentElement: { dataset } });
  }

  it("moves by default", () => {
    stub(false, {});
    expect(objectsMayMove()).toBe(true);
  });
  it("holds still under reduced motion, Calm, Off, data saver and a low-end device", () => {
    stub(true, {});
    expect(objectsMayMove()).toBe(false);
    const quiet: Record<string, string>[] = [{ motion: "calm" }, { motion: "off" }, { saveData: "on" }, { motionLite: "on" }];
    for (const dataset of quiet) {
      stub(false, dataset);
      expect(objectsMayMove(), JSON.stringify(dataset)).toBe(false);
    }
  });
  it("holds still on the server", () => {
    expect(objectsMayMove()).toBe(false);
  });
});
