import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";
import { boardFor, boardShape, type BoardSubject } from "./board";

const copy = getDictionary("en").frontDoor.board;

function subject(overrides: Partial<BoardSubject> = {}): BoardSubject {
  return { reference: "VL-7K4MQP", intent: "rent", propertyType: "rental", bedrooms: 2, isDemo: false, ...overrides };
}

describe("the board carries a code, a shape and nothing else", () => {
  it("reads TO LET, 2 bed flat, on Vallo, the code", () => {
    const verdict = boardFor(subject(), copy);
    expect(verdict).toEqual({
      state: "ready",
      lines: { banner: "TO LET", shape: "2 bed flat", onVallo: "on Vallo", code: "VL-7K4MQP" },
    });
  });

  it("has no field that could carry a phone number, a price or an address", () => {
    const poisoned = {
      ...subject(),
      phone: "08031234567",
      address: "14 Admiralty Way",
      rentMinor: 150_000_000,
      agentName: "Tunde",
    } as unknown as BoardSubject;
    const text = JSON.stringify(boardFor(poisoned, copy));
    for (const leak of ["0803", "Admiralty", "150000000", "1.5m", "Tunde"]) expect(text).not.toContain(leak);
  });

  it("words the shapes a gate is painted with", () => {
    expect(boardShape(subject({ bedrooms: 0 }), copy)).toBe("Self contain");
    expect(boardShape(subject({ propertyType: "home", bedrooms: 4 }), copy)).toBe("4 bed house");
    expect(boardShape(subject({ propertyType: "shop", bedrooms: null }), copy)).toBe("Shop");
    expect(boardShape(subject({ propertyType: "land", bedrooms: null }), copy)).toBe("Land");
    expect(boardFor(subject({ intent: "sale" }), copy)).toMatchObject({ lines: { banner: "FOR SALE" } });
  });

  it("refuses an example listing, and a listing with no code yet", () => {
    expect(boardFor(subject({ isDemo: true }), copy)).toEqual({ state: "example" });
    expect(boardFor(subject({ reference: null }), copy)).toEqual({ state: "no-code" });
    expect(boardFor(subject({ reference: "VL-100000" }), copy)).toEqual({ state: "no-code" });
  });
});
