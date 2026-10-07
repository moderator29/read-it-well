import { describe, expect, it } from "vitest";
import { isTieredObject } from "@/design-system/icons/object-assets";
import { focalForPath, focalObject, type FocalName } from "./focal-art";
import { GROUNDS, groundForPath } from "./ground";
import { existsSync } from "node:fs";
import { join } from "node:path";

const PUBLIC = join(__dirname, "../../../public");

describe("the object across the island", () => {
  it("is always an accepted two-tier object", () => {
    const names: FocalName[] = [
      "key-cushion",
      "scene-house-keys",
      "envelope",
      "chat-pair",
      "padlock",
      "passport-book",
      "shield-tick",
    ];
    for (const name of names) {
      expect(isTieredObject(name), name).toBe(true);
      expect(focalObject(name).size).toBeGreaterThanOrEqual(88);
    }
  });

  it("picks one object per door", () => {
    const name = (path: string) => focalForPath(path).name;
    expect(name("/sign-in")).toBe("key-cushion");
    expect(name("/sign-in/email")).toBe("envelope");
    expect(name("/sign-in/code")).toBe("envelope");
    expect(name("/sign-in/phone")).toBe("chat-pair");
    expect(name("/sign-up")).toBe("scene-house-keys");
    expect(name("/sign-up/email")).toBe("envelope");
    expect(name("/sign-up/verify")).toBe("envelope");
    expect(name("/sign-up/finish")).toBe("passport-book");
    expect(name("/forgot-password")).toBe("envelope");
    expect(name("/forgot-password/code")).toBe("envelope");
    expect(name("/reset-password")).toBe("padlock");
  });
});

describe("the ground under an auth screen", () => {
  it("every ground is a file that exists", () => {
    for (const ground of Object.values(GROUNDS)) {
      expect(existsSync(join(PUBLIC, ground.src)), ground.src).toBe(true);
    }
  });

  it("gives each door the ground it was chosen for", () => {
    const name = (path: string) => groundForPath(path).name;
    expect(name("/sign-in")).toBe("tower");
    expect(name("/sign-in/email")).toBe("tower");
    expect(name("/sign-up")).toBe("villa");
    expect(name("/sign-up/email")).toBe("villa");
    expect(name("/sign-up/finish")).toBe("villa");
    expect(name("/sign-up/verify")).toBe("water");
    expect(name("/sign-in/code")).toBe("water");
    expect(name("/sign-in/phone")).toBe("water");
    expect(name("/forgot-password")).toBe("wave");
    expect(name("/forgot-password/code")).toBe("water");
    expect(name("/reset-password")).toBe("wave");
  });

  it("a recovery never stands on a photograph of somebody's house", () => {
    expect(GROUNDS.wave.src).toContain("bg-blue-wave");
  });
});
