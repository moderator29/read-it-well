"use client";

import { Keyboard } from "@capacitor/keyboard";

/**
 * The on-screen keyboard, and the small amount of work `resize: "native"`
 * leaves for the web layer to finish.
 *
 * The plugin is configured with `resize: "native"`, which is the right choice
 * and does most of the job: the web view itself shrinks to the space above the
 * keyboard, so `100dvh`, `position: fixed` and every sticky action bar on the
 * platform re-resolve against the smaller viewport instead of hiding behind
 * the keys. That is the mobile bug this codebase has already fixed once by
 * hand in its own sheets, and the native resize means it cannot come back.
 *
 * TWO THINGS THE RESIZE DOES NOT FIX, WHICH IS WHY THIS FILE EXISTS.
 *
 * 1. THE SAFE AREA GOES STALE. `env(safe-area-inset-bottom)` describes the
 *    home indicator at the bottom of the DEVICE, and the platform's floating
 *    dock, pinned action bars and bottom sheets all add it. With the keyboard
 *    open the bottom of the web view is no longer the bottom of the device, it
 *    is the top of the keyboard, and there is no home indicator there. Every
 *    one of those surfaces keeps reserving 34 points of empty space that now
 *    sits between the control and the keys. So the root element is marked
 *    while the keyboard is up and `css/chrome.css` collapses the reservation.
 *
 * 2. THE DOCK EATS THE ROOM THAT IS LEFT. At 390 by 844 with a keyboard up
 *    there is roughly 300 points of viewport, and the floating tab bar takes
 *    about 75 of them to show destinations nobody is navigating to mid
 *    sentence. Native applications hide their tab bar while typing for exactly
 *    this reason. The same marker drives it, in CSS, so nothing re-renders.
 *
 * THE CUSTOM PROPERTY. `--nf-keyboard-inset` carries the measured height in
 * pixels, following the same idiom the safe areas already use in `chips.css`,
 * `chrome.css` and `overlays.css`: a value on the root that any surface can
 * read, rather than a measurement each one takes for itself and gets
 * differently. It is zero whenever the keyboard is closed, so a rule may use
 * it unconditionally.
 *
 * SCROLLING THE FOCUSED FIELD INTO VIEW. The resize changes the size of the
 * viewport but not the scroll position inside it, so a field near the bottom
 * of a long form can end up just under the fold at the moment it is focused.
 * `block: "nearest"` is deliberate: it moves the page by the smallest amount
 * that makes the field visible and does nothing at all when it already is,
 * which is the difference between a helpful nudge and the page lurching under
 * somebody's thumb every time they tap an input.
 */

/** Does this person want motion kept to a minimum? */
function motionIsReduced(): boolean {
  if (document.documentElement.dataset.reduceMotion === "1") return true;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/** Editable things worth scrolling to. A tap on anything else is not typing. */
const EDITABLE = "input, textarea, select, [contenteditable]:not([contenteditable='false'])";

function revealFocusedField(): void {
  /* One frame later, so the measurement is taken after the web view has been
     resized rather than against the layout that is about to be replaced. */
  window.requestAnimationFrame(() => {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement)) return;
    if (!active.matches(EDITABLE)) return;
    active.scrollIntoView({
      block: "nearest",
      inline: "nearest",
      behavior: motionIsReduced() ? "auto" : "smooth",
    });
  });
}

export async function startKeyboard(): Promise<() => void> {
  const root = document.documentElement;

  const opened = (info: { keyboardHeight: number }): void => {
    /* Rounded, because a fractional pixel in a custom property is a fractional
       pixel in every calc() that reads it, and none of them want it. */
    root.style.setProperty("--nf-keyboard-inset", `${Math.max(0, Math.round(info.keyboardHeight))}px`);
    root.dataset.keyboard = "open";
    revealFocusedField();
  };

  const closed = (): void => {
    root.style.setProperty("--nf-keyboard-inset", "0px");
    delete root.dataset.keyboard;
  };

  /*
   * Both `will` and `did` are bound on the way up, and they are not
   * duplication. `keyboardWillShow` carries the height early enough that the
   * layout settles in the same frame as the keyboard animates, which is what
   * stops the dock visibly flicking away after the keys arrive. `did` then
   * repeats the reveal once the resize has actually happened, which is the
   * measurement that is true. On Android the two fire almost together and the
   * second call is a no-op; on iOS the gap is the whole animation.
   */
  const handles = await Promise.all([
    Keyboard.addListener("keyboardWillShow", opened),
    Keyboard.addListener("keyboardDidShow", opened),
    Keyboard.addListener("keyboardWillHide", closed),
  ]);

  return () => {
    for (const handle of handles) void handle.remove();
    /* Clear the marker as well as the listeners. A teardown that left
       `data-keyboard="open"` behind would hide the tab bar for good. */
    closed();
  };
}
