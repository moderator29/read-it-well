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
    const fresh = new Set<HTMLElement>();
    for (const record of records) {
      const target = record.target;
      if (!(target instanceof HTMLElement) || !target.classList.contains("nf-field")) continue;
      if (target.getAttribute("aria-invalid") !== "true") {
        target.removeAttribute(REFUSED_ATTRIBUTE);
        continue;
      }
      if (record.oldValue === "true") continue;
      fresh.add(target);
    }
    if (fresh.size === 0) return;
    /*
     * ONE FLUSH FOR THE WHOLE BATCH, NOT TWO PER FIELD. A submit can refuse
     * twenty fields in one callback, and removing, reading a layout property,
     * setting and reading the animations field by field forced a style
     * recalculation each time round (about forty). So: take the marker off all
     * of them, flush once, put it on all of them, then look at what started.
     * Off and on across one flush restarts a shake that is still running.
     */
    for (const target of fresh) target.removeAttribute(REFUSED_ATTRIBUTE);
    void [...fresh][0]!.offsetWidth;
    for (const target of fresh) target.setAttribute(REFUSED_ATTRIBUTE, "");
    /* Where motion is off (reduced motion, Calm, Off) the attribute starts
       nothing, and nothing would clear it: take it back at once, so it cannot
       start a shake later if the setting changes while the field is invalid.
       Only the shake counts: under Calm the invalid border's colour
       transition still runs, and it is in getAnimations() too (auditor A8).
       The first read recalculates style for every field at once; the rest are
       answered from that. */
    for (const target of fresh) {
      if (
        typeof target.getAnimations === "function" &&
        !target.getAnimations().some((a) => (a as CSSAnimation).animationName === "nf-field-refuse")
      ) {
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
