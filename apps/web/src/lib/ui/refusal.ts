/**
 * THE FIELD'S REFUSAL, AS A MOMENT (MOTION_SYSTEM "Form error": the refused
 * field shakes 4px once on `whip` 160ms; A8 SHOULD 3).
 *
 * The shake used to be keyed on `[aria-invalid="true"]` alone, so it played
 * whenever a field MOUNTED invalid (a server-rendered form coming back with
 * its errors, a re-keyed list, a sheet reopening with its error set), which is
 * not a refusal anybody just made. A refusal is the TRANSITION to invalid
 * after the field is on screen, so that is what this watches for:
 *
 *   - `aria-invalid` going from anything but "true" to "true" on a `.nf-field`
 *     that is already in the document sets `data-refused` (controls.css keys
 *     the shake on it). A field inserted already invalid is a childList
 *     mutation, not an attribute one, and never gets it;
 *   - `data-refused` is cleared when the shake ends, and when the field stops
 *     being invalid, so clearing and refusing again plays it again.
 *
 * It watches the document rather than being wired into one component because
 * the field is not one component: `Field`'s controls and some twenty forms set
 * `aria-invalid` on a `.nf-field` themselves, and all of them should answer
 * the same way. The sign-in screens keep their own shake (controls.css leaves
 * `.nf-auth` out). Reduced motion, Calm and Off draw no animation, so there is
 * nothing for the attribute to start.
 */
export const REFUSED_ATTRIBUTE = "data-refused";

export function watchRefusals(doc: Document = document): () => void {
  if (typeof MutationObserver === "undefined" || !doc.body) return () => {};
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      const target = record.target;
      if (!(target instanceof HTMLElement) || !target.classList.contains("nf-field")) continue;
      if (target.getAttribute("aria-invalid") !== "true") {
        target.removeAttribute(REFUSED_ATTRIBUTE);
        continue;
      }
      if (record.oldValue === "true") continue;
      /* Off and on in one frame restarts the animation if one is still running. */
      target.removeAttribute(REFUSED_ATTRIBUTE);
      void target.offsetWidth;
      target.setAttribute(REFUSED_ATTRIBUTE, "");
      /* Where motion is off (reduced motion, Calm, Off) the attribute starts
         nothing, and nothing would clear it: take it back at once, so it cannot
         start a shake later if the setting changes while the field is invalid. */
      if (typeof target.getAnimations === "function" && target.getAnimations().length === 0) {
        target.removeAttribute(REFUSED_ATTRIBUTE);
      }
    }
  });
  observer.observe(doc.body, {
    subtree: true,
    attributes: true,
    attributeFilter: ["aria-invalid"],
    attributeOldValue: true,
  });
  const onEnd = (event: AnimationEvent) => {
    if (event.animationName === "nf-field-refuse" && event.target instanceof HTMLElement) {
      event.target.removeAttribute(REFUSED_ATTRIBUTE);
    }
  };
  doc.addEventListener("animationend", onEnd, true);
  doc.addEventListener("animationcancel", onEnd, true);
  return () => {
    observer.disconnect();
    doc.removeEventListener("animationend", onEnd, true);
    doc.removeEventListener("animationcancel", onEnd, true);
  };
}
