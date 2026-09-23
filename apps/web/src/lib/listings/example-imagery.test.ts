import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  EXAMPLE_PHOTOGRAPHS_PRESENT,
  EXAMPLE_SLOT_BRIEF,
  exampleSlotPath,
  exampleSlotsFor,
  honestExamplePhotos,
  isModestExample,
} from "./example-imagery";

type Shape = Parameters<typeof isModestExample>[0];
const ex = (over: Partial<Shape>): Shape => ({
  kind: "rental",
  bedrooms: 1,
  intent: "rent",
  pricePeriod: "year",
  isDemo: true,
  ...over,
});
const VILLA_RENDERS = ["/brand/photos/villa-exterior-gate.jpg", "/brand/photos/villa-pool-skyline-01.jpg"];

describe("honest example imagery", () => {
  it("a mini flat, a flat, a small house, a shop and an office are modest", () => {
    expect(isModestExample(ex({}))).toBe(true);
    expect(isModestExample(ex({ kind: "apartment", bedrooms: 3 }))).toBe(true);
    expect(isModestExample(ex({ kind: "home", bedrooms: 3 }))).toBe(true);
    expect(isModestExample(ex({ kind: "shop", bedrooms: 0 }))).toBe(true);
    expect(isModestExample(ex({ kind: "office", bedrooms: 0 }))).toBe(true);
  });

  it("a villa, a big house, a sale, a stay and a real listing keep what they have", () => {
    expect(isModestExample(ex({ kind: "villa", bedrooms: 5 }))).toBe(false);
    expect(isModestExample(ex({ kind: "home", bedrooms: 5 }))).toBe(false);
    expect(isModestExample(ex({ intent: "sale" }))).toBe(false);
    expect(isModestExample(ex({ kind: "shortlet", pricePeriod: "night" }))).toBe(false);
    expect(isModestExample(ex({ isDemo: false }))).toBe(false);
    expect(honestExamplePhotos(ex({ isDemo: false }), VILLA_RENDERS)).toEqual(VILLA_RENDERS);
  });

  it("a modest example never wears the villa renders, and wears nothing until its slot exists", () => {
    expect(honestExamplePhotos(ex({}), VILLA_RENDERS)).toEqual([]);
    expect(honestExamplePhotos(ex({}), VILLA_RENDERS, ["room-single"])).toEqual([
      exampleSlotPath("room-single"),
    ]);
  });

  it("a mini flat is a room first, and a shop is a shop front", () => {
    expect(exampleSlotsFor(ex({}))[0]).toBe("room-single");
    expect(exampleSlotsFor(ex({ kind: "shop", bedrooms: 0 }))).toEqual(["shop-front"]);
  });

  it("every slot has a brief, and every slot named present is on disk", () => {
    for (const brief of Object.values(EXAMPLE_SLOT_BRIEF)) expect(brief.length).toBeGreaterThan(20);
    for (const slot of EXAMPLE_PHOTOGRAPHS_PRESENT) {
      expect(existsSync(join(__dirname, "../../../public", exampleSlotPath(slot)))).toBe(true);
    }
  });
});
