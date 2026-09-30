import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FOCAL_READY, focalForPath, focalObject, focalSrc, type FocalName } from "./focal-art";

const PUBLIC = join(__dirname, "../../../public");
const ALL_ON = Object.fromEntries(Object.keys(FOCAL_READY).map((k) => [k, true])) as Record<FocalName, boolean>;
const ALL_OFF = Object.fromEntries(Object.keys(FOCAL_READY).map((k) => [k, false])) as Record<FocalName, boolean>;

describe("the object in the ring", () => {
  it.each(Object.keys(FOCAL_READY) as FocalName[])("%s is only switched on when its file exists", (name) => {
    if (!FOCAL_READY[name]) return;
    expect(existsSync(join(PUBLIC, focalSrc(name))), focalSrc(name)).toBe(true);
  });

  it("picks one object per door", () => {
    const name = (path: string) => {
      const art = focalForPath(path, ALL_ON);
      return art.kind === "object" ? art.name : "mark";
    };
    expect(name("/sign-in")).toBe("mark");
    expect(name("/sign-in/email")).toBe("envelope");
    expect(name("/sign-in/code")).toBe("envelope");
    expect(name("/sign-in/phone")).toBe("phone-code");
    expect(name("/sign-up")).toBe("rent");
    expect(name("/sign-up/email")).toBe("envelope");
    expect(name("/sign-up/verify")).toBe("envelope");
    expect(name("/sign-up/finish")).toBe("id-check");
    expect(name("/forgot-password")).toBe("envelope");
    expect(name("/forgot-password/code")).toBe("envelope");
    expect(name("/reset-password")).toBe("shield");
  });

  it("falls back to the Vallo mark while a file is not in", () => {
    expect(focalForPath("/sign-in/phone", ALL_OFF)).toEqual({ kind: "mark" });
    expect(focalObject("passcode-lock", ALL_OFF)).toEqual({ kind: "mark" });
  });
});
