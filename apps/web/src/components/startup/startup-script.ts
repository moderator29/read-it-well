/**
 * THE STARTUP'S ONE PIECE OF SCRIPT, INLINE AND NONCE-CARRYING.
 *
 * The sequence itself is CSS (`startup.css`): it starts on the first frame
 * and never waits for a JavaScript chunk. This string, written into the page
 * right after the overlay by `StartupSequence`, decides only WHEN THE DOOR
 * OPENS, because that is the one thing CSS cannot know:
 *
 *   READY EARLY   the sequence still completes. The door opens when BOTH the
 *                 breath beat has finished (its own `animationend`, so the
 *                 script and the stylesheet can never disagree about time)
 *                 AND the document has finished arriving (DOMContentLoaded:
 *                 the streamed page is all there). A brand moment cut short
 *                 looks broken (D31).
 *   NOT READY     the lockup holds, settled, with the breath continuing
 *                 (`startup.css`, the hold), and the door opens the moment
 *                 the document has arrived. It never pretends to finish.
 *   CEILING       ...but never for longer than `STARTUP_CEILING_MS` from the
 *                 moment the overlay is on the page. A stream that stalls
 *                 after the shell has painted leaves a usable shell beneath,
 *                 and a brand moment held over a usable app is the eight
 *                 seconds D31 exists to remove, with better production values.
 *                 Four seconds is the old splash's own give-up
 *                 (`ThresholdStage`), so the two agree.
 *   TAPPED        the door opens at once, on any pointer, at any point; and
 *                 the click that tap would otherwise deliver to whatever is
 *                 now beneath the finger (Get Started's doors, a card on
 *                 /home) is swallowed once (see "the ghost click" below).
 *   A KEY         the door opens at once on the first key, once. The key is
 *                 not swallowed: a digit typed at a locked cold start is the
 *                 member already entering their code.
 *
 * QUIET (the platform's reduced-motion setting, MOTION_SYSTEM.md section 3:
 * "a 160ms crossfade under reduced motion"). `startup.css` draws the settled
 * lockup still, with no assembly, breath or hold, so there is no breath to
 * wait for: the door is a 160ms crossfade the moment the document has
 * arrived (or on a tap, a key or the ceiling). The setting can also change
 * while the sequence is on screen; the script reads it live and treats the
 * breath as done, so the switch never strands it.
 *
 * NOTHING LEAVES `data-splash="on"` BEHIND. When the door has opened (its own
 * `animationend`) the root's `data-splash` moves to "done", which is the
 * release `ThresholdStage` also gives: the overlay is gone for good and
 * `--nf-splash-hold` stops delaying later entrances. That event never comes
 * when the overlay is not painting (Calm or Off switched on underneath it,
 * whose stylesheet hides it, or a hidden tab), so opening the door also arms
 * `STARTUP_RELEASE_MS`, after which the flag is released whatever the
 * stylesheet did. A breath that never reports is covered by
 * `BREATH_CEILING_MS`, and everything is wrapped in try: a failure opens the
 * door rather than leaving anybody behind it.
 *
 * THE GHOST CLICK. A tap is pointerdown, then (a beat later) click, and the
 * door drops the overlay's pointer events the moment it opens, so the tap's
 * own click would land on whatever is beneath the finger. The skip therefore
 * arms one capturing click listener on the window that eats the next click,
 * and disarms 400ms after the pointer lifts (a touch browser's click follows
 * the lift within that) or after 1.5s at most, so a later, deliberate tap is
 * never eaten. The overlay itself stops catching pointers at once rather
 * than at the door's end, because nothing may block interaction
 * (MOTION_SYSTEM.md section 1, principle 9).
 *
 * THE NATIVE SPLASH comes down on the first painted frame (two animation
 * frames, the earliest honest moment), through the Capacitor bridge the shell
 * injects before any page script, so the system splash and this sequence
 * never fight. `lib/native/splash.ts` still runs its own hide after
 * hydration; a second hide is a no-op.
 */
export const BREATH_CEILING_MS = 1400;

/** The longest the overlay is ever on screen before its door opens. */
export const STARTUP_CEILING_MS = 4000;

/**
 * After the door opens, the flag is released by this time at the latest:
 * the door's 350ms (`startup.css`, `leave`) and a margin for a slow frame.
 */
export const STARTUP_RELEASE_MS = 500;

/** How long after the pointer lifts the skip's click may still arrive. */
export const GHOST_CLICK_WINDOW_MS = 400;

/** The longest the skip waits for its click at all. */
export const GHOST_CLICK_CAP_MS = 1500;

export const STARTUP_SCRIPT = [
  "(function(){try{",
  "var d=document.documentElement;if(d.dataset.splash!=='on')return;",
  "var el=document.querySelector('.nf-startup');if(!el){d.dataset.splash='done';return}",
  "var breathed=false,ready=false,gone=0,ceiling=0,breath=0,mq=null;",
  "try{mq=matchMedia('(prefers-reduced-motion: reduce)')}catch(e){}",
  /* Quiet from the start: there is no breath to wait for. */
  "if(mq&&mq.matches)breathed=true;",
  "function listen(on){var m=on?'addEventListener':'removeEventListener';",
  "document[m]('pointerdown',tap,true);document[m]('keydown',key,true);",
  "if(mq&&mq[m])mq[m]('change',flip)}",
  "function release(){clearTimeout(gone);clearTimeout(ceiling);clearTimeout(breath);listen(false);",
  "if(d.dataset.splash==='on')d.dataset.splash='done'}",
  "function open(){clearTimeout(ceiling);if(d.dataset.startup==='open')return;d.dataset.startup='open';",
  "listen(false);gone=setTimeout(release," + STARTUP_RELEASE_MS + ")}",
  "function check(){if(breathed&&ready)open()}",
  /* The ghost click: armed by the skip, eats one click, then disarms. */
  "function arm(){var t=0;",
  "function disarm(){clearTimeout(t);window.removeEventListener('click',eat,true);",
  "document.removeEventListener('pointerup',lift,true);document.removeEventListener('pointercancel',lift,true)}",
  "function eat(e){e.preventDefault();e.stopImmediatePropagation();disarm()}",
  "function lift(){clearTimeout(t);t=setTimeout(disarm," + GHOST_CLICK_WINDOW_MS + ")}",
  "window.addEventListener('click',eat,true);",
  "document.addEventListener('pointerup',lift,true);document.addEventListener('pointercancel',lift,true);",
  "t=setTimeout(disarm," + GHOST_CLICK_CAP_MS + ")}",
  "function tap(){if(d.dataset.startup==='open')return;arm();open()}",
  "function key(e){if(e.metaKey||e.ctrlKey||e.altKey||/^(Shift|Control|Alt|Meta|CapsLock|Fn)$/.test(e.key))return;open()}",
  "function flip(){if(mq.matches){breathed=true;check()}}",
  "el.addEventListener('animationend',function(e){var n=e.animationName;",
  "if(n==='nf-startup-breath'){breathed=true;check()}",
  "else if(e.target===el&&(n==='nf-startup-door'||n==='nf-startup-fade'))release()});",
  "breath=setTimeout(function(){breathed=true;check()}," + BREATH_CEILING_MS + ");",
  "ceiling=setTimeout(open," + STARTUP_CEILING_MS + ");",
  "function arrived(){ready=true;check()}",
  "if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',arrived,{once:true});else arrived();",
  "listen(true);",
  "var C=window.Capacitor;if(C&&C.isNativePlatform&&C.isNativePlatform()&&C.nativePromise){",
  "requestAnimationFrame(function(){requestAnimationFrame(function(){try{var p=C.nativePromise('SplashScreen','hide',{fadeOutDuration:160});if(p&&p.catch)p.catch(function(){})}catch(e){}})})}",
  "}catch(e){try{document.documentElement.dataset.startup='open';document.documentElement.dataset.splash='done'}catch(x){}}})();",
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
 */
export const STARTUP_GATE_SCRIPT =
  "try{var d=document.documentElement;if(!sessionStorage.getItem('nf_entered')&&d.dataset.saveData!=='on'&&d.dataset.motionSplash!=='off'&&d.dataset.motion!=='calm'&&d.dataset.motion!=='off'&&!/^\\/(admin|auth|api|offline|open|s|r)(\\/|$)/.test(location.pathname))d.dataset.splash='on';sessionStorage.setItem('nf_entered','1')}catch(e){}";
