"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { canGoBackInApp } from "@/lib/ui/history";
import { startNativeRuntime } from "@/lib/native/boot";

/**
 * Mounts the native runtime. Renders nothing.
 *
 * Modelled on `ServiceWorkerRegistrar`, which sits beside it in the root
 * layout and solves the same shape of problem: a capability that belongs to
 * the whole application, has no UI of its own, and must be started exactly
 * once from a place every route passes through.
 *
 * It exists as a component for one reason that could not be solved inside
 * `lib/native/`: the hardware back button has to walk the application's own
 * history, and the Next router is a React context. So this component holds the
 * router and hands the runtime the single capability it cannot reach for
 * itself. Everything else the runtime does is plain DOM and plugin work and
 * stays out of React entirely, which is why this file is nine lines of code
 * and the reasoning lives in the modules that do the work.
 *
 * ON THE WEB THIS IS A NO-OP AND COSTS NOTHING. `startNativeRuntime` returns
 * immediately unless the Capacitor bridge is present, and every plugin is
 * behind a dynamic import that a browser never requests. Mounting it in the
 * root layout therefore changes nothing at all about the website, which is the
 * condition of it being allowed there.
 */
export function NativeRuntime() {
  const router = useRouter();

  useEffect(
    () =>
      startNativeRuntime({
        /*
         * The same question every other back control on this platform asks.
         *
         * `startBackButton` already asks `canGoBackInApp()` before it calls
         * this, and exits the application when the answer is no, so in practice
         * the guard here never changes the outcome. It is here anyway for two
         * reasons. It keeps the invariant visible at the call site rather than
         * three modules away, which is what `session-memory.spec.mjs` checks
         * for across every `router.back()` in the codebase and what caught this
         * file. And it means a future caller of `goBack` that forgets to ask
         * cannot push this router past the start of its own history.
         */
        goBack: () => {
          if (canGoBackInApp()) router.back();
        },
      }),
    [router],
  );

  return null;
}
