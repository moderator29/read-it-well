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

  /*
   * C12, second pass: the route-only sheets load from the layouts (and the
   * few components) that draw them. Each entry names every file that must
   * import the sheet, so losing an import fails here instead of quietly
   * unstyling a route. Where two sheets share an entry, the order is the old
   * cascade order and is checked too.
   */
  const ROUTE_SHEETS: Record<string, string[]> = {
    "landing.css": ["(landing)/layout.tsx", "(site)/layout.tsx"],
    "landing-rooms.css": ["(landing)/layout.tsx", "(site)/layout.tsx"],
    "public-doors.css": [
      "(landing)/layout.tsx",
      "(site)/layout.tsx",
      "join/[code]/layout.tsx",
      "email/preferences/layout.tsx",
      "(app)/settings/invite/InviteShare.tsx",
    ],
    "agent.css": [
      "agent/layout.tsx",
      "host/layout.tsx",
      "../components/agent/ApplyWizard.tsx",
      "../components/app/desk/RangeSelect.tsx",
    ],
    "stays.css": ["host/layout.tsx", "../components/app/stays/StayCategoryTiles.tsx"],
    "map.css": ["../components/app/search/MapCanvas.tsx"],
    "feed-m.css": ["(app)/layout.tsx"],
  };
  const importsOf = (file: string) =>
    [...readFileSync(join(APP, file), "utf8").matchAll(/import\s+"@\/app\/css\/([\w.-]+\.css)"/g)].map((m) => m[1]);

  it("keeps the route-only sheets out of the global bundle", () => {
    for (const sheet of Object.keys(ROUTE_SHEETS)) expect(imports, sheet).not.toContain(`./css/${sheet}`);
  });

  it("loads each route-only sheet from every entry that draws it", () => {
    for (const [sheet, entries] of Object.entries(ROUTE_SHEETS)) {
      for (const entry of entries) expect(importsOf(entry), `${entry} imports ${sheet}`).toContain(sheet);
    }
  });

  it("keeps the old cascade order where one entry loads several", () => {
    const inOrder = (file: string, order: string[]) => {
      const got = importsOf(file).filter((s) => s !== undefined && order.includes(s));
      expect(got, file).toEqual(order);
    };
    inOrder("(landing)/layout.tsx", ["landing.css", "landing-rooms.css", "public-doors.css"]);
    inOrder("(site)/layout.tsx", ["landing.css", "landing-rooms.css", "public-doors.css"]);
    inOrder("host/layout.tsx", ["agent.css", "stays.css"]);
  });

  it("keeps the sheets that many routes draw in the global bundle", () => {
    /* The lock overlays every signed-in tree, a success moment can open on
       any screen, and social-feed.css carries the round back control. */
    for (const sheet of ["./css/passcode.css", "./css/success.css", "./social-feed.css"]) {
      expect(imports, sheet).toContain(sheet);
    }
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
