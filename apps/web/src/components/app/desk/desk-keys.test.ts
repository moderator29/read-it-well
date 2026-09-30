import { describe, expect, it } from "vitest";
import { CONSOLE_JUMPS, deskKeyFor, stepRow } from "./desk-keys";

const base = { metaKey: false, ctrlKey: false, altKey: false, targetTag: "BODY", targetEditable: false, awaitingJump: false };

describe("the desks' key layer (C6)", () => {
  it("maps the shared keys", () => {
    expect(deskKeyFor({ ...base, key: "j" }, CONSOLE_JUMPS)).toEqual({ kind: "next" });
    expect(deskKeyFor({ ...base, key: "K" }, CONSOLE_JUMPS)).toEqual({ kind: "prev" });
    expect(deskKeyFor({ ...base, key: "a" }, CONSOLE_JUMPS)).toEqual({ kind: "approve" });
    expect(deskKeyFor({ ...base, key: "x" }, CONSOLE_JUMPS)).toEqual({ kind: "decline" });
    expect(deskKeyFor({ ...base, key: "?" }, CONSOLE_JUMPS)).toEqual({ kind: "help" });
    expect(deskKeyFor({ ...base, key: "g" }, CONSOLE_JUMPS)).toEqual({ kind: "go-prefix" });
    expect(deskKeyFor({ ...base, key: "l", awaitingJump: true }, CONSOLE_JUMPS)).toEqual({ kind: "jump", href: "/admin/listings" });
  });
  it("never fires while typing or with a modifier, except Escape", () => {
    expect(deskKeyFor({ ...base, key: "j", targetTag: "INPUT" }, CONSOLE_JUMPS)).toBeNull();
    expect(deskKeyFor({ ...base, key: "a", targetEditable: true }, CONSOLE_JUMPS)).toBeNull();
    expect(deskKeyFor({ ...base, key: "j", ctrlKey: true }, CONSOLE_JUMPS)).toBeNull();
    expect(deskKeyFor({ ...base, key: "Escape", targetTag: "INPUT" }, CONSOLE_JUMPS)).toEqual({ kind: "close" });
  });
  it("opens only from a focused row, never stealing a button's Enter", () => {
    expect(deskKeyFor({ ...base, key: "Enter", targetTag: "TR" }, CONSOLE_JUMPS)).toEqual({ kind: "open" });
    expect(deskKeyFor({ ...base, key: "Enter", targetTag: "BUTTON" }, CONSOLE_JUMPS)).toBeNull();
  });
  it("steps rows and stops at the ends", () => {
    expect(stepRow(3, -1, 1)).toBe(0);
    expect(stepRow(3, -1, -1)).toBe(2);
    expect(stepRow(3, 2, 1)).toBe(2);
    expect(stepRow(0, -1, 1)).toBe(-1);
  });
});
