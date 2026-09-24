import { describe, expect, it } from "vitest";
import { hexToBytes, hotp, matchesCode, normaliseCode, secondsLeft, stepAt, totp } from "./totp";

/* RFC 6238 appendix B: the SHA-1 seed is the ASCII "12345678901234567890". */
const RFC_SEED = new TextEncoder().encode("12345678901234567890");

describe("RFC 6238 test vectors (SHA-1, 8 digits)", () => {
  const vectors: [number, string][] = [
    [59, "94287082"],
    [1111111109, "07081804"],
    [1111111111, "14050471"],
    [1234567890, "89005924"],
    [2000000000, "69279037"],
    [20000000000, "65353130"],
  ];
  for (const [seconds, expected] of vectors) {
    it(`matches at T=${seconds}`, async () => {
      await expect(totp(RFC_SEED, seconds * 1000, 8)).resolves.toBe(expected);
    });
  }
});

describe("RFC 4226 HOTP vectors (6 digits)", () => {
  it("matches the first three counters", async () => {
    await expect(hotp(RFC_SEED, 0)).resolves.toBe("755224");
    await expect(hotp(RFC_SEED, 1)).resolves.toBe("287082");
    await expect(hotp(RFC_SEED, 2)).resolves.toBe("359152");
  });
});

describe("hexToBytes", () => {
  it("reads the database's hex seed", () => {
    expect(Array.from(hexToBytes("00ff10") ?? [])).toEqual([0, 255, 16]);
  });
  it("refuses odd lengths, non-hex and empty", () => {
    expect(hexToBytes("abc")).toBeNull();
    expect(hexToBytes("zz")).toBeNull();
    expect(hexToBytes("")).toBeNull();
  });
});

describe("the gate check", () => {
  const now = 1_790_000_015_000;

  it("accepts the current code", async () => {
    const code = await totp(RFC_SEED, now);
    await expect(matchesCode(RFC_SEED, code, now)).resolves.toBe(true);
  });

  it("accepts one step of drift either way and nothing beyond", async () => {
    const before = await totp(RFC_SEED, now - 30_000);
    const after = await totp(RFC_SEED, now + 30_000);
    const stale = await totp(RFC_SEED, now - 90_000);
    await expect(matchesCode(RFC_SEED, before, now)).resolves.toBe(true);
    await expect(matchesCode(RFC_SEED, after, now)).resolves.toBe(true);
    await expect(matchesCode(RFC_SEED, stale, now)).resolves.toBe(false);
  });

  it("refuses a code from another seed", async () => {
    const other = hexToBytes("0102030405060708090a0b0c0d0e0f1011121314")!;
    const code = await totp(other, now);
    const same = await totp(RFC_SEED, now);
    if (code !== same) await expect(matchesCode(RFC_SEED, code, now)).resolves.toBe(false);
  });

  it("reads what a person types, spaces and all, and refuses anything else", async () => {
    expect(normaliseCode("123 456")).toBe("123456");
    expect(normaliseCode("12345")).toBeNull();
    expect(normaliseCode("12345a")).toBeNull();
    await expect(matchesCode(RFC_SEED, "not a code", now)).resolves.toBe(false);
  });

  it("counts steps and the seconds left in one", () => {
    expect(stepAt(59_000)).toBe(1);
    expect(secondsLeft(0)).toBe(30);
    expect(secondsLeft(29_000)).toBe(1);
  });
});
