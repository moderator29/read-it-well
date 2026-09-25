import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { ITERATION_QUIET_SCRIPT } from "./iteration-quiet";

const SRC = join(__dirname, "..", "..");

function sources(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) sources(path, out);
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name))
      out.push(path);
  }
  return out;
}

describe("the animation-lap listener is refused everywhere", () => {
  function run() {
    const added: string[] = [];
    const proto = {
      addEventListener: vi.fn((type: string, ..._rest: unknown[]) => {
        added.push(type);
      }),
    };
    new Function("EventTarget", ITERATION_QUIET_SCRIPT)({ prototype: proto });
    return { target: proto, added };
  }

  it("drops animationiteration, bubbling or capturing", () => {
    const { target, added } = run();
    target.addEventListener("animationiteration", () => {}, false);
    target.addEventListener("animationiteration", () => {}, true);
    expect(added).toEqual([]);
  });

  it("passes every other event type through untouched, arguments and all", () => {
    const { target, added } = run();
    const listener = () => {};
    target.addEventListener("click", listener, { passive: true });
    target.addEventListener("animationend", listener);
    target.addEventListener("animationstart", listener);
    expect(added).toEqual(["click", "animationend", "animationstart"]);
  });

  it("never throws, even where there is nothing to patch", () => {
    expect(() =>
      new Function("EventTarget", ITERATION_QUIET_SCRIPT)(undefined)
    ).not.toThrow();
    expect(() =>
      new Function("EventTarget", ITERATION_QUIET_SCRIPT)({
        prototype: Object.freeze({}),
      })
    ).not.toThrow();
  });

  it("holds only while nothing in the app handles the event", () => {
    const users = sources(SRC).filter((file) =>
      /onAnimationIteration|["'`]animationiteration["'`]/.test(
        readFileSync(file, "utf8")
      )
    );
    expect(users.map((file) => file.slice(SRC.length + 1))).toEqual([
      "lib/motion/iteration-quiet.ts",
    ]);
  });
});
