import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * THE PAGE-WEIGHT LINE FOR CALLS: `livekit-client` (about 180 KB gzipped)
 * must never reach a page that has no call on it.
 *
 *   1. Exactly one browser module imports the SDK: `components/calls/media/session.ts`.
 *   2. Nothing imports that module statically; it is reached only by `import()`.
 *   3. The stage that imports it is itself only reached by `import()` / `lazy`.
 *   4. The shell's mount, the thread's buttons, the history rows and the
 *      incoming screen import neither.
 *
 * Server code (the provider adapter in `lib/calls/provider`) does not import
 * the SDK at all; it speaks LiveKit's wire formats itself.
 */
const SRC = join(__dirname, "..", "..");

function files(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...files(p));
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

const all = files(SRC).map((p) => ({ path: relative(SRC, p), text: readFileSync(p, "utf8") }));
const STATIC_IMPORT = (spec: RegExp) => new RegExp(`^\\s*import\\s+(?!type\\b)[^;]*?from\\s+["']${spec.source}["']`, "m");

describe("livekit-client stays behind the call's own lazy chunk", () => {
  it("is imported by one browser module only", () => {
    const importers = all.filter((f) => /from\s+["']livekit-client["']|import\(\s*["']livekit-client["']\s*\)/.test(f.text)).map((f) => f.path);
    expect(importers).toEqual(["components/calls/media/session.ts"]);
  });

  it("the session module is only ever reached through import()", () => {
    const statics = all.filter((f) => STATIC_IMPORT(/(?:\.\/|@\/components\/calls\/)media\/session/).test(f.text)).map((f) => f.path);
    expect(statics).toEqual([]);
    const dynamics = all.filter((f) => /import\(\s*["']\.\/media\/session["']\s*\)/.test(f.text)).map((f) => f.path);
    expect(dynamics).toEqual(["components/calls/CallStage.tsx"]);
  });

  it("the stage is only ever reached through import()", () => {
    const statics = all.filter((f) => STATIC_IMPORT(/(?:\.\/|@\/components\/calls\/)CallStage/).test(f.text)).map((f) => f.path);
    expect(statics).toEqual([]);
  });

  it("the light modules the shell and the thread load import neither", () => {
    for (const name of ["CallLayer.tsx", "CallLayerMount.tsx", "CallSurface.tsx", "CallButtons.tsx", "CallHistoryRow.tsx", "views.tsx", "call-store.ts", "place-call.ts", "ring.ts", "use-call-pulse.ts"]) {
      const text = readFileSync(join(SRC, "components/calls", name), "utf8");
      expect(STATIC_IMPORT(/livekit-client/).test(text), name).toBe(false);
      expect(STATIC_IMPORT(/\.\/media\/session/).test(text), name).toBe(false);
      expect(STATIC_IMPORT(/\.\/CallStage/).test(text), name).toBe(false);
    }
  });

  it("the shell's realtime listener loads supabase-js when it opens a channel, never in the first load", () => {
    /* Speed pass, 8 October 2026: a static import here put about 66 KB of
       gzipped supabase-js in the first load of every in-app route. */
    const text = readFileSync(join(SRC, "lib/calls/useCallRealtime.ts"), "utf8");
    expect(STATIC_IMPORT(/(?:\.\.\/supabase\/client|@\/lib\/supabase\/client)/).test(text)).toBe(false);
    expect(text).toMatch(/loadBrowserClient\(\)/);
  });

  it("the shells mount the layer through the flag-checking server component", () => {
    for (const layout of ["app/(app)/layout.tsx", "app/agent/layout.tsx", "app/admin/layout.tsx"]) {
      const text = readFileSync(join(SRC, layout), "utf8");
      expect(text, layout).toMatch(/<CallLayerMount \/>/);
      expect(text, layout).not.toMatch(/from\s+["']@\/components\/calls\/CallLayer["']/);
    }
    const mount = readFileSync(join(SRC, "components/calls/CallLayerMount.tsx"), "utf8");
    expect(mount).toMatch(/videoCallsOn\(\)/);
    expect(mount).toMatch(/if \(!on \|\| session\.state !== "signed-in"\) return null;/);
  });
});
