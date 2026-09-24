import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { chooseBack, parentOf } from "@/lib/nav/resolve";

/**
 * `/profile/setup` in its four states declares a parent in
 * `route-parents.ts` and drew no back control, so Android back closed the app.
 * Each page now mounts the shared `BackButton` with the declared parent.
 */
const SETUP = join(process.cwd(), "src/app/(app)/profile/setup");

const PAGES: [string, string, string][] = [
  ["/profile/setup", "page.tsx", "/profile"],
  ["/profile/setup/agent", "agent/page.tsx", "/profile/setup"],
  ["/profile/setup/firm", "firm/page.tsx", "/profile/setup"],
  ["/profile/setup/owner", "owner/page.tsx", "/profile/setup"],
];

describe("profile setup: a back control to the declared parent", () => {
  for (const [route, file, parent] of PAGES) {
    it(`${route} resolves to ${parent}`, () => {
      const target = parentOf(route);
      expect(target.kind).toBe("parent");
      expect(target.kind === "parent" ? target.href : null).toBe(parent);
    });

    it(`${route} mounts the BackButton with that parent`, () => {
      const source = readFileSync(join(SETUP, file), "utf8");
      expect(source).toMatch(/import \{ BackButton \} from "@\/components\/site\/BackButton"/);
      expect(source).toContain(`parentOf("${route}")`);
      expect(source).toMatch(/<BackButton fallback=\{BACK\.kind === "parent" \? BACK\.href : "\/profile"\} \/>/);
    });
  }

  it("on Android with no in-app history, back goes to the parent and never exits", () => {
    for (const [route, , parent] of PAGES) {
      const decision = chooseBack({
        path: route,
        fallback: "/home",
        previousPath: null,
        previousIsInApp: false,
        surface: "android",
      });
      expect(decision.action).not.toBe("exit");
      expect("href" in decision ? decision.href : null).toBe(parent);
    }
  });
});
