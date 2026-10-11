import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * THE THREE OTHER HALVES OF THE 3 OCTOBER SPLASH HANG.
 *
 * `<NativeRuntime />` missing from the root layout was the whole of the
 * reported bug and is gated by `app/layout-native-runtime.dom.test.tsx`. Three
 * further defences were written the same day against the same symptom, a phone
 * left looking at a branded image with no way past it, and none of them had a
 * test either. Each is a timer, so each is cheap to prove and expensive to lose:
 * a number quietly edited to zero, or a failsafe moved behind the await it
 * exists to survive, reads as a tidy-up in review and strands a tester.
 *
 *   1. `boot.ts` arms `hideSplashViaBridge` after BRIDGE_FAILSAFE_MS, through
 *      the bridge primitive the native runtime injects, so the splash comes
 *      down even when the dynamic import of `@capacitor/core` never settles and
 *      `startSplash()` is therefore never reached at all.
 *   2. `splash.ts` hides at once and arms its own FAILSAFE_MS timer the
 *      moment it runs, for a first hide the bridge never answers. (It used to
 *      wait for `load` and two frames, which on Android never come while the
 *      splash plugin is cancelling draws: October 2026, "up to 8 seconds".)
 *   3. `app/home-or-landing/route.ts` races `resolveSession()`, a live GoTrue
 *      round trip, against a deadline, because this route is the shell's cold
 *      start navigation: while it hangs, no document is delivered, so neither
 *      of the two timers above has been parsed, let alone armed.
 *
 * The timings are asserted as the ordering they have to keep, not just as
 * literals: the bridge failsafe must be the LAST one to fire, so an ordinary
 * launch is never taken down by the escape hatch meant for a broken one, and
 * both are short (2 and 2.5 seconds), because the first hide is now made by
 * the startup's inline script on the document's first parse and these are
 * only ever backups.
 */

type TimerWindow = {
  setTimeout: typeof setTimeout;
  clearTimeout: typeof clearTimeout;
  requestAnimationFrame: (callback: () => void) => number;
  addEventListener: (type: string, listener: () => void, options?: unknown) => void;
  removeEventListener: (type: string, listener: () => void) => void;
  Capacitor?: unknown;
};

function installWindow(extra: Partial<TimerWindow> = {}): TimerWindow {
  const win = {
    setTimeout: ((fn: () => void, ms?: number) => setTimeout(fn, ms)) as unknown as typeof setTimeout,
    clearTimeout: ((id: unknown) => clearTimeout(id as Parameters<typeof clearTimeout>[0])) as typeof clearTimeout,
    /* A frame is a macrotask here, which is all the ordering under test needs. */
    requestAnimationFrame: (callback: () => void) => Number(setTimeout(callback, 16)),
    addEventListener: () => {},
    removeEventListener: () => {},
    ...extra,
  } satisfies TimerWindow;
  vi.stubGlobal("window", win);
  return win;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.resetModules();
  vi.doUnmock("@capacitor/splash-screen");
});

describe("the bridge failsafe in boot.ts, for the chunk that never arrives", () => {
  it("hides the splash through the injected bridge, 2.5 seconds after the runtime starts", async () => {
    vi.useFakeTimers();
    const nativePromise = vi.fn().mockResolvedValue(undefined);
    installWindow({
      Capacitor: { isNativePlatform: () => true, getPlatform: () => "android", nativePromise },
    });
    /* The native chunk is the thing being simulated as never arriving, so the
       second (authoritative) gate must answer no and stop the async half. */
    vi.doMock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => false } }));
    const { startNativeRuntime, BRIDGE_FAILSAFE_MS } = await import("./boot");
    expect(BRIDGE_FAILSAFE_MS).toBe(2_500);

    const stop = startNativeRuntime({ goBack: () => {} });
    await vi.advanceTimersByTimeAsync(2_499);
    expect(nativePromise).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(nativePromise).toHaveBeenCalledWith("SplashScreen", "hide", { fadeOutDuration: 200 });

    stop();
    vi.doUnmock("@capacitor/core");
  });

  it("is armed before the first await, so a hanging import cannot stop it being set", async () => {
    vi.useFakeTimers();
    const nativePromise = vi.fn();
    installWindow({
      Capacitor: { isNativePlatform: () => true, getPlatform: () => "android", nativePromise },
    });
    /* The import never settles: exactly the failure this timer is for. */
    vi.doMock("@capacitor/core", () => new Promise(() => {}));
    const { startNativeRuntime } = await import("./boot");

    const stop = startNativeRuntime({ goBack: () => {} });
    await vi.advanceTimersByTimeAsync(2_500);
    expect(nativePromise).toHaveBeenCalledTimes(1);

    stop();
    vi.doUnmock("@capacitor/core");
  });

  it("is cancelled by the teardown, so an unmount leaves no timer behind", async () => {
    vi.useFakeTimers();
    const nativePromise = vi.fn();
    installWindow({
      Capacitor: { isNativePlatform: () => true, getPlatform: () => "android", nativePromise },
    });
    vi.doMock("@capacitor/core", () => new Promise(() => {}));
    const { startNativeRuntime } = await import("./boot");

    startNativeRuntime({ goBack: () => {} })();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(nativePromise).not.toHaveBeenCalled();
    vi.doUnmock("@capacitor/core");
  });

  it("does nothing at all in a browser, where there is no bridge to read", async () => {
    installWindow();
    const { startNativeRuntime } = await import("./boot");
    const teardown = startNativeRuntime({ goBack: () => {} });
    expect(typeof teardown).toBe("function");
    /* No timer was armed, so nothing to advance and nothing to tear down. */
    expect(teardown()).toBeUndefined();
  });
});

describe("splash.ts: at once, with a failsafe for a hide the bridge never answers", () => {
  async function loadSplash(answer: "resolves" | "never" | "rejects" = "resolves") {
    const hide = vi.fn(() =>
      answer === "resolves" ? Promise.resolve() : answer === "rejects" ? Promise.reject(new Error("no")) : new Promise<void>(() => {}),
    );
    vi.doMock("@capacitor/splash-screen", () => ({ SplashScreen: { hide } }));
    /* A page still loading: the hide must not wait for `load` or a frame. */
    vi.stubGlobal("document", { readyState: "loading" });
    const { startSplash, FAILSAFE_MS } = await import("./splash");
    return { startSplash, hide, FAILSAFE_MS };
  }

  it("hides the splash at once, without waiting for load or a painted frame", async () => {
    vi.useFakeTimers();
    const raf = vi.fn();
    installWindow({ requestAnimationFrame: raf });
    const { startSplash, hide } = await loadSplash();

    startSplash();
    expect(hide).toHaveBeenCalledTimes(1);
    expect(hide).toHaveBeenCalledWith({ fadeOutDuration: 220 });
    expect(raf).not.toHaveBeenCalled();
  });

  it("hides only once when the first hide is answered: the failsafe finds the work done", async () => {
    vi.useFakeTimers();
    installWindow();
    const { startSplash, hide } = await loadSplash("resolves");
    const stop = startSplash();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(hide).toHaveBeenCalledTimes(1);
    /* Nor does the teardown hide a second time. */
    stop();
    expect(hide).toHaveBeenCalledTimes(1);
  });

  it("hides again at 2 seconds when the bridge never answers the first hide", async () => {
    vi.useFakeTimers();
    installWindow();
    const { startSplash, hide, FAILSAFE_MS } = await loadSplash("never");
    expect(FAILSAFE_MS).toBe(2_000);

    startSplash();
    await vi.advanceTimersByTimeAsync(1_999);
    expect(hide).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(hide).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(hide).toHaveBeenCalledTimes(2);
  });

  it("hides again at the failsafe when the plugin refuses the first hide", async () => {
    vi.useFakeTimers();
    installWindow();
    const { startSplash, hide, FAILSAFE_MS } = await loadSplash("rejects");
    startSplash();
    await vi.advanceTimersByTimeAsync(FAILSAFE_MS);
    expect(hide).toHaveBeenCalledTimes(2);
  });

  it("fires before the bridge failsafe, so the ordinary path always wins", async () => {
    /* Reversed, every broken launch would wait on the escape hatch, and the
       one failure the bridge timer exists for would be masked. */
    installWindow();
    const { FAILSAFE_MS } = await loadSplash();
    vi.doMock("@capacitor/core", () => new Promise(() => {}));
    const { BRIDGE_FAILSAFE_MS } = await import("./boot");
    expect(FAILSAFE_MS).toBeLessThan(BRIDGE_FAILSAFE_MS);
    vi.doUnmock("@capacitor/core");
  });

  it("hides on teardown when nothing has answered yet, because a cover over the whole screen must not survive", async () => {
    installWindow();
    const { startSplash, hide } = await loadSplash("never");
    startSplash()();
    expect(hide).toHaveBeenCalledTimes(2);
  });
});
