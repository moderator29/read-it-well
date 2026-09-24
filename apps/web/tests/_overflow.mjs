/**
 * A horizontal-overflow check that can fail on this product.
 *
 * `document.documentElement.scrollWidth <= innerWidth` CANNOT FAIL HERE: the
 * root and body are `overflow-x: clip` (`src/app/css/base.css`), so nothing
 * that runs past the right edge ever widens the scrollable area. A 200
 * character name ran 1,400px past the viewport and that check still said 390
 * (UI-P2-02). Every "no horizontal scroll" assertion written that way is a
 * light that stays green whatever the page does.
 *
 * This asks the question the clip hides: which VISIBLE elements have a box
 * that crosses the viewport's left or right edge while no ancestor below the
 * root clips or scrolls them. An element inside an `overflow-x: auto` rail or
 * an `overflow: hidden` card is contained on purpose and is not counted (that
 * container is itself measured). Hidden, zero-size, `aria-hidden`, inert and
 * visually-hidden (`sr-only`) elements are skipped. Only the outermost
 * offender of a run is reported, so one long name is one line.
 *
 * `horizontalOverflow` runs IN THE PAGE: pass it to `page.evaluate`, or call
 * `overflowingElements(page)`. It returns `[]` when the page fits.
 */
export function horizontalOverflow() {
  const vw = document.documentElement.clientWidth;
  const root = new Set([document.documentElement, document.body]);
  const containsX = (s) => s === "hidden" || s === "clip" || s === "auto" || s === "scroll";
  const skipped = (el, cs) => {
    if (cs.display === "none" || cs.visibility === "hidden" || cs.visibility === "collapse") return true;
    if (el.closest("[aria-hidden='true'],[inert]")) return true;
    // Visually hidden: the 1px, clipped box the sr-only pattern draws.
    if (cs.position === "absolute" && (cs.clip === "rect(0px, 0px, 0px, 0px)" || cs.clipPath === "inset(50%)")) return true;
    return false;
  };
  const containedBelowRoot = (el) => {
    for (let a = el.parentElement; a && !root.has(a); a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (containsX(cs.overflowX)) return true;
    }
    return false;
  };
  const offenders = [];
  const flagged = new Set();
  for (const el of document.body.querySelectorAll("*")) {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    if (r.right <= vw + 1 && r.left >= -1) continue;
    const cs = getComputedStyle(el);
    if (skipped(el, cs)) continue;
    if (containedBelowRoot(el)) continue;
    if (el.parentElement && flagged.has(el.parentElement)) {
      flagged.add(el);
      continue;
    }
    flagged.add(el);
    const cls = typeof el.className === "string" ? el.className.trim().split(/\s+/).slice(0, 3).join(".") : "";
    offenders.push({
      element: `${el.tagName.toLowerCase()}${cls ? `.${cls}` : ""}`,
      text: (el.textContent || "").trim().slice(0, 60),
      left: Math.round(r.left),
      right: Math.round(r.right),
      viewport: vw,
    });
  }
  return offenders;
}

/** `horizontalOverflow` for a Playwright page. */
export function overflowingElements(page) {
  return page.evaluate(horizontalOverflow);
}
