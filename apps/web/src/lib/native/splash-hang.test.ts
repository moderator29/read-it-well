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
 *   2. `splash.ts` arms its own FAILSAFE_MS timer the moment it runs, for the
 *      web view that never fires `load` or never paints another frame.
 *   3. `app/home-or-landing/route.ts` races `resolveSession()`, a live GoTrue
 *      round trip, against a deadline, because this route is the shell's cold
 *      start navigation: while it hangs, no document is delivered, so neither
 *      of the two timers above has been parsed, let alone armed.
 *
 * The timings are asserted as the ordering they have to keep, not just as
 * literals: the bridge failsafe must be the LAST one to fire, so an ordinary
 * launch is never taken down by the escape hatch meant for a broken one.
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
  it("hides the splash through the injected bridge, 7 seconds after the runtime starts", async () => {
    vi.useFakeTimers();
    const nativePromise = vi.fn().mockResolvedValue(undefined);
    installWindow({
      Capacitor: { isNativePlatform: () => true, getPlatform: () => "android", nativePromise },
    });
    /* The native chunk is the thing being simulated as never arriving, so the
       second (authoritative) gate must answer no and stop the async half. */
    vi.doMock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => false } }));
    const { startNativeRuntime } = await import("./boot");

    const stop = startNativeRuntime({ goBack: () => {} });
    await vi.advanceTimersByTimeAsync(6_999);
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
    await vi.advanceTimersByTimeAsync(7_000);
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

describe("the failsafe inside splash.ts, for the view that never paints", () => {
  async function loadSplash(readyState: string) {
    const hide = vi.fn().mockResolvedValue(undefined);
    vi.doMock("@capacitor/splash-screen", () => ({ SplashScreen: { hide } }));
    vi.stubGlobal("document", { readyState });
    const { startSplash } = await import("./splash");
    return { startSplash, hide };
  }

  it("hides the splash after 4 seconds even though load never fires", async () => {
    vi.useFakeTimers();
    installWindow();
    const { startSplash, hide } = await loadSplash("loading");

    startSplash();
    await vi.advanceTimersByTimeAsync(3_999);
    expect(hide).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(hide).toHaveBeenCalledWith({ fadeOutDuration: 220 });
  });

  it("fires well before the bridge failsafe, so the ordinary path always wins", async () => {
    /* 4 s then 7 s. Reversed, every launch would be taken down by the escape
       hatch, and the one failure the bridge timer exists for would be masked. */
    vi.useFakeTimers();
    installWindow();
    const { startSplash, hide } = await loadSplash("loading");
    startSplash();
    await vi.advanceTimersByTimeAsync(6_999);
    expect(hide).toHaveBeenCalledTimes(1);
  });

  it("hides after two frames when the page is already complete, and hides only once", async () => {
    vi.useFakeTimers();
    installWindow();
    const { startSplash, hide } = await loadSplash("complete");

    startSplash();
    expect(hide).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(32);
    expect(hide).toHaveBeenCalledTimes(1);
    /* The failsafe finds the work done rather than hiding a second time. */
    await vi.advanceTimersByTimeAsync(10_000);
    expect(hide).toHaveBeenCalledTimes(1);
  });

  it("hides on teardown, because a cover over the whole screen must not survive", async () => {
    installWindow();
    const { startSplash, hide } = await loadSplash("loading");
    startSplash()();
    expect(hide).toHaveBeenCalledTimes(1);
  });
});
