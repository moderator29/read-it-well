/**
 * THE FALLBACK FACES, READ AS RULES (W2, round 5). The computed proof is
 * `fonts-fallback.dom.test.tsx`; this holds the parts a browser on any machine
 * cannot see: that a phone without Arial has a face of its own, that the
 * numbers are the formula's and not a hand edit, that the Poppins fallbacks
 * never catch the naira sign, and that the money routes send its face early.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import postcss, { type AtRule, type Declaration } from "postcss";
import { describe, expect, it } from "vitest";

const SRC = join(__dirname, "..", "..");
const read = (path: string) => readFileSync(join(SRC, path), "utf8");
const css = read("app/css/fonts.css");

type Face = { family: string; weight: string; src: string; range: string; o: Record<string, number> };
const faces: Face[] = [];
postcss.parse(css).walkAtRules("font-face", (rule: AtRule) => {
  const get = (p: string) => ((rule.nodes ?? []).find((n) => n.type === "decl" && (n as Declaration).prop === p) as Declaration | undefined)?.value ?? "";
  const pct = (p: string) => parseFloat(get(p));
  faces.push({
    family: get("font-family").replace(/"/g, ""),
    weight: get("font-weight"),
    src: get("src"),
    range: get("unicode-range").replace(/\s+/g, " "),
    o: { size: pct("size-adjust"), ascent: pct("ascent-override"), descent: pct("descent-override"), gap: pct("line-gap-override") },
  });
});
const fallback = (family: string, weight = "", digits = false) =>
  faces.find((f) => f.family === family && f.weight === weight && (f.range === "U+30-39") === digits)!;

/* The metrics fonts.css documents, read from the shipped files with fontTools (W2, round 5). */
const FACE = {
  inter400: { em: 2048, avg: 978, digit: 1328, a: 1984, d: 494, g: 0 },
  inter600: { em: 2048, avg: 998, digit: 1325, a: 1984, d: 494, g: 0 },
  poppins600: { em: 1000, avg: 510, digit: 627.6, a: 1050, d: 350, g: 100 },
};
const BASE = {
  arial: { em: 2048, avg: 913, digit: 1139 },
  arialBold: { em: 2048, avg: 983, digit: 1139 },
  roboto: { em: 2048, avg: 911, digit: 1151 },
  robotoBold: { em: 2048, avg: 926, digit: 1175 },
};
const expected = (face: (typeof FACE)[keyof typeof FACE], base: (typeof BASE)[keyof typeof BASE], by: "avg" | "digit") => {
  const size = face[by] / face.em / (base[by] / base.em);
  return { size: size * 100, ascent: (face.a / face.em / size) * 100, descent: (face.d / face.em / size) * 100, gap: (face.g / face.em / size) * 100 };
};

describe("the fallback faces", () => {
  it("give a phone without Arial a Roboto face, regular and bold, in both stacks", () => {
    for (const family of ["Inter Fallback Roboto", "Poppins Fallback Roboto"]) {
      expect(faces.some((f) => f.family === family && /local\(Roboto\)/.test(f.src)), family).toBe(true);
    }
    expect(fallback("Inter Fallback Roboto", "600 900").src).toMatch(/local\("Roboto Bold"\), local\(Roboto-Bold\), local\(Roboto\)/);
    expect(fallback("Inter Fallback").src).toMatch(/local\(Arial\).*local\("Liberation Sans"\).*local\(Arimo\)/);
    expect(css).toContain('--nf-font-inter: "Inter", "Inter Fallback", "Inter Fallback Roboto";');
    expect(css).toContain('--nf-font-poppins: "Poppins", "Poppins Fallback", "Poppins Fallback Roboto";');
  });

  it("carry the numbers the formula gives from the files, not hand-tuned ones", () => {
    const cases: [Face, ReturnType<typeof expected>][] = [
      [fallback("Inter Fallback"), expected(FACE.inter400, BASE.arial, "avg")],
      [fallback("Inter Fallback", "600 900"), expected(FACE.inter600, BASE.arialBold, "avg")],
      [fallback("Inter Fallback Roboto"), expected(FACE.inter400, BASE.roboto, "avg")],
      [fallback("Inter Fallback Roboto", "600 900"), expected(FACE.inter600, BASE.robotoBold, "avg")],
      [fallback("Poppins Fallback", "100 900"), expected(FACE.poppins600, BASE.arialBold, "avg")],
      [fallback("Poppins Fallback Roboto", "100 900"), expected(FACE.poppins600, BASE.robotoBold, "avg")],
      [fallback("Inter Fallback", "", true), expected(FACE.inter400, BASE.arial, "digit")],
      [fallback("Inter Fallback Roboto", "600 900", true), expected(FACE.inter600, BASE.robotoBold, "digit")],
      [fallback("Poppins Fallback", "100 900", true), expected(FACE.poppins600, BASE.arialBold, "digit")],
      [fallback("Poppins Fallback Roboto", "100 900", true), expected(FACE.poppins600, BASE.robotoBold, "digit")],
    ];
    for (const [face, want] of cases) {
      for (const k of ["size", "ascent", "descent", "gap"] as const) {
        expect(Math.abs(face.o[k]! - want[k]), `${face.family} ${face.weight} ${face.range} ${k}`).toBeLessThanOrEqual(0.006);
      }
    }
    /* Inter on Arial is next/font's own result, unchanged. */
    expect(fallback("Inter Fallback").o).toEqual({ size: 107.12, ascent: 90.44, descent: 22.52, gap: 0 });
  });

  it("let the Poppins fallbacks stand in only for what Poppins draws: the naira sign and the Hausa letters go to Inter", () => {
    const inRange = (range: string, cp: number) =>
      range.split(",").some((part) => {
        const [a, b] = part.trim().replace("U+", "").split("-").map((h) => parseInt(h, 16));
        return cp >= a! && cp <= (b ?? a!);
      });
    for (const face of faces.filter((f) => f.family.startsWith("Poppins Fallback"))) {
      expect(face.range, face.family).not.toBe("");
      for (const cp of [0x20a6, 0x253, 0x257, 0x199, 0x1b4, 0x1eb9, 0x1ecd]) {
        expect(inRange(face.range, cp), `${face.family} U+${cp.toString(16)}`).toBe(false);
      }
      expect(inRange(face.range, 0x41) || face.range === "U+30-39", face.family).toBe(true);
    }
  });

  it("sends the naira face with the page on the money routes", () => {
    const head = read("components/app/NairaFacePreload.tsx");
    expect(head).toMatch(/<link rel="preload" as="font" type="font\/woff2" href=\{NAIRA_FACE\} crossOrigin="anonymous" \/>/);
    expect(head).toContain('"/fonts/v2/inter-naira.woff2"');
    for (const route of [
      "app/(app)/pay/crypto/[reference]/layout.tsx",
      "app/(app)/rent/pay/[inspectionId]/layout.tsx",
      "app/(app)/payouts/loading.tsx",
      "app/(app)/receipts/loading.tsx",
      "app/(app)/refunds/loading.tsx",
      "app/(app)/payments/loading.tsx",
    ]) {
      expect(read(route), route).toMatch(/<NairaFacePreload \/>|<MoneyWait /);
    }
    /* The money waits send it from the one shell they share. */
    expect(read("components/app/money-history/MoneyWait.tsx")).toContain("<NairaFacePreload />");
  });
});
