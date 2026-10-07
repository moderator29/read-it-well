/**
 * THE STARTUP'S ONE PIECE OF SCRIPT, INLINE AND NONCE-CARRYING.
 *
 * The sequence is CSS (`startup.css`), and so is its door: it opens at
 * `--nf-startup-door`, 1350ms on the stylesheet's own clock, with no script
 * involved in when. This string, written into the page right after the
 * overlay by `StartupSequence`, does three things CSS cannot:
 *
 *   THE NATIVE SPLASH  comes down THE MOMENT THIS RUNS, before anything else
 *                 and whatever the gate said (see below).
 *   NATIVE WAIT   on the shell, the whole page's animations are held at
 *                 their first frame (`data-startup-native="wait"` on the
 *                 root, `startup.css`) until the bridge says the native
 *                 splash has been told to go, or `NATIVE_WAIT_MS` at most,
 *                 so the rise is not played out of sight beneath it. Every
 *                 animation on the page is held, not only the overlay's, so
 *                 the page beneath and the door stay on one clock.
 *   TAPPED        the door moves to now, on any pointer before it has
 *                 opened; and the click that tap would otherwise deliver to
 *                 whatever is beneath the finger is swallowed once (see "the
 *                 ghost click" below). A pointer AFTER the door has opened is
 *                 the member's own and goes through untouched: the overlay
 *                 stops catching pointers on the door's first frame (its
 *                 keyframes), and the moment is judged by the event's own
 *                 time stamp, so a tap the busy main thread hands over late
 *                 is still judged by when the finger came down.
 *   A KEY         the same as a tap, once, without the guard. The key is not
 *                 swallowed: a digit typed at a locked cold start is the
 *                 member already entering their code.
 *
 * NO HOLD FOR A PAGE STILL STREAMING (October 2026). The door used to move
 * to a four-second ceiling while a Suspense boundary above the overlay was
 * pending, so /home and /search held a still logo for up to four seconds.
 * The founder saw that as the app hanging. The door now opens on its own
 * schedule whatever the stream is doing, onto the page's own loading
 * skeleton, which is the honest picture of a page arriving.
 *
 * "NOW" IS THE SEQUENCE'S OWN CLOCK: the overlay's door animation's
 * `currentTime`, which started on the same frame as every beat (and stands
 * still with them during the native wait), so a door moved to now lands
 * exactly at the beat it interrupts. (Where the browser has no
 * `getAnimations`, the time since this script ran, or since the wait ended,
 * stands in.) Reading the root's computed style first is deliberate: it
 * resolves the overlay's and the page's styles together, so the startup and
 * the first screen beneath it begin on one clock.
 *
 * QUIET (the platform's reduced-motion setting): `startup.css` draws the
 * still lockup and its door is a 200ms crossfade at 500ms; the script does
 * the same as above against that number.
 *
 * NOTHING LEAVES `data-splash="on"` BEHIND. When the door has finished (the
 * overlay's own `animationend`) the root's `data-splash` moves to "done",
 * which is the release `ThresholdStage` also gives: the overlay is gone for
 * good and `--nf-splash-hold` stops delaying later entrances. That event
 * never comes when the overlay is not painting (Calm or Off switched on
 * underneath it, whose stylesheet hides it, or a hidden tab), so a timer
 * releases it `STARTUP_RELEASE_MS` after the door whatever the stylesheet
 * did. Before it lets go, the door's time is pinned on anything marked
 * `data-startup-pin`, whose entrance is timed from it and would otherwise
 * jump when the root's number goes, and the native wait is lifted whatever
 * state it is in. `data-startup` turns "open" when the door starts, for what
 * still listens for it (the page coming forward in `threshold.css`, the
 * passcode lock). Everything is wrapped in try: a failure releases the
 * overlay rather than leaving anybody behind it.
 *
 * THE GHOST CLICK. A tap is pointerdown, then (a beat later) click, and the
 * door drops the overlay's pointer events the moment it opens, so the tap's
 * own click would land on whatever is beneath the finger. The skip therefore
 * arms one capturing click listener on the window that eats the next click,
 * and disarms 400ms after the pointer lifts (a touch browser's click follows
 * the lift within that) or after 1.5s at most, so a later, deliberate tap is
 * never eaten.
 *
 * THE NATIVE SPLASH IS HIDDEN IMMEDIATELY, NOT ON A PAINTED FRAME. It used to
 * be hidden inside two nested `requestAnimationFrame`s ("the first painted
 * frame"). On Android the Capacitor splash plugin cancels the web view's
 * draws (an `OnPreDrawListener` answering false) until `hide()` is called, so
 * those frames could never come, and the splash came down only on the
 * fallback timers in `lib/native/splash.ts` and `lib/native/boot.ts`: the
 * founder's "logo for up to eight seconds, no motion whatsoever". The native
 * splash is the bare navy ground, and so is the overlay's first frame (the
 * mark starts invisible), so hiding before a frame has painted uncovers the
 * same navy. When the sequence does not play (data saver, Calm, Off, a
 * second load) the page itself is beneath. `splash.ts` still runs its own
 * hide; a second hide is a no-op.
 */

/** When the door opens on the beats' own schedule (`startup.css`). */
export const STARTUP_DOOR_MS = 1350;

/**
 * After the door opens, the flag is released by this time at the latest:
 * the door's 400ms (`startup.css`, the fade and lift) and a margin for a
 * slow frame.
 */
export const STARTUP_RELEASE_MS = 550;

/**
 * On the native shell, the longest the sequence waits, held at its first
 * frame, for the bridge to say the native splash has been told to go.
 */
export const NATIVE_WAIT_MS = 600;

/** How long after the pointer lifts the skip's click may still arrive. */
export const GHOST_CLICK_WINDOW_MS = 400;

/** The longest the skip waits for its click at all. */
export const GHOST_CLICK_CAP_MS = 1500;

export const STARTUP_SCRIPT = [
  "(function(){var D=document,W=window,d=D.documentElement,P='--nf-startup-door',N='startupNative',A='addEventListener',R='removeEventListener',T=setTimeout,X=clearTimeout,h=0;",
  /* The native splash, now, whatever the gate said. No frame is waited for:
     on Android none is drawn until this call. */
  "try{var C=W.Capacitor;if(C&&C.isNativePlatform&&C.isNativePlatform()&&C.nativePromise){h=C.nativePromise('SplashScreen','hide',{fadeOutDuration:160});if(h&&h.then)h.then(null,function(){});else h=0}}catch(e){h=0}",
  "try{if(d.dataset.splash!=='on')return;var el=D.querySelector('.nf-startup');if(!el){d.dataset.splash='done';return}",
  /* Held at the first frame until the native splash is going. Set before
     the styles are read, so the beats never start beneath it. */
  "if(h)d.dataset[N]='wait';",
  /* The stylesheet's door (a minifier may write 1350ms as 1.35s). Reading it
     resolves the overlay's and the page's styles on one clock. */
  "var t0=performance.now(),v=getComputedStyle(d).getPropertyValue(P).trim(),door=parseFloat(v)*(/[^m]s$/.test(v)?1e3:1)||" + STARTUP_DOOR_MS + ",gone=0;",
  /* The sequence's clock: the overlay's door animation. */
  "function now(){try{var a=el.getAnimations()[0];if(a.currentTime!=null)return a.currentTime}catch(e){}return performance.now()-t0}",
  "function on(f){var m=f?A:R;D[m]('pointerdown',tap,!0);D[m]('keydown',key,!0)}",
  "function soon(){X(gone);gone=T(free,Math.max(0,door-now())+" + STARTUP_RELEASE_MS + ")}",
  /* The native wait ends: the beats run from their first frame. */
  "function wake(){if(d.dataset[N]){delete d.dataset[N];t0=performance.now();soon()}}",
  "function move(t){door=Math.max(0,Math.round(t));d.style.setProperty(P,door+'ms');soon()}",
  "function open(){d.dataset.startup='open'}",
  /* Release: lift the wait, pin the door's time on what is timed from it,
     then let go. */
  "function free(){X(gone);on();delete d.dataset[N];if(d.dataset.splash!=='on')return;D.querySelectorAll('[data-startup-pin]').forEach(function(n){n.style.setProperty(P,door+'ms')});d.style.removeProperty(P);open();d.dataset.splash='done'}",
  /* Before the door? Judged at the event's own time, not the busy thread's. */
  "function early(e){return now()-Math.max(0,performance.now()-e.timeStamp)<door}",
  "function skip(){wake();move(now());open()}",
  /* The ghost click: armed by the skip, eats one click, then disarms. */
  "function arm(){var t;function off(){X(t);W[R]('click',eat,!0);D[R]('pointerup',lift,!0);D[R]('pointercancel',lift,!0)}",
  "function eat(e){e.preventDefault();e.stopImmediatePropagation();off()}function lift(){X(t);t=T(off," + GHOST_CLICK_WINDOW_MS + ")}",
  "W[A]('click',eat,!0);D[A]('pointerup',lift,!0);D[A]('pointercancel',lift,!0);t=T(off," + GHOST_CLICK_CAP_MS + ")}",
  "function tap(e){if(!early(e))return on();arm();skip()}",
  "function key(e){if(e.metaKey||e.ctrlKey||e.altKey||/^(Shift|Control|Alt|Meta|CapsLock|Fn)$/.test(e.key))return;on();if(early(e))skip()}",
  "el[A]('animationstart',function(e){e.target==el&&open()});el[A]('animationend',function(e){e.target==el&&free()});",
  /* On the shell, the beats start when the native splash is going; on the
     web, now. */
  "if(h){h.then(wake,wake);T(wake," + NATIVE_WAIT_MS + ")}else soon();on(1)",
  "}catch(e){try{delete d.dataset[N];d.style.removeProperty(P);d.dataset.startup='open';d.dataset.splash='done'}catch(x){}}})();",
].join("");

/**
 * THE GATE, DECIDED BEFORE PAINT: whether this load opens with the sequence
 * at all. It belongs in the root layout's early `<script>` (it must run
 * before the first frame, and the overlay is drawn after the page), and it
 * is written here so the decision and the sequence it gates live in one
 * place and are tested together (`startup-script.test.ts`).
 *
 * Once per browser session, which on the native shell is once per cold
 * start; never on the console, the auth callback, the API, the offline page,
 * `/open` or a shared link (`/s`, `/r`). And, in the member's own settings:
 *
 *   Off              never: instant (MOTION_SYSTEM.md section 1, principle 8)
 *   Calm             never: Calm is the member's choice, made in Vallo, of
 *                    no thresholds at all (`thresholdAllowed`), and
 *                    `motion-pref.css` hides the overlay under it
 *   splash off       never: the member switched this one moment off
 *   data saver       never: someone saving data has asked for the app, not
 *                    for a held brand moment in front of it
 *   reduced motion   YES, quietly: the platform's own setting asks for less
 *                    travel, and section 3 answers it with a 200ms crossfade
 *                    from the still lockup (`startup.css`, quiet), never with
 *                    the assembly
 *
 * THE SESSION MARK IS WRITTEN FIRST, and the sequence is switched on only
 * once that write has succeeded (audit A5). Where storage refuses the write
 * (a private window, blocked site data, a full quota) the throw lands in the
 * catch before the flag is set, so the sequence does not play at all, rather
 * than on every full page load of the session because nothing remembered
 * that it already had.
 */
export const STARTUP_GATE_SCRIPT =
  "try{var d=document.documentElement;if(!sessionStorage.getItem('nf_entered')){sessionStorage.setItem('nf_entered','1');" +
  "if(d.dataset.saveData!=='on'&&d.dataset.motionSplash!=='off'&&d.dataset.motion!=='calm'&&d.dataset.motion!=='off'&&!/^\\/(admin|auth|api|offline|open|s|r)(\\/|$)/.test(location.pathname))d.dataset.splash='on'}}catch(e){}";
