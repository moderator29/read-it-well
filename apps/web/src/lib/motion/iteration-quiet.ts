/**
 * NO WAKE-UPS FOR ANIMATION LAPS (Track M performance, 25 September 2026).
 *
 * The moving edge lights (`app/css/edge-m.css`) are compositor animations:
 * once they start, the browser draws every frame without the page's main
 * thread. It would, except that React registers a listener for every event it
 * supports, `animationiteration` among them, on its root and on every portal
 * container (Next.js keeps one inside the route announcer's shadow root). As
 * long as anything in the document listens for that event, the browser wakes
 * the main thread for every lap of every looping animation, to find out
 * whether an event is due. Measured on Search (108 lights) with the CPU slowed
 * four times to stand in for a mid-range phone: 4.4 percent of the main
 * thread with React's listeners, 0.4 percent without them.
 *
 * Nothing in Vallo handles `onAnimationIteration` (`iteration-quiet.test.ts`
 * fails the day something does), and in the built client bundle the only code
 * that names the event is React's own event table. So this refuses that one
 * listener type everywhere, before React starts. The root layout runs it
 * first, before paint. Every other event type passes straight through.
 *
 * Written out in full rather than generated, so the CSP nonce covers exactly
 * the text a reviewer reads. It never throws.
 */
export const ITERATION_QUIET_SCRIPT =
  "try{var p=EventTarget.prototype,a=p.addEventListener;" +
  "p.addEventListener=function(t){if(t==='animationiteration')return;return a.apply(this,arguments)}" +
  "}catch(e){}";
