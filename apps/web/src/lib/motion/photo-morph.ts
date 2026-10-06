/**
 * WHICH LISTING'S PHOTO IS IN FLIGHT (motion sweep, 29 September 2026).
 *
 * A listing card names its photo box when it is tapped (ListingCard.tsx), and
 * the detail gallery names its lead pane to match (ListingGallery.tsx). The
 * gallery should only do that when a card really did start the flight: a
 * named pane with no partner arrives as a lone group that fades in place
 * while the rest of the page slides, which looks like a fault.
 *
 * Module state rather than storage: the card and the gallery live in the same
 * client bundle, and a hard load, which has no card, starts it empty.
 *
 * ONE PHOTOGRAPH, BOTH WAYS, ON THE COMPOSITOR (round 5, the listing opens).
 * Left to the browser, the pair was animated by its own keyframes: `width`
 * and `height` on the group, 250ms on the browser's default curve, which is
 * main-thread work at the exact moment the main thread is busy building the
 * listing, and a different length from the page around it (380ms). Now the
 * module knows both ends, so the stylesheet can fly the group with one
 * `transform` (route-motion.css, `nf-morph-fly`):
 *
 *   lift     the tap: the card's photo box is measured and named. The root
 *            carries `data-nav-morph="lift"` until the far end is known.
 *   open     the hero has committed (a layout effect, inside the view
 *            transition's update, before the browser captures the new
 *            state): it is named, and where the photo starts is written on
 *            the root as `--nf-morph-x`, `--nf-morph-y` (the card's corner)
 *            and `--nf-morph-s` (card width over hero width). The group flies
 *            from there to its own place, one uniform scale, never squashed.
 *   return   the in-app back (`animateBack`): the hero is measured and named
 *            before the old page is captured, and the card it came from is
 *            named once the page under it has committed (nav-origin's
 *            `prepareReturn`). The same keyframe flies it home.
 *
 * Until a far end is known the root says `lift`, and the stylesheet flies
 * nothing on `lift`: a photo with no partner fades where it is.
 *
 * NAMES ARE LENT, NEVER KEPT (nav-origin.ts explains why). Every name this
 * module writes comes off when the transition has finished, or after a
 * ceiling.
 */

type Box = { x: number; y: number; width: number; height: number };

let inFlight: { id: string; at: number; from: Box | null; back: boolean } | null = null;
/* The listing a card last opened, so the in-app back can fold into it. */
let openedId: string | null = null;
const named = new Set<HTMLElement>();
let clearTimer: ReturnType<typeof setTimeout> | undefined;

const WINDOW_MS = 1500;
/* How long a tap may wait for its page and still fly. Measured: on a phone
   whose link was prefetched the first frame commits in about 120ms; on a
   congested network with nothing prefetched it can be seconds, and the card
   is still on screen all that time. The same ceiling nav-origin keeps. */
const AIM_WINDOW_MS = 8000;
const CEILING_MS = 8000;
const ATTR = "data-nav-morph";

export function morphName(id: string): string {
  return `listing-photo-${id}`;
}

function boxOf(el: Element): Box {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, width: r.width, height: r.height };
}

function lendName(el: HTMLElement, id: string): void {
  el.style.setProperty("view-transition-name", morphName(id));
  named.add(el);
}

/** Take every lent name back and clear the root. */
export function settlePhotoMorph(): void {
  if (clearTimer) clearTimeout(clearTimer);
  clearTimer = undefined;
  bound = null;
  for (const el of named) el.style.removeProperty("view-transition-name");
  named.clear();
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.removeAttribute(ATTR);
  for (const v of ["--nf-morph-x", "--nf-morph-y", "--nf-morph-s"]) root.style.removeProperty(v);
}

function settleLater(): void {
  if (clearTimer) clearTimeout(clearTimer);
  clearTimer = setTimeout(settlePhotoMorph, CEILING_MS);
}

type Running = { finished: Promise<unknown> };
/* The transition the in-app back started (`animateBack` binds it), so the
   return is settled by its own end and never by an older one. */
let bound: Running | null = null;

/** The in-app back's own transition, for the return it carries. */
export function bindPhotoMorph(vt: unknown): void {
  if (vt && typeof (vt as Running).finished?.then === "function") bound = vt as Running;
}

/**
 * Once the running view transition has finished, or at the ceiling. The
 * standard `activeViewTransition` where the browser has it; else the one the
 * back bound; else React's own (`__reactViewTransition`, the navigation it
 * is running). With none of those this is not inside a transition at all
 * (the page streaming in over its loading shell) and nothing needs a name.
 */
function settleAfterTransition(): void {
  const doc = document as Document & {
    activeViewTransition?: Running | null;
    __reactViewTransition?: Running | null;
  };
  const vt = doc.activeViewTransition ?? bound ?? doc.__reactViewTransition;
  settleLater();
  if (vt?.finished) vt.finished.then(settlePhotoMorph, settlePhotoMorph);
}

function writeFlight(from: Box, to: Box, kind: "open" | "return"): void {
  const root = document.documentElement;
  const s = Math.round((from.width / to.width) * 10000) / 10000;
  root.style.setProperty("--nf-morph-x", `${Math.round(from.x)}px`);
  root.style.setProperty("--nf-morph-y", `${Math.round(from.y)}px`);
  root.style.setProperty("--nf-morph-s", String(s));
  root.setAttribute(ATTR, kind);
}

/**
 * The tap. `media` is the card's photo box; without one (PostCard, which
 * names its own) only the window is opened, as before.
 */
export function startPhotoMorph(id: string, media?: HTMLElement | null): void {
  inFlight = { id, at: Date.now(), from: media ? boxOf(media) : null, back: false };
  if (!media || typeof document === "undefined") return;
  settlePhotoMorph();
  openedId = id;
  lendName(media, id);
  document.documentElement.setAttribute(ATTR, "lift");
  settleLater();
}

export function isPhotoMorphFor(id: string): boolean {
  return inFlight !== null && inFlight.id === id && Date.now() - inFlight.at < WINDOW_MS;
}

/**
 * The hero has committed: name it and aim the flight at it. Called from the
 * arriving page's layout effect (the gallery, or the loading shell when the
 * page is not ready yet). False when no card started this flight.
 */
export function aimPhotoMorph(target: HTMLElement | null, id: string): boolean {
  const f = inFlight;
  if (!target || !f || f.back || f.id !== id || !f.from || Date.now() - f.at > AIM_WINDOW_MS) return false;
  const to = boxOf(target);
  if (to.width === 0 || to.height === 0) return false;
  lendName(target, id);
  writeFlight(f.from, to, "open");
  settleAfterTransition();
  return true;
}

/**
 * THE WAY BACK, first half: before the in-app back captures the page being
 * left. The hero of the listing a card opened is measured and named, if it is
 * still on screen (scrolled away, there is nothing to fold and the page simply
 * shrinks into the card).
 */
export function liftReturnPhoto(): boolean {
  const id = openedId;
  if (!id || typeof document === "undefined") return false;
  const hero = [...document.querySelectorAll<HTMLElement>("[data-morph-hero]")].find(
    (el) => el.dataset.morphHero === id,
  );
  if (!hero) return false;
  const from = boxOf(hero);
  if (from.width === 0 || from.y + from.height <= 0 || from.y >= window.innerHeight) return false;
  settlePhotoMorph();
  inFlight = { id, at: Date.now(), from, back: true };
  lendName(hero, id);
  document.documentElement.setAttribute(ATTR, "lift");
  settleLater();
  return true;
}

/**
 * Second half: the page coming back has committed and nav-origin has found
 * the card it was opened from. Its photo box takes the name and the flight
 * is aimed at it.
 */
export function landReturnPhoto(card: Element): boolean {
  const f = inFlight;
  if (!f || !f.back || !f.from) return false;
  const media = [...card.querySelectorAll<HTMLElement>("[data-morph-id]")].find((el) => el.dataset.morphId === f.id);
  if (!media) return false;
  const to = boxOf(media);
  if (to.width === 0) return false;
  inFlight = null;
  openedId = null;
  lendName(media, f.id);
  writeFlight(f.from, to, "return");
  settleAfterTransition();
  return true;
}

/** Tests only. */
export function __resetPhotoMorph(): void {
  settlePhotoMorph();
  inFlight = null;
  openedId = null;
}
