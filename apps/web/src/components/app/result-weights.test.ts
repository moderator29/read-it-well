import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * THE TYPE SYSTEM IS 400, 600 AND 700 (north star 5; craft doctrine 2: three
 * weights maximum). The shared result screen drew its headline and its figure at
 * 800 (`font-extrabold`), which no other screen uses. These files stay inside the
 * three: the result screen and sheet, the not-found page, and the system moment's
 * stylesheet that both the not-found page and the error boundary draw on.
 */
const SRC = join(__dirname, "..", "..");
const FILES = ["components/app/ResultSheet.tsx", "app/not-found.tsx", "app/offline/SystemMoment.tsx", "app/css/system.css"];

const strip = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, "");

describe("the result screen, the not-found page and the system moment", () => {
  for (const file of FILES) {
    it(`${file} uses no weight above 700`, () => {
      const text = strip(readFileSync(join(SRC, file), "utf8"));
      expect(text).not.toMatch(/font-extrabold|font-black/);
      expect(text).not.toMatch(/font-weight:\s*[89]00/);
      expect(text).not.toMatch(/font-\[[89]00\]/);
      expect(text).not.toMatch(/fontWeight:\s*[89]00/);
    });
  }
});
