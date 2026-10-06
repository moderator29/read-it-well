/**
 * THE OVERLAYS OPEN RIGHT NOW, oldest first, as a plain module with no React in
 * it so both `use-overlay.ts` (which registers) and `lib/native/back-button.ts`
 * (which asks) can import it, and a Node test can drive it.
 *
 * It used to be a private array inside `use-overlay.ts`, and the Android back
 * button instead read the body scroll lock as a proxy for "an overlay is up".
 * That proxy was fine while every overlay was modal. It is wrong for one that
 * is not (a navigation menu that must not lock the page): such an overlay still
 * wants Escape and Back to close it, but holds no lock for Back to read. So the
 * question is asked of the registry itself, which every overlay joins whether or
 * not it locks anything.
 *
 * A token per open, so a StrictMode double effect removes exactly what it added.
 * Only the top token answers Escape and traps Tab: with a report sheet open over
 * a comments sheet, one Escape used to close both.
 */
const stack: symbol[] = [];

/** Join the stack. Returns the token to pass to `leaveOverlay` and `isTopOverlay`. */
export function joinOverlay(): symbol {
  const token = Symbol("overlay");
  stack.push(token);
  return token;
}

export function leaveOverlay(token: symbol): void {
  const at = stack.indexOf(token);
  if (at !== -1) stack.splice(at, 1);
}

export function isTopOverlay(token: symbol): boolean {
  return stack[stack.length - 1] === token;
}

/** Is any overlay open, modal or not? What the Android back button asks. */
export function overlayIsOpen(): boolean {
  return stack.length > 0;
}
