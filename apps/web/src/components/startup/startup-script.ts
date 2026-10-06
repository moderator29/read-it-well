/**
 * THE STARTUP'S ONE PIECE OF SCRIPT, INLINE AND NONCE-CARRYING.
 *
 * The sequence is CSS (`startup.css`), and since round 5 so is its door: it
 * opens at `--nf-startup-door`, 1150ms on the stylesheet's own clock, with
 * no script involved in when. This string, written into the page right after
 * the overlay by `StartupSequence`, only MOVES that number, because CSS
 * cannot know the two things that move it:
 *
 *   READY EARLY   nothing to do. The sequence completes on its schedule and
 *                 the door opens at 1150ms on the compositor, even while the
 *                 main thread is busy hydrating a mid-range phone at a
 *                 quarter of a laptop's speed (it used to wait for this
 *                 script to see the breath's `animationend`, which on that
 *                 phone came 250ms late; a brand moment cut short looks
 *                 broken, D31, and so does one that overstays).
 *   NOT READY     when the overlay's script runs, the page above it in the
 *                 document is already parsed, so "not ready" is a page that
 *                 is still streaming: a Suspense boundary React has marked
 *                 pending (`<!--$?-->`, or `<!--$~-->` queued) whose content
 *                 has not arrived. Then the door moves to the ceiling and the
 *                 lockup holds, settled, with the breath continuing
 *                 (`startup.css`, the hold); when the document has arrived
 *                 (DOMContentLoaded) it moves to now, or to 1150ms if that
 *                 has not passed. It never pretends to finish.
 *   CEILING       ...and never later than `STARTUP_CEILING_MS`, which is the
 *                 held door's own time, so the stylesheet enforces it even if
 *                 nothing here runs again. A stream that stalls after the
 *                 shell has painted leaves a usable shell beneath, and a
 *                 brand moment held over a usable app is the eight seconds
 *                 D31 exists to remove, with better production values.
 *   TAPPED        the door moves to now, on any pointer before it has
 *                 opened; and the click that tap would otherwise deliver to
 *                 whatever is beneath the finger (Get Started's doors, a card
 *                 on /home) is swallowed once (see "the ghost click" below).
 *                 A pointer AFTER the door has opened is the member's own and
 *                 goes through untouched: the overlay stops catching
 *                 pointers on the door's first frame (its keyframes), and
 *                 the moment is judged by the event's own time stamp, so a
 *                 tap the busy main thread hands over late is still judged
 *                 by when the finger came down.
 *   A KEY         the same as a tap, once, without the guard. The key is not
 *                 swallowed: a digit typed at a locked cold start is the
 *                 member already entering their code.
 *
 * "NOW" IS THE SEQUENCE'S OWN CLOCK: the overlay's door animation's
 * `currentTime`, which started on the same frame as every beat, so a door
 * moved to now lands exactly at the beat it interrupts. (Where the browser
 * has no `getAnimations`, the time since this script ran stands in.)
 * Reading the root's computed style first is deliberate: it resolves the
 * overlay's and the page's styles together, so the startup and the first
 * screen beneath it begin on one clock.
 *
 * QUIET (the platform's reduced-motion setting): `startup.css` draws the
 * settled lockup still and its door is a 160ms crossfade at 600ms; the
 * script does the same as above against that number.
 *
 * NOTHING LEAVES `data-splash="on"` BEHIND. When the door has finished (the
 * overlay's own `animationend`) the root's `data-splash` moves to "done",
 * which is the release `ThresholdStage` also gives: the overlay is gone for
 * good and `--nf-splash-hold` stops delaying later entrances. That event
 * never comes when the overlay is not painting (Calm or Off switched on
 * underneath it, whose stylesheet hides it, or a hidden tab), so a timer
 * releases it `STARTUP_RELEASE_MS` after the door whatever the stylesheet
 * did. Before it lets go, the door's time is pinned on anything marked
 * `data-startup-pin` (Get Started's stage), whose entrance is timed from it
 * and would otherwise jump when the root's number goes. `data-startup` turns
 * "open" when the door starts, for what still listens for it (the page
 * coming forward in `threshold.css`, the passcode lock). Everything is
 * wrapped in try: a failure releases the overlay rather than leaving anybody
 * behind it.
 *
 * THE GHOST CLICK. A tap is pointerdown, then (a beat later) click, and the
 * door drops the overlay's pointer events the moment it opens, so the tap's
 * own click would land on whatever is beneath the finger. The skip therefore
 * arms one capturing click listener on the window that eats the next click,
 * and disarms 400ms after the pointer lifts (a touch browser's click follows
 * the lift within that) or after 1.5s at most, so a later, deliberate tap is
 * never eaten.
 *
 * THE NATIVE SPLASH comes down on the first painted frame (two animation
 * frames, the earliest honest moment), through the Capacitor bridge the shell
 * injects before any page script, WHETHER OR NOT THE SEQUENCE PLAYS. The
 * native splash is the bare navy ground on every platform, and so is the
 * sequence's first frame, so the hand-over is one colour on both sides. When
 * the sequence does not play (data saver, Calm, Off, a second load) the page
 * itself is the first frame and the splash comes down onto it: before round
 * 5 only `lib/native/splash.ts` took it down then, after hydration and the
 * window's `load`, which on a 1.6Mbps line held a navy screen over a painted,
 * usable Get Started for a second and more, for exactly the members who had
 * asked for less waiting. `splash.ts` still runs its own hide; a second hide
 * is a no-op.
 */

/** When the door opens on the beats' own schedule (`startup.css`). */
export const STARTUP_DOOR_MS = 1150;

/** The longest the overlay is ever on screen before its door opens. */
export const STARTUP_CEILING_MS = 4000;

/**
 * After the door opens, the flag is released by this time at the latest:
 * the door's 380ms (`startup.css`, the mark landing) and a margin for a slow
 * frame.
 */
export const STARTUP_RELEASE_MS = 530;

/** How long after the pointer lifts the skip's click may still arrive. */
export const GHOST_CLICK_WINDOW_MS = 400;

/** The longest the skip waits for its click at all. */
export const GHOST_CLICK_CAP_MS = 1500;

export const STARTUP_SCRIPT = [
  "(function(){var D=document,W=window,d=D.documentElement,P='--nf-startup-door',A='addEventListener',R='removeEventListener',T=setTimeout,X=clearTimeout;",
  /* The native splash, on the first painted frame, whatever the gate said. */
  "try{var C=W.Capacitor;if(C&&C.isNativePlatform&&C.isNativePlatform()&&C.nativePromise)requestAnimationFrame(function(){requestAnimationFrame(function(){try{C.nativePromise('SplashScreen','hide',{fadeOutDuration:160}).catch(function(){})}catch(e){}})})}catch(e){}",
  "try{if(d.dataset.splash!=='on')return;var el=D.querySelector('.nf-startup');if(!el){d.dataset.splash='done';return}",
  /* The stylesheet's door (a minifier may write 1150ms as 1.15s). Reading it
     resolves the overlay's and the page's styles on one clock. */
  "var t0=performance.now(),v=getComputedStyle(d).getPropertyValue(P).trim(),base=parseFloat(v)*(/[^m]s$/.test(v)?1e3:1)||" + STARTUP_DOOR_MS + ",door=base,held=0,gone=0;",
  /* The sequence's clock: the overlay's door animation. */
  "function now(){try{var a=el.getAnimations()[0];if(a.currentTime!=null)return a.currentTime}catch(e){}return performance.now()-t0}",
  "function on(f){var m=f?A:R;D[m]('pointerdown',tap,!0);D[m]('keydown',key,!0)}",
  "function soon(){X(gone);gone=T(free,Math.max(0,door-now())+" + STARTUP_RELEASE_MS + ")}",
  "function move(t){door=Math.max(0,Math.round(t));d.style.setProperty(P,door+'ms');soon()}",
  "function open(){d.dataset.startup='open'}",
  /* Release: pin the door's time on what is timed from it, then let go. */
  "function free(){X(gone);on();if(d.dataset.splash!=='on')return;D.querySelectorAll('[data-startup-pin]').forEach(function(n){n.style.setProperty(P,door+'ms')});d.style.removeProperty(P);open();d.dataset.splash='done'}",
  /* Before the door? Judged at the event's own time, not the busy thread's. */
  "function early(e){return now()-Math.max(0,performance.now()-e.timeStamp)<door}",
  "function skip(){held=0;move(now());open()}",
  /* The ghost click: armed by the skip, eats one click, then disarms. */
  "function arm(){var t;function off(){X(t);W[R]('click',eat,!0);D[R]('pointerup',lift,!0);D[R]('pointercancel',lift,!0)}",
  "function eat(e){e.preventDefault();e.stopImmediatePropagation();off()}function lift(){X(t);t=T(off," + GHOST_CLICK_WINDOW_MS + ")}",
  "W[A]('click',eat,!0);D[A]('pointerup',lift,!0);D[A]('pointercancel',lift,!0);t=T(off," + GHOST_CLICK_CAP_MS + ")}",
  "function tap(e){if(!early(e))return on();arm();skip()}",
  "function key(e){if(e.metaKey||e.ctrlKey||e.altKey||/^(Shift|Control|Alt|Meta|CapsLock|Fn)$/.test(e.key))return;on();if(early(e))skip()}",
  "el[A]('animationstart',function(e){e.target==el&&open()});el[A]('animationend',function(e){e.target==el&&free()});",
  /* Not ready: a Suspense boundary above us that React has not filled yet. */
  "if(D.readyState=='loading'){var w=D.createTreeWalker(D.body,128),c;while(c=w.nextNode())if(c.data=='$?'||c.data=='$~'){held=1;move(" + STARTUP_CEILING_MS + ");break}",
  "D[A]('DOMContentLoaded',function(){if(held){held=0;move(Math.max(now(),base))}},{once:!0})}",
  "held||soon();on(1)",
  "}catch(e){try{d.style.removeProperty(P);d.dataset.startup='open';d.dataset.splash='done'}catch(x){}}})();",
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
 *                    travel, and section 3 answers it with a 160ms crossfade
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
