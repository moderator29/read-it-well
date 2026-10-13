import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CHROME_COLOUR, CHROME_COLOUR_LIGHT } from "./chrome";
import { isNightDoorPath } from "./night-door";
import { applyTheme, openNightDoor } from "./theme-client";

/**
 * A night door (the founder, 30 September 2026) paints the document dark
 * while it is on screen and gives the member's Light back when it goes,
 * chrome included. A stand-in document, since the unit project has no DOM.
 */
let dataset: Record<string, string>;
let colour: string | null;
let events: string[];

beforeEach(() => {
  dataset = { theme: "light", themeChoice: "light" };
  colour = CHROME_COLOUR_LIGHT;
  events = [];
  vi.stubGlobal("document", {
    documentElement: { dataset },
    querySelector: () => ({ setAttribute: (_: string, value: string) => (colour = value) }),
  });
  vi.stubGlobal("window", {
    matchMedia: () => ({ matches: false }),
    dispatchEvent: (event: { type: string }) => events.push(event.type),
  });
  vi.stubGlobal("CustomEvent", class {
    type: string;
    constructor(type: string) {
      this.type = type;
    }
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("isNightDoorPath", () => {
  it("names the sign-up flow, and nothing else (Get started follows the theme since 7 October)", () => {
    for (const path of ["/sign-up", "/sign-up/verify", "/sign-up/email", "/sign-up/finish"]) {
      expect(isNightDoorPath(path)).toBe(true);
    }
    for (const path of ["/", "/welcome", "/sign-in", "/sign-in/code", "/forgot-password", "/reset-password", "/settings/passcode", "/welcomes", null, undefined]) {
      expect(isNightDoorPath(path)).toBe(false);
    }
  });
});

describe("openNightDoor", () => {
  it("paints dark over Light, keeps the choice, and gives Light back", () => {
    const close = openNightDoor();
    expect(dataset).toMatchObject({ theme: "dark", themeChoice: "light", door: "night" });
    expect(colour).toBe(CHROME_COLOUR);
    expect(events).toContain("nf-theme");
    close();
    expect(dataset.door).toBeUndefined();
    expect(dataset.theme).toBe("light");
    expect(colour).toBe(CHROME_COLOUR_LIGHT);
  });

  it("a theme change while a door is open is recorded, not painted", () => {
    const close = openNightDoor();
    applyTheme("light");
    expect(dataset.theme).toBe("dark");
    close();
    expect(dataset.theme).toBe("light");
  });

  it("stays night until the last of two overlapping doors closes", () => {
    const a = openNightDoor();
    const b = openNightDoor();
    a();
    a();
    expect(dataset.theme).toBe("dark");
    b();
    expect(dataset.theme).toBe("light");
  });
});
