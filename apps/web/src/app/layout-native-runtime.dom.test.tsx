import { describe, expect, it, vi } from "vitest";

/**
 * THE ROOT LAYOUT ACTUALLY MOUNTS WHAT IT CLAIMS TO MOUNT.
 *
 * On 3 October 2026 the native app hung on the splash screen for every tester
 * on every device, and the cause was one absent line of JSX. `lib/native/boot.ts`
 * said "`NativeRuntime` in `components/app/` mounts this once from the root
 * layout"; no `<NativeRuntime />` existed anywhere in the tree, so
 * `startNativeRuntime()` had no caller, so nothing ever hid the splash. Three
 * gates were blind to it at once. Typecheck erases JSX usage, so an imported
 * and never rendered component types fine. Lint does not look for a component
 * being used. And not one of the 8791 tests asserted the shape of the root
 * layout, so commit 742ce23's one-line fix landed with no regression test and
 * deleting that line again turned nothing red.
 *
 * WHY THIS ASSERTS THE ELEMENT TREE RATHER THAN THE SOURCE TEXT. Several specs
 * in this repository do read a file and match its contents (the native ones in
 * `lib/native/*.test.ts`, `tests/dead-ends-and-doors.spec.mjs`), and that is a
 * legitimate way to gate a fact no other instrument can see. It is the weaker
 * instrument here, because a regex over `layout.tsx` passes on text that is
 * inside a comment, inside a dead branch, or after a `return` the component
 * never reaches, and the bug being gated is exactly "the text was there and the
 * element was not". So this calls `RootLayout` and walks the React element tree
 * it returns, asserting the MODULE IDENTITY of the component, which no rename,
 * re-export or comment can satisfy.
 *
 * It is not a render, and that is the point: `RootLayout` is an async server
 * component, so calling it just builds plain element objects. No child
 * component function is invoked, no hook runs, nothing touches a DOM. The only
 * dependency that has to be answered is `next/headers`, stubbed below with the
 * two readers the layout asks for. That is why this is cheap and why it is not
 * brittle: it fails when the tree changes and for no other reason.
 *
 * It lives in the `dom` project rather than the `unit` one only because the
 * unit project aliases `react` at its `react-server` entry file, which breaks
 * the `react/jsx-dev-runtime` subpath the JSX in `layout.tsx` compiles to.
 * Nothing here needs a browser.
 */

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, getAll: () => [] }),
  headers: async () => new Headers(),
}));

/** Every component element in the tree, by its own function identity. */
async function layoutComponents(children: React.ReactNode = null): Promise<unknown[]> {
  const { default: RootLayout } = await import("./layout");
  const tree = await RootLayout({ children });
  const types: unknown[] = [];
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const child of node) walk(child);
      return;
    }
    if (!node || typeof node !== "object") return;
    const element = node as { type?: unknown; props?: { children?: unknown } };
    if (element.type !== undefined) types.push(element.type);
    if (element.props && "children" in element.props) walk(element.props.children);
  };
  walk(tree);
  return types;
}

describe("the root layout mounts the application-wide runtimes", () => {
  it("renders <NativeRuntime />, which is the only caller of startNativeRuntime", async () => {
    const { NativeRuntime } = await import("@/components/app/NativeRuntime");
    const types = await layoutComponents();
    /* If this fails, the native shell shows its splash and never takes it
       down: nothing else in the application calls `startNativeRuntime`. */
    expect(types).toContain(NativeRuntime);
  });

  /* The same blind spot, same shape, same consequence of being wrong: a
     capability with no UI, mounted once from here, whose absence is silent. */
  it("renders <ServiceWorkerRegistrar />, so the offline shell is installed", async () => {
    const { ServiceWorkerRegistrar } = await import("@/components/app/ServiceWorkerRegistrar");
    const types = await layoutComponents();
    expect(types).toContain(ServiceWorkerRegistrar);
  });

  it("mounts each of them exactly once, because starting a runtime twice is a leak", async () => {
    const { NativeRuntime } = await import("@/components/app/NativeRuntime");
    const types = await layoutComponents();
    expect(types.filter((type) => type === NativeRuntime)).toHaveLength(1);
  });

  /* The walk above is only worth its assertions if it actually descends. A
     component handed in as the page's children is nested several elements deep,
     inside the copy provider, so finding it proves the whole tree was visited
     and not just the body's first few nodes. */
  it("is walked to its depth, proven by a sentinel passed in as the page", async () => {
    const Sentinel = (): null => null;
    const types = await layoutComponents(<Sentinel />);
    expect(types).toContain(Sentinel);
  });
});
