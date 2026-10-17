import { describe, expect, it } from "vitest";
import { pathInOwnFolder } from "./own-folder";

const me = "11111111-1111-4111-8111-111111111111";

describe("a storage path in the caller's own folder", () => {
  it("accepts a file in the folder or below it", () => {
    expect(pathInOwnFolder(me, `${me}/avatar.webp`)).toBe(true);
    expect(pathInOwnFolder(me, `${me}/docs/id-front.pdf`)).toBe(true);
  });

  it("refuses a path that walks out, or is not in the folder at all", () => {
    for (const forged of [
      `${me}/../22222222-2222-4222-8222-222222222222/id.pdf`,
      `${me}/./x.png`,
      `${me}//x.png`,
      `${me}/a\\..\\b.png`,
      `${me}/x\u0000.png`,
      `${me}`,
      `${me}/`,
      `${me}x/evil.png`,
      `other/${me}/x.png`,
      "",
    ]) {
      expect(pathInOwnFolder(me, forged), JSON.stringify(forged)).toBe(false);
    }
    expect(pathInOwnFolder(me, `${me}/${"a".repeat(400)}`)).toBe(false);
    expect(pathInOwnFolder("", "/x.png")).toBe(false);
  });
});
