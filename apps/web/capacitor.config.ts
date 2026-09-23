import type { CapacitorConfig } from "@capacitor/cli";
/* A value import, not a type import, because `resize` below is typed as this
   enum rather than as a string. Verified to load cleanly under plain Node,
   which is what the Capacitor CLI evaluates this file with. */
import { KeyboardResize } from "@capacitor/keyboard";

/**
 * Capacitor, configured for what this application actually is.
 *
 * READ THIS BEFORE CHANGING `webDir` OR `server`.
 *
 * Capacitor normally packages a folder of static files into the native binary.
 * Vallo cannot produce one, and that is not a gap to be closed later: 40 files
 * declare server actions and `output: 'export'` refuses a project containing
 * one; `src/middleware.ts` is the session lock and static export runs no
 * middleware, so a static bundle would ship with no route protection at all;
 * and every route is dynamically rendered anyway because the root layout reads
 * cookies. See `docs/MOBILE_READINESS.md` section 2 for the full reasoning.
 *
 * So this is configured the other way round, which is a supported Capacitor
 * arrangement and not a workaround: the native shell loads the live origin over
 * https, and `webDir` holds a small branded shell that the binary falls back to
 * when that origin cannot be reached. That fallback is the honest answer to a
 * dead network on a metered Nigerian data bundle, and it is the reason `webDir`
 * is not empty.
 *
 * WHAT THE OWNER MUST KNOW. Apple's App Review guideline 4.2 rejects
 * applications that are only a web view around a website. Google Play is far
 * more tolerant of the same shape. The native capabilities wired in
 * `src/lib/native/` (status bar, splash, keyboard inset, hardware back button,
 * external payment and OAuth handoff) are what separate this from a bookmark,
 * and they are the argument, but they are not a guarantee. `docs/MOBILE.md`
 * prices the alternative honestly.
 */

/**
 * The live origin the shell loads.
 *
 * Read from the environment rather than hardcoded, because this repository does
 * not know the production domain: the owner sets it in Vercel and it has never
 * been visible here. The variable is `CAPACITOR_SERVER_URL`, read eleven lines
 * below, and NOT `NEXT_PUBLIC_SITE_URL`, which this comment used to name by
 * mistake. They are different variables and only the first is read here.
 *
 * `cap sync` evaluates this file, so the variable has to be present in the
 * shell that runs the sync, which is exactly what `docs/MOBILE.md` says to do.
 *
 * Left unset, `server` is omitted entirely and the binary loads `webDir`, which
 * means the shell opens on its own offline card and says so in plain words.
 * That is a designed state, the same way every other integration on this
 * platform degrades when its key is absent. It is NOT a shippable state, and
 * the offline card says that too.
 */
const liveOrigin = (process.env.CAPACITOR_SERVER_URL ?? "").trim();

const config: CapacitorConfig = {
  /*
   * Reverse DNS on a domain the owner controls. This string is permanent: it is
   * the primary key for the application on both stores, it cannot be changed
   * after the first submission without shipping a different app, and it has to
   * match the bundle identifier registered in the Apple Developer portal and in
   * the Play Console. Change it now if it is going to change at all.
   */
  appId: "com.vallospaces.app",

  /* What appears under the icon on a home screen. Kept to one word for the
     same reason `short_name` in the web manifest is: a launcher truncates. */
  appName: "Vallo",

  webDir: "native-shell",

  /*
   * STORE-02 / STORE-03. Every request from the shell carries this token, so
   * the SERVER knows it is rendering for the app and can leave out a sign-in
   * door that cannot complete inside a web view (a Google or Apple redirect
   * lands in the system browser's cookie jar, not the app's), on the first
   * frame rather than drawing it and removing it on the client. Read by
   * `surfaceFromUserAgent` in `src/lib/auth/providers.ts`; keep the two equal.
   */
  appendUserAgent: "VALLO-NATIVE",

  android: {
    /*
     * A release build must never be debuggable, and this is the flag people
     * forget. Play rejects a debuggable release upload, and if one ever got
     * through it would expose the WebView to remote inspection on a shipped
     * device.
     */
    webContentsDebuggingEnabled: false,
  },

  ios: {
    /* The shell is dark because the brand is dark, and the default is white.
       Without this the gap above the web view flashes white on every launch
       and on every rubber band scroll past the top of a page.

       THIS VALUE HAS A HOME AND IT IS `src/lib/theme/chrome`. It is written out
       here, in three places in this file, because this config is read by the
       Capacitor CLI rather than by the app, so it cannot rely on the path alias
       that resolves `@/`. If the chrome colour moves, these three move with it,
       and that note is at the definition too. */
    backgroundColor: "#010118",
    /* Links that are not ours open in the system browser rather than replacing
       the application. See `src/lib/native/external-links.ts` for why that
       matters to payments and to OAuth specifically. */
    limitsNavigationsToAppBoundDomains: false,
  },

  plugins: {
    SplashScreen: {
      /*
       * The splash is dismissed by the application, not by a timer.
       *
       * `launchAutoHide: false` hands the decision to `src/lib/native/boot.ts`,
       * which hides it once the web layer has actually painted. A timer either
       * uncovers a blank view on a slow connection, which is the first thing a
       * reviewer sees, or holds a static image over a page that was ready
       * seconds ago. Neither is acceptable and both are what the default does.
       */
      launchAutoHide: false,
      /* Matches `background_color` in the web manifest and the iOS shell above,
         so install, splash and first paint are one continuous colour. The
         manifest reads `CHROME_COLOUR.dark` now; see the note on the iOS
         `backgroundColor` above for why this one is still written out. */
      backgroundColor: "#010118",
      androidSplashResourceName: "splash",
      showSpinner: false,
    },
    StatusBar: {
      /* Dark is the default theme and the operating system does not override
         it. The bar is repainted at runtime by `applyThemeColour` when somebody
         chooses the paper theme; this is only the value it starts at, and it is
         `CHROME_COLOUR.dark` written out for the reason above. */
      style: "DARK",
      backgroundColor: "#010118",
      overlaysWebView: false,
    },
    PushNotifications: {
      /*
       * `presentationOptions` governs what iOS shows when a notification
       * arrives WHILE THE APPLICATION IS OPEN, which is the state every
       * person testing push is in, and the state iOS shows nothing in by
       * default.
       *
       * It is listed here for completeness and the plist is not the whole
       * story: the delegate method in `ios/App/App/AppDelegate.swift` is what
       * actually answers iOS when it asks, and without that method this
       * setting does nothing. Both are present; neither is sufficient.
       *
       * `badge` is included and is the one to watch: a badge nothing ever
       * clears is a red dot a person cannot get rid of, and clearing it is
       * the application's job, not the system's.
       */
      presentationOptions: ["badge", "sound", "alert"],
    },

    Keyboard: {
      /*
       * `resize: "native"` shrinks the web view when the keyboard opens, which
       * is what keeps a submit button reachable above it. The alternative,
       * "body", leaves the view at full height and the control sits behind the
       * keyboard, which is the mobile bug this platform has already fixed once
       * in its own sheets.
       */
      resize: KeyboardResize.Native,
      resizeOnFullScreen: true,
    },
  },

  /*
   * Only present when the origin is known. An empty `server.url` is worse than
   * no server block: Capacitor treats it as a URL and the shell loads nothing
   * at all, with no fallback to `webDir`.
   */
  ...(liveOrigin.length > 0
    ? {
        server: {
          url: liveOrigin,
          /* https only. `cleartext` would permit http, and the platform sends
             HSTS with preload on the web precisely so that cannot happen. */
          androidScheme: "https",
          cleartext: false,
          /*
           * THE AIRPLANE MODE TEST, WHICH WE FAILED FOR ONE MISSING LINE.
           *
           * App Review puts the device into airplane mode and rejects an
           * application that shows a blank white view or a browser error page
           * instead of a native offline state. `native-shell/index.html`
           * carries a real offline card and, without this line, IT COULD
           * NEVER BE REACHED IN A SHIPPING BUILD: `webDir` is only what the
           * binary loads when `CAPACITOR_SERVER_URL` is unset, and in a
           * shipping build it is set, so the web view is pointed at the live
           * origin and a failed load is a blank view.
           *
           * VERIFIED AGAINST THE BRIDGE SOURCE RATHER THAN THE DOCUMENTATION,
           * because the store research could only confirm the option exists.
           * On iOS, `WebViewDelegationHandler.swift` loads
           * `bridge.config.errorPathURL` from BOTH `didFail` and
           * `didFailProvisionalNavigation`, which is exactly the failure a
           * remote origin that cannot be reached produces. On Android,
           * `BridgeWebViewClient.onReceivedError` loads the error URL whenever
           * `request.isForMainFrame()`. And `CAPInstanceConfiguration.swift`
           * resolves `errorPathURL` against `localURL`, not against
           * `server.url`, so this path is the PACKAGED shell rather than a
           * page on an origin that is by definition unreachable.
           *
           * The card itself is designed with the offline surface. This
           * line is only what makes it reachable.
           */
          errorPath: "index.html",
        },
      }
    : {}),
};

export default config;
