import { describe, expect, it } from "vitest";

import { dataCapacity, dataCodewords, encodeQr, formatBits, qrPath, rsDivisor, rsRemainder, versionBits } from "./qr";

/**
 * The QR encoder against published vectors (ISO/IEC 18004 and the widely
 * reproduced "HELLO WORLD" 1-M worked example), plus the fixed patterns.
 */

describe("Reed-Solomon", () => {
  it("produces the published error correction for HELLO WORLD at 1-M", () => {
    const data = [32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17];
    expect(rsRemainder(data, rsDivisor(10))).toEqual([196, 35, 39, 119, 235, 215, 231, 226, 93, 23]);
  });
});

describe("format and version bits", () => {
  it("matches the published level M format strings for all eight masks", () => {
    const table = [
      "101010000010010",
      "101000100100101",
      "101111001111100",
      "101101101001011",
      "100010111111001",
      "100000011001110",
      "100111110010111",
      "100101010100000",
    ];
    table.forEach((bits, mask) => expect(formatBits(mask).toString(2).padStart(15, "0")).toBe(bits));
  });

  it("matches the published version 7 string", () => {
    expect(versionBits(7).toString(2).padStart(18, "0")).toBe("000111110010010100");
  });
});

describe("data codewords", () => {
  it("encodes one byte in byte mode with terminator and alternating padding", () => {
    const words = dataCodewords([0x41], 1);
    expect(words.slice(0, 5)).toEqual([0x40, 0x14, 0x10, 0xec, 0x11]);
    expect(words).toHaveLength(dataCapacity(1));
  });
});

describe("encodeQr", () => {
  const tron = "TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE";
  const btc = "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq";

  it("picks the smallest version that fits and draws the fixed patterns", () => {
    const qr = encodeQr(tron);
    expect(qr.version).toBe(3); // 34 bytes: v2-M holds 26, v3-M holds 42
    expect(qr.size).toBe(29);
    const m = qr.modules;
    // Finder corners dark, their inner ring light.
    for (const [x, y] of [[0, 0], [6, 0], [0, 6], [qr.size - 1, 0], [0, qr.size - 1]] as const) expect(m[y]![x]).toBe(true);
    expect(m[1]![1]).toBe(false);
    // Timing pattern alternates along row 6.
    for (let x = 8; x < qr.size - 8; x++) expect(m[6]![x]).toBe(x % 2 === 0);
    // The dark module.
    expect(m[qr.size - 8]![8]).toBe(true);
  });

  it("writes the chosen mask's format bits beside the top-left finder", () => {
    const qr = encodeQr(btc);
    const bits = formatBits(qr.mask);
    for (let i = 0; i <= 5; i++) expect(qr.modules[i]![8]).toBe(((bits >>> i) & 1) === 1);
  });

  it("is deterministic and draws a path", () => {
    expect(encodeQr(btc)).toEqual(encodeQr(btc));
    expect(qrPath(encodeQr(btc))).toMatch(/^M\d+ \d+h1v1h-1z/);
  });

  it("goes up to version 10 and refuses what will not fit", () => {
    expect(encodeQr("x".repeat(200)).version).toBe(10);
    expect(() => encodeQr("x".repeat(300))).toThrow();
  });
});
