/*
 * THE OFFLINE CARD'S BEHAVIOUR (STORE-01).
 *
 * This page is what the binary shows when the live origin cannot be reached
 * (`server.errorPath` in `capacitor.config.ts`). It used to decide whether the
 * build had a server by calling `window.Capacitor.getConfig()`, which does not
 * exist in Capacitor 8, so every shipping build showed a developer card, and
 * its button reloaded this packaged page instead of retrying the origin.
 *
 * Now the origin is WRITTEN INTO THE BUILD (`shell-config.js`, from
 * `scripts/write-shell-config.mjs`) and read from there. The one
 * `window.Capacitor` member used is `nativePromise`, to hide the splash; see
 * `hideSplash` below. Retrying checks the origin answers, then
 * replaces this page with the app's start path; the `online` event does the
 * same by itself when the connection returns.
 *
 * Plain ES5 in one closure, no network request of its own beyond the retry
 * probe, so it runs from the binary with the radio switched off.
 */
(function (root) {
  "use strict";

  function originOf(win) {
    var raw = win && typeof win.__VALLO_ORIGIN__ === "string" ? win.__VALLO_ORIGIN__ : "";
    if (!/^https:\/\/[^\/\s]+$/.test(raw)) return null;
    return raw;
  }

  function startPathOf(win) {
    var raw = win && typeof win.__VALLO_START_PATH__ === "string" ? win.__VALLO_START_PATH__ : "/";
    return /^\/(?!\/)[^\s]*$/.test(raw) ? raw : "/";
  }

  /* Where "Try again" goes: the live app, never this page. */
  function retryTarget(win) {
    var origin = originOf(win);
    return origin ? origin + startPathOf(win) : null;
  }

  /*
   * TAKE THE SPLASH DOWN, BECAUSE NOTHING ELSE WILL (native release audit,
   * 28 September 2026). `launchAutoHide: false` leaves hiding the splash to
   * `src/lib/native/splash.ts`, which lives in the LIVE web app. When the
   * origin cannot be reached, which is App Review's airplane mode cold start,
   * the live app never loads, this packaged page is shown instead, and until
   * this line nothing hid the splash: the person sat on a static image forever
   * with this card underneath it.
   *
   * `nativePromise` is the bridge primitive Capacitor injects into every page
   * the web view loads, this local one included, and is declared in
   * `@capacitor/core`'s `definitions-internal.d.ts`. No plugin import, so this
   * still runs with the radio off.
   */
  function hideSplash(win) {
    try {
      var cap = win && win.Capacitor;
      if (!cap || typeof cap.nativePromise !== "function") return;
      var pending = cap.nativePromise("SplashScreen", "hide", { fadeOutDuration: 200 });
      if (pending && typeof pending.then === "function") pending.then(null, function () {});
    } catch (e) {
      /* A shell without the plugin shows no splash to hide. */
    }
  }

  function start(win, doc) {
    hideSplash(win);
    var target = retryTarget(win);
    if (!target) {
      doc.body.setAttribute("data-state", "unconfigured");
      return { target: null };
    }

    var busy = false;
    var still = doc.getElementById("still");
    var button = doc.getElementById("retry");

    function attempt() {
      if (busy) return;
      busy = true;
      if (button) button.setAttribute("disabled", "disabled");
      var done = function (reachable) {
        busy = false;
        if (button) button.removeAttribute("disabled");
        if (reachable) {
          win.location.replace(target);
        } else if (still) {
          still.hidden = false;
        }
      };
      /* An opaque no-cors request resolves when the origin answers at all and
         rejects when it cannot be reached, which is the only question asked.
         Without fetch, go and let the web view decide. */
      if (typeof win.fetch !== "function") {
        done(true);
        return;
      }
      win
        .fetch(win.__VALLO_ORIGIN__ + "/robots.txt", { mode: "no-cors", cache: "no-store" })
        .then(function () {
          done(true);
        }, function () {
          done(false);
        });
    }

    if (button) button.addEventListener("click", attempt);
    if (win.addEventListener) win.addEventListener("online", attempt);
    return { target: target, attempt: attempt };
  }

  root.__valloShell = { originOf: originOf, startPathOf: startPathOf, retryTarget: retryTarget, start: start, hideSplash: hideSplash };
  if (root.document && root.document.body) start(root, root.document);
})(typeof window !== "undefined" ? window : this);
