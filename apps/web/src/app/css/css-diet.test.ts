import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/*
 * C12, the CSS diet (30 September 2026). `globals.css` is loaded by every
 * page, so what it imports is paid for on every phone. These checks keep the
 * retired wallet sheet out, keep every import pointing at a real file, and
 * keep the rules the icon and design passes left behind from coming back.
 */
const APP = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(APP, "..");
const globals = readFileSync(join(APP, "globals.css"), "utf8");
const imports = [...globals.matchAll(/@import\s+"(\.\/[^"]+)"/g)].map((m) => m[1] ?? "");

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name.startsWith(".")) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.css$/.test(e.name)) out.push(p);
  }
  return out;
}

describe("the global stylesheet (C12)", () => {
  it("no longer loads the retired wallet sheet", () => {
    expect(imports).not.toContain("./css/wallet.css");
    expect(existsSync(join(APP, "css", "wallet.css"))).toBe(false);
  });

  it("imports only files that exist", () => {
    for (const rel of imports) expect(existsSync(join(APP, rel)), rel).toBe(true);
  });

  it("keeps the admin console sheet out of the global bundle", () => {
    expect(imports).not.toContain("./css/admin.css");
  });

  it("carries none of the dead glass and tile rules", () => {
    const dead = [
      ".nf-door__mark--glass",
      ".nf-feature-glass",
      ".nf-step__glass",
      ".nf-amenity-tile__object",
      ".nf-insp-step__tile",
      ".nf-wallet-",
      ".nf-send-",
    ];
    const css = walk(SRC).map((p) => readFileSync(p, "utf8").replace(/\/\*[\s\S]*?\*\//g, ""));
    for (const sel of dead) {
      expect(css.some((c) => c.includes(sel)), sel).toBe(false);
    }
  });
});
