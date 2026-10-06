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
 *   TAPPED        the door opens at once. Tap to skip, at any point.
 *
 * When the door has opened (its own `animationend`) the root's `data-splash`
 * moves to "done", which is the same release `ThresholdStage` gives the old
 * splash: the overlay is gone for good and `--nf-splash-hold` stops delaying
 * later entrances.
 *
 * THE NATIVE SPLASH comes down on the first painted frame (two animation
 * frames, the earliest honest moment), through the Capacitor bridge the shell
 * injects before any page script, so the system splash and this sequence
 * never fight. `lib/native/splash.ts` still runs its own hide after
 * hydration; a second hide is a no-op.
 *
 * A breath that never reports (a hidden tab does not run animations) is
 * covered by a ceiling: after `BREATH_CEILING_MS` the breath counts as done.
 * Everything is wrapped in try, and a failure opens the door rather than
 * leaving anybody behind it.
 */
export const BREATH_CEILING_MS = 1400;

export const STARTUP_SCRIPT = [
  "(function(){try{",
  "var d=document.documentElement;if(d.dataset.splash!=='on')return;",
  "var el=document.querySelector('.nf-startup');if(!el){d.dataset.splash='done';return}",
  "var breathed=false,ready=false;",
  "function open(){if(d.dataset.startup==='open')return;d.dataset.startup='open';document.removeEventListener('pointerdown',open,true)}",
  "function check(){if(breathed&&ready)open()}",
  "el.addEventListener('animationend',function(e){",
  "if(e.animationName==='nf-startup-breath'){breathed=true;check()}",
  "else if(e.animationName==='nf-startup-door'){d.dataset.splash='done'}});",
  `setTimeout(function(){breathed=true;check()},${BREATH_CEILING_MS});`,
  "function arrived(){ready=true;check()}",
  "if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',arrived,{once:true});else arrived();",
  "document.addEventListener('pointerdown',open,true);",
  "var C=window.Capacitor;if(C&&C.isNativePlatform&&C.isNativePlatform()&&C.nativePromise){",
  "requestAnimationFrame(function(){requestAnimationFrame(function(){try{var p=C.nativePromise('SplashScreen','hide',{fadeOutDuration:160});if(p&&p.catch)p.catch(function(){})}catch(e){}})})}",
  "}catch(e){try{document.documentElement.dataset.startup='open';document.documentElement.dataset.splash='done'}catch(x){}}})();",
].join("");
