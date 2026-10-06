import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * `.nf-balance-pulse` is deleted (Session 3, C1): it had no consumer, used a
 * raw 1.1s instead of a duration token, and washed a gradient across a balance,
 * which is a money figure. A balance changes through the Odometer, and only
 * after the server confirms it (MOTION_SYSTEM "Balance change"). This keeps it
 * from coming back in a stylesheet or a component.
 */
const SRC = join(process.cwd(), "src");
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.(css|ts|tsx)$/.test(name) && !name.endsWith("balance-pulse-gone.test.ts") ? [path] : [];
  });
}

describe("the wallet balance pulse", () => {
  it("is in no stylesheet and no component", () => {
    const offenders = files(SRC).filter((file) => /balance-pulse|data-pulse/.test(readFileSync(file, "utf8")));
    expect(offenders.map((file) => file.slice(SRC.length + 1))).toEqual([]);
  });
});
