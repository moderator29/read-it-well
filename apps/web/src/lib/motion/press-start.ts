/**
 * A PRESS THAT STARTS ON THE FINGER, NOT ON THE CLICK (round 5, the listing
 * opens).
 *
 * `:active` is the browser's to give, and on a phone it gives it late: Chrome
 * on Android holds it until it knows a touch is a tap rather than a scroll
 * (on a quick tap that is the lift, the same moment as the click), and iOS
 * Safari draws none without a touch listener. The 120ms press then plays on
 * top of the navigation instead of answering the thumb.
 *
 * `pressFrom(el)` marks `data-pressed` on the element the instant the pointer
 * lands, and takes it off on the first of: the pointer lifting, the browser
 * claiming the touch for a scroll (`pointercancel`), a scroll of the page, or
 * a ceiling. The stylesheet sinks the element on the press token
 * (list-views.css). It writes one attribute and adds passive listeners:
 * nothing re-renders, nothing is prevented, the tap goes through untouched.
 */
const CEILING_MS = 1200;

export function pressFrom(el: HTMLElement): void {
  if (typeof window === "undefined") return;
  el.setAttribute("data-pressed", "");
  let timer = 0;
  const release = () => {
    el.removeAttribute("data-pressed");
    window.clearTimeout(timer);
    window.removeEventListener("pointerup", release, true);
    window.removeEventListener("pointercancel", release, true);
    window.removeEventListener("scroll", release, true);
  };
  window.addEventListener("pointerup", release, { capture: true, passive: true });
  window.addEventListener("pointercancel", release, { capture: true, passive: true });
  window.addEventListener("scroll", release, { capture: true, passive: true });
  timer = window.setTimeout(release, CEILING_MS);
}
