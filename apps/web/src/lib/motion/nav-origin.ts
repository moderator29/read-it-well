/**
 * THE PAGE GROWS OUT OF WHAT YOU TAPPED (motion sweep 2, 30 September 2026).
 *
 * The first sweep gave every navigation a direction. The founder still did not
 * feel it: a card, a row, a tile and a dock icon all produced the same small
 * slide, wherever they sat on the screen. Native apps answer a tap from the
 * place it happened. This module remembers that place and hands it to the
 * route transition (`app/css/route-motion.css`):
 *
 *   point    every tap that becomes a navigation. The incoming page scales up
 *            from the tapped element's centre (`--nf-tap-x`, `--nf-tap-y`), so
 *            a card on the right of a grid opens from the right, and a row at
 *            the bottom of a list opens from the bottom.
 *   expand   the tapped element is a card or a row (big enough to read as a
 *            container). It is named `nf-origin` for the one navigation, so the
 *            browser lifts its snapshot out of the old page and the stylesheet
 *            grows it toward the screen and dissolves it into the new page: a
 *            container transform, transform and opacity only.
 *   return   the in-app back (`animateBack`) finds the element the page was
 *            opened from, names it in the page coming back, and the page being
 *            left shrinks into it while the element settles into place.
 *
 * NAMES ARE LENT, NEVER KEPT. A permanent `view-transition-name` on a card
 * would be a duplicate the moment the same listing appeared twice, and one
 * duplicate aborts every view transition on the page. The name goes on at the
 * tap and comes off once the next page has settled, or after a ceiling.
 *
 * Nothing here runs under Calm, Off, the operating system's reduced motion or
 * data saver: `originAllowed` says no and the route falls back to its plain
 * fade (Calm) or to nothing (Off, reduced).
 */

export type Rect = { x: number; y: number; width: number; height: number };
export type Viewport = { width: number; height: number };
export type OriginKind = "point" | "expand";

/** The name lent to the tapped element (and, going back, to its return). */
export const ORIGIN_NAME = "nf-origin";

/*
 * A tap is a container when the thing tapped is at least this big: a listing
 * card, an inbox row, a settings row, a home tile. An icon, a chip or a text
 * link is not, and growing a 40px glyph to the width of the screen would read
 * as a glitch; those open from their point instead.
 */
const MIN_EXPAND_WIDTH = 120;
const MIN_EXPAND_HEIGHT = 44;
/* Nor is something that is already most of the screen: it has nowhere to grow. */
const MAX_EXPAND_AREA = 0.6;
/* The dissolving snapshot never grows past this, so a small card does not
   become a smeared bitmap on its way out. */
const MAX_EXPAND_SCALE = 2.4;

export function originKind(rect: Rect, viewport: Viewport): OriginKind {
  if (rect.width < MIN_EXPAND_WIDTH || rect.height < MIN_EXPAND_HEIGHT) return "point";
  if (rect.width * rect.height > viewport.width * viewport.height * MAX_EXPAND_AREA) return "point";
  return "expand";
}

/** The centre of the element, kept on screen (a card half scrolled away). */
export function originPoint(rect: Rect, viewport: Viewport): { x: number; y: number } {
  const clamp = (v: number, max: number) => Math.round(Math.min(Math.max(v, 0), max));
  return {
    x: clamp(rect.x + rect.width / 2, viewport.width),
    y: clamp(rect.y + rect.height / 2, viewport.height),
  };
}

/**
 * Where the dissolving snapshot travels: its centre moves to the middle of
 * the screen, a little above centre where the new page's content starts, and
 * it grows toward the screen's width.
 */
export function expandMove(rect: Rect, viewport: Viewport): { dx: number; dy: number; scale: number } {
  const scale = Math.min(MAX_EXPAND_SCALE, Math.max(1, viewport.width / Math.max(rect.width, 1)));
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  return {
    dx: Math.round(viewport.width / 2 - cx),
    dy: Math.round(viewport.height * 0.42 - cy),
    scale: Math.round(scale * 1000) / 1000,
  };
}

/* ------------------------------------------------------------ the gates */

export function originAllowed(): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  const root = document.documentElement;
  const level = root.dataset.motion;
  if (level === "calm" || level === "off") return false;
  if (root.dataset.saveData === "on") return false;
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  } catch {
    return false;
  }
  return true;
}

/* -------------------------------------------------------------- the state */

type Pending = {
  kind: OriginKind;
  rect: Rect;
  /** The path the tap happened on and the href it went to. */
  from: string;
  href: string;
  at: number;
};

/* The last tap anywhere, for a button that navigates with `router.push`
   rather than a link. Read only when a page actually arrives soon after. */
let lastTap: { rect: Rect; from: string; at: number } | null = null;
let pending: Pending | null = null;
let named: HTMLElement | null = null;
let clearTimer: ReturnType<typeof setTimeout> | undefined;
/* The page opened from an origin, so the in-app back can return into it. */
let opened: { from: string; to: string; href: string } | null = null;

const TAP_FRESH_MS = 1200;
const NAME_CEILING_MS = 8000;
const SETTLE_MS = 700;
const ATTR = "data-nav-origin";

function rectOf(el: Element): Rect {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, width: r.width, height: r.height };
}

function viewport(): Viewport {
  return { width: window.innerWidth, height: window.innerHeight };
}

function unname(): void {
  if (named) named.style.removeProperty("view-transition-name");
  named = null;
}

function lend(el: HTMLElement): void {
  unname();
  /* A card whose photograph has a morph of its own (the listing card and
     the gallery, `.nf-vt-morph`) keeps that one: two lifts from one card
     read as the card coming apart. It still opens from its point. */
  if (el.style.viewTransitionName || el.querySelector(".nf-vt-morph")) return;
  el.style.setProperty("view-transition-name", ORIGIN_NAME);
  named = el;
}

function clearAfter(ms: number): void {
  if (clearTimer) clearTimeout(clearTimer);
  clearTimer = setTimeout(() => {
    unname();
    document.documentElement.removeAttribute(ATTR);
  }, ms);
}

/**
 * The element a tap belongs to: the card, row or tile, not the icon or the
 * word inside it. A component can point at a larger container with
 * `data-nav-origin-box` on an ancestor of the link.
 */
export function originElement(anchor: Element): HTMLElement | null {
  const box = anchor.closest("[data-nav-origin-box]");
  const el = box ?? anchor;
  return el instanceof HTMLElement ? el : null;
}

/** Any tap: remembered for a moment in case a `router.push` follows it. */
export function noteTap(target: Element): void {
  const el = target.closest("a[href], button, [role='button'], [role='link'], [role='tab'], [role='menuitem']");
  if (!el) return;
  lastTap = { rect: rectOf(el), from: window.location.pathname, at: Date.now() };
}

/**
 * A tap on an in-app link that leads to another page, in the same stack
 * (forward). Called by the route transition's click listener, before the
 * router starts, so the name is on the element when the old page is captured.
 */
export function captureOrigin(anchor: HTMLAnchorElement, url: URL): void {
  if (!originAllowed()) return;
  if (url.pathname === window.location.pathname) return;
  const el = originElement(anchor);
  if (!el) return;
  const rect = rectOf(el);
  if (rect.width === 0 || rect.height === 0) return;
  const kind = originKind(rect, viewport());
  pending = { kind, rect, from: window.location.pathname, href: anchor.getAttribute("href") ?? url.pathname, at: Date.now() };
  if (kind === "expand") lend(el);
  else unname();
  clearAfter(NAME_CEILING_MS);
}

function setVars(point: { x: number; y: number }, move: { dx: number; dy: number; scale: number } | null): void {
  const s = document.documentElement.style;
  s.setProperty("--nf-tap-x", `${point.x}px`);
  s.setProperty("--nf-tap-y", `${point.y}px`);
  if (move) {
    s.setProperty("--nf-origin-dx", `${move.dx}px`);
    s.setProperty("--nf-origin-dy", `${move.dy}px`);
    s.setProperty("--nf-origin-scale", String(move.scale));
  }
}

/**
 * The new page has committed (a layout effect, inside the view transition's
 * update, before the browser captures the new state): write where the page
 * should grow from. `path` is the page that just arrived.
 */
let lastApplied: { path: string; at: number } | null = null;

export function applyOrigin(path: string, direction: string | undefined): void {
  if (typeof document === "undefined") return;
  const now = Date.now();
  /* A move between route groups mounts two templates in one commit (the
     root's and the group's); the first one answers for both. */
  if (lastApplied && lastApplied.path === path && now - lastApplied.at < 250) return;
  lastApplied = { path, at: now };
  const root = document.documentElement;
  let p = pending;
  pending = null;
  if (!p && lastTap && now - lastTap.at < TAP_FRESH_MS && lastTap.from !== path) {
    p = { kind: "point", rect: lastTap.rect, from: lastTap.from, href: path, at: lastTap.at };
  }
  lastTap = null;
  /* No origin this time: the record of where the last page opened from is
     kept, because `prepareReturn` checks both ends of it before using it. */
  if (!p || p.from === path || !originAllowed() || direction === "back" || direction === "tab") return;
  const vp = viewport();
  setVars(originPoint(p.rect, vp), p.kind === "expand" ? expandMove(p.rect, vp) : null);
  root.setAttribute(ATTR, p.kind);
  opened = { from: p.from, to: path, href: p.href };
  clearAfter(NAME_CEILING_MS);
}

/** The page has arrived and its transition has begun: tidy up soon. */
export function settleOrigin(): void {
  if (typeof document === "undefined") return;
  if (!document.documentElement.hasAttribute(ATTR) && !named) return;
  const vt = (document as Document & { activeViewTransition?: { finished: Promise<unknown> } | null }).activeViewTransition;
  if (vt?.finished) {
    const done = () => clearAfter(0);
    vt.finished.then(done, done);
    return;
  }
  clearAfter(SETTLE_MS);
}

/**
 * GOING BACK INTO THE ORIGIN. Called by `animateBack` inside its view
 * transition, once the traversal has committed. If the page being left was
 * opened from an element on the page now showing, that element is named in
 * the new state and the stylesheet shrinks the old page into it.
 */
export function returnPending(leaving: string): boolean {
  return opened !== null && opened.to === leaving && originAllowed();
}

export function prepareReturn(leaving: string): boolean {
  const o = opened;
  if (!o || o.to !== leaving || !originAllowed()) return false;
  if (window.location.pathname !== o.from) return false;
  let el: HTMLElement | null = null;
  for (const a of document.querySelectorAll<HTMLAnchorElement>("a[href]")) {
    if (a.getAttribute("href") !== o.href) continue;
    const candidate = originElement(a);
    if (!candidate) continue;
    const r = candidate.getBoundingClientRect();
    if (r.width > 0 && r.bottom > 0 && r.top < window.innerHeight) {
      el = candidate;
      break;
    }
  }
  /* Not drawn yet (the page is still committing): the caller may ask again. */
  if (!el) return false;
  opened = null;
  const rect = rectOf(el);
  const vp = viewport();
  const kind = originKind(rect, vp);
  setVars(originPoint(rect, vp), kind === "expand" ? expandMove(rect, vp) : null);
  if (kind === "expand") lend(el);
  document.documentElement.setAttribute(ATTR, kind === "expand" ? "return" : "return-point");
  clearAfter(SETTLE_MS + 400);
  return true;
}
