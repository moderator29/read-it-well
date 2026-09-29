"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOverlay } from "@/lib/ui/use-overlay";
import { Sheet } from "@/components/ui/Sheet";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { Composer } from "../feed/Composer";
import { LineGlyph, type LineGlyphName } from "../feed/LineGlyph";
import {
  BLOOM_STAGGER_MS,
  bloomSlot,
  bloomTrail,
  bloomTransform,
  isSettled,
  stepSpring,
  type SpringState,
} from "./physics";

/**
 * THE PLUS, AND WHAT BLOOMS OUT OF IT.
 *
 * `GOVERNING-feed-plus-bloom.png` is the law here, and the founder's words
 * were "make it exactly how it is, when clicked it should be exactly like
 * that": a glass circle at the thumb's corner above the dock, and on a tap
 * three glass lozenges thrown out of it on a curve up and to the left, Review
 * nearest, then Story, then Post furthest, each tilted a little more than the
 * last. The motion is a real spring (`./physics`), integrated per frame in
 * JavaScript, so the lozenges overshoot their slot and settle back. Under
 * reduced motion there is no throw: they are simply there, and the product is
 * complete without the physics.
 *
 * Three actions, and each one lands on the real thing:
 *
 *   Post    the existing composer, in the same sheet the old dock used, with
 *           the place picker intact. Say something and Ask a question are
 *           both this composer; the kind is a switch inside it.
 *   Story   `/stories/new`, the existing story composer.
 *   Review  a review is written against a finished stay, so this opens a
 *           picker of the stays that can be reviewed now, read by the server
 *           component above through the same query `/bookings` uses, and each
 *           row lands on the real review form. No reviewable stay is an
 *           honest sheet with the way to the bookings list, not a dead end.
 *
 * Signed out, every action is the sign-in door. The control still renders,
 * because a create button that vanishes for the people deciding whether to
 * join is a control working against itself.
 *
 * The old ring had six petals. Apartment and Place had destinations of their
 * own and both still exist: listing a flat is the agent console's first
 * action and suggesting a place is the directory's, so nothing is lost, only
 * the menu the founder did not draw.
 */

export type BloomArea = { id: string; name: string; city: string };

export type ReviewableStay = {
  bookingId: string;
  title: string;
  dateRange: string;
};

type Action = "post" | "story" | "review";

/*
 * Ordered by distance from the plus, nearest first, which is also the order
 * they open in, the order Tab walks them and the order they stack (the
 * nearest paints on top, as the render lays Review over Story over Post).
 *
 * PLAIN LINE GLYPHS, the founder's ruling for the bloom: a star, a camera and
 * a pencil exactly as his image draws them. The star is `UiIcon`'s; the camera
 * and the pencil are drawn on `UiIcon`'s grid and weight in `LineGlyph` until
 * the set carries them (request FEED-1).
 */
const ACTIONS: {
  key: Action;
  icon: { set: "ui"; name: UiIconName } | { set: "line"; name: LineGlyphName };
  label: string;
}[] = [
  { key: "review", icon: { set: "ui", name: "star" }, label: "Review" },
  { key: "story", icon: { set: "line", name: "camera" }, label: "Story" },
  { key: "post", icon: { set: "line", name: "pencil" }, label: "Post" },
];

/* One plate and its trail at a given progress, written straight to the
   elements. The trail only ever fades in with its plate and is never brighter
   than the plate is out. */
function paint(
  items: (HTMLElement | null)[],
  trails: (SVGPathElement | null)[],
  index: number,
  progress: number,
) {
  const el = items[index];
  if (el) el.style.transform = bloomTransform(bloomSlot(index), progress);
  const trail = trails[index];
  if (trail) trail.style.opacity = String(Math.max(0, Math.min(1, progress)));
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  if (document.documentElement.dataset.reduceMotion === "1") return true;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

export function CreateBloom({
  signedIn,
  areas,
  currentAreaId,
  reviewable,
  initialOpen = false,
}: {
  signedIn: boolean;
  areas: BloomArea[];
  /** Preselected when opened from inside a place. */
  currentAreaId?: string;
  /** Stays this person may review right now. Empty when there are none. */
  reviewable: ReviewableStay[];
  /** Open on mount: the preview harness, and `/around?compose=1` from the dock's Create sheet. */
  initialOpen?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(initialOpen);
  /* The fan stays in the DOM while it folds back in, so the closing spring has
     something to move. `mounted` outlives `open` by one settle. */
  const [mounted, setMounted] = useState(initialOpen);
  const [composing, setComposing] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [picking, setPicking] = useState(false);
  const [areaId, setAreaId] = useState<string | undefined>(currentAreaId);
  /* The composer's words, held here rather than in the composer, because the
     composer unmounts with its sheet and a sheet closes on a drag, a flick or
     Back. A post half-written and closed by accident comes back when the plus
     is opened again; sending one clears it. */
  const [draft, setDraft] = useState("");

  const fabRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const trailRefs = useRef<(SVGPathElement | null)[]>([]);
  /* Born at rest where the harness asks for the open fan, so a proof is the
     settled picture rather than a frame of the throw. */
  const springs = useRef<SpringState[]>(
    ACTIONS.map(() => ({ value: initialOpen ? 1 : 0, velocity: 0 })),
  );
  const frame = useRef<number | null>(null);
  /* The composer's field, so the sheet's first focus is the words rather
     than its Close control. */
  const fieldRef = useRef<HTMLTextAreaElement>(null);

  const close = useCallback(() => setOpen(false), []);
  /* Both hand focus back to the plus. The plate that opened them has left
     with the fan, so the sheet's own return would land on the page body. */
  const closeComposer = useCallback(() => {
    setComposing(false);
    fabRef.current?.focus();
  }, []);
  const closeReview = useCallback(() => {
    setReviewing(false);
    fabRef.current?.focus();
  }, []);

  /* Escape, the Tab trap, the counted scroll lock and the focus return, from
     the one hook every overlay on the platform uses. `autoFocus` is off
     because the fan moves focus itself, to the nearest lozenge, once the
     first one exists. */
  useOverlay({ open, onClose: close, panelRef, autoFocus: false });
  /* The composer and the review picker are the platform's `Sheet`, which
     brings the same hook plus drag and flick to close, Back and the safe
     areas. They were full-page panels of their own with none of the three. */

  /*
   * The spring loop.
   *
   * One requestAnimationFrame loop drives three springs towards 1 (open) or 0
   * (closed), each starting a stagger after the one before it. Styles are
   * written straight to the elements rather than through state, because a
   * re-render per frame for three transforms is work React does not need to
   * do. When the target is 0 and every spring has settled, the fan unmounts.
   */
  useEffect(() => {
    const reduced = prefersReducedMotion();
    const target = open ? 1 : 0;

    if (reduced) {
      /* No throw: the plates are simply where they rest. Painted on the next
         frame rather than now, because on the way open this effect runs
         before the plates it paints have mounted, and a synchronous write
         found no element and left them folded on the plus. */
      springs.current = ACTIONS.map(() => ({ value: target, velocity: 0 }));
      const settle = requestAnimationFrame(() => {
        ACTIONS.forEach((_, i) => paint(itemRefs.current, trailRefs.current, i, target));
        if (!open) setMounted(false);
      });
      return () => cancelAnimationFrame(settle);
    }

    const started = performance.now();
    let last = started;
    const order = open ? [0, 1, 2] : [2, 1, 0];

    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      let settled = true;
      order.forEach((index, position) => {
        if (now - started < position * BLOOM_STAGGER_MS) {
          settled = false;
          return;
        }
        const next = stepSpring(springs.current[index]!, target, dt);
        springs.current[index] = next;
        paint(itemRefs.current, trailRefs.current, index, next.value);
        if (!isSettled(next, target)) settled = false;
      });
      if (settled) {
        frame.current = null;
        if (!open) setMounted(false);
        return;
      }
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
    };
  }, [open]);

  /* Focus lands on the nearest plate once it is in the document. */
  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => itemRefs.current[0]?.focus());
    return () => cancelAnimationFrame(raf);
  }, [open]);

  const choose = (action: Action) => {
    setOpen(false);
    if (!signedIn) {
      router.push("/sign-in");
      return;
    }
    if (action === "story") {
      router.push("/stories/new");
      return;
    }
    if (action === "review") {
      setReviewing(true);
      return;
    }
    setAreaId(currentAreaId);
    setPicking(false);
    setComposing(true);
  };

  const chosen = areas.find((area) => area.id === areaId) ?? null;

  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label="Close"
          className="nf-bloom__scrim"
          onClick={close}
          data-testid="bloom-scrim"
        />
      ) : null}

      <div
        ref={panelRef}
        className="nf-bloom"
        data-open={open ? "" : undefined}
        data-testid="create-bloom"
      >
        <button
          ref={fabRef}
          type="button"
          className="nf-bloom__fab"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls="nf-bloom-menu"
          aria-label={open ? "Close" : "Create something"}
          onClick={() => {
            /* Mount the fan with the tap that opens it, so the spring loop
               finds its plates on its first frame. */
            if (!open) setMounted(true);
            setOpen(!open);
          }}
          data-testid="bloom-fab"
        >
          <UiIcon name="plus" size={32} className="nf-bloom__glyph" />
        </button>

        {mounted ? (
          <div
            id="nf-bloom-menu"
            role="menu"
            aria-label="What do you want to create?"
            className="nf-bloom__fan"
            aria-hidden={!open}
          >
            {/* The trails the render draws behind the throw: one glowing curve
                from each plate's trailing end into the plus. Decoration only. */}
            <svg className="nf-bloom__trails" viewBox="-160 -160 200 200" aria-hidden="true">
              <defs>
                <linearGradient id="nf-bloom-trail" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="currentColor" stopOpacity="0.9" />
                  <stop offset="1" stopColor="currentColor" stopOpacity="0.2" />
                </linearGradient>
              </defs>
              {ACTIONS.map((action, index) => (
                <path
                  key={action.key}
                  ref={(el) => {
                    trailRefs.current[index] = el;
                  }}
                  d={bloomTrail(bloomSlot(index))}
                  className="nf-bloom__trail"
                  style={{ opacity: initialOpen ? 1 : 0 }}
                />
              ))}
            </svg>
            {ACTIONS.map((action, index) => (
              <button
                key={action.key}
                ref={(el) => {
                  itemRefs.current[index] = el;
                }}
                type="button"
                role="menuitem"
                tabIndex={open ? 0 : -1}
                className="nf-bloom__item"
                /* Born on the plus. The spring loop owns the transform from
                   here and writes it straight to the element, so this prop
                   never changes and React never overwrites the loop's work. */
                style={{
                  transform: bloomTransform(bloomSlot(index), initialOpen ? 1 : 0),
                  zIndex: ACTIONS.length - index,
                }}
                onClick={() => choose(action.key)}
                data-testid={`bloom-${action.key}`}
              >
                {action.icon.set === "ui" ? (
                  <UiIcon name={action.icon.name} size={28} className="nf-bloom__icon" />
                ) : (
                  <LineGlyph name={action.icon.name} size={28} className="nf-bloom__icon" />
                )}
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <Sheet
        open={composing}
        onOpenChange={(next) => {
          if (!next) closeComposer();
        }}
        title="Post"
        closeLabel="Close"
        initialFocus={fieldRef}
        fullPage
      >
            <p className="mb-md text-[length:var(--nf-text-caption)] leading-relaxed text-[var(--nf-content-muted)]">
              {picking
                ? "Choose where this belongs"
                : chosen
                  ? `Around ${chosen.name}, ${chosen.city}`
                  : "Everyone on Vallo"}
            </p>

            {picking ? (
              <ul className="flex flex-col gap-xs">
                {/* Everybody, first and always present: the destination that
                    needs no membership, so it is the one a person can always
                    get back to. */}
                <li>
                  <button
                    type="button"
                    className="nf-fab__place"
                    onClick={() => {
                      setAreaId(undefined);
                      setPicking(false);
                    }}
                    data-testid="post-to-everyone"
                  >
                    <span className="nf-fab__place-name">Everyone on Vallo</span>
                    <span className="nf-fab__place-city">Seen in every feed</span>
                  </button>
                </li>
                {areas.map((area) => (
                  <li key={area.id}>
                    <button
                      type="button"
                      className="nf-fab__place"
                      onClick={() => {
                        setAreaId(area.id);
                        setPicking(false);
                      }}
                    >
                      <span className="nf-fab__place-name">Around {area.name}</span>
                      <span className="nf-fab__place-city">{area.city}</span>
                    </button>
                  </li>
                ))}
                {areas.length === 0 ? (
                  <li>
                    <Link href="/around/settings" className="nf-fab__place" onClick={closeComposer}>
                      <span className="nf-fab__place-name">Find a place to join</span>
                      <span className="nf-fab__place-city">Then you can post there too</span>
                    </Link>
                  </li>
                ) : null}
              </ul>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setPicking(true)}
                  className="mb-sm text-[length:var(--nf-text-caption)] font-semibold text-[var(--nf-brand-secondary)]"
                >
                  {chosen ? "Post somewhere else" : "Post in a place instead"}
                </button>

                <Composer
                  areaId={chosen?.id}
                  areaName={chosen?.name}
                  signedIn={signedIn}
                  fieldRef={fieldRef}
                  draft={draft}
                  onDraftChange={setDraft}
                  autoFocus
                  onDone={() => {
                    setComposing(false);
                    router.refresh();
                  }}
                />
              </>
            )}
      </Sheet>

      <Sheet
        open={reviewing}
        onOpenChange={(next) => {
          if (!next) closeReview();
        }}
        title="Review a stay"
        closeLabel="Close"
        fullPage
      >
            <p className="mb-md text-[length:var(--nf-text-caption)] leading-relaxed text-[var(--nf-content-muted)]">
              A review is written against a stay you finished, so it starts from one of them.
            </p>

            {reviewable.length > 0 ? (
              <ul className="flex flex-col gap-xs" data-testid="review-picker">
                {reviewable.map((stay) => (
                  <li key={stay.bookingId}>
                    <Link
                      href={`/bookings/${stay.bookingId}/review`}
                      className="nf-fab__place"
                      onClick={closeReview}
                    >
                      <span className="nf-fab__place-name">{stay.title}</span>
                      <span className="nf-fab__place-city">{stay.dateRange}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="nf-panel nf-panel--card p-lg text-center">
                <div className="mx-auto w-fit">
                  <BrandIcon name="reviews" size={44} />
                </div>
                <h3 className="nf-h3 mt-md text-[length:var(--nf-text-body-lg)]">Nothing to review yet</h3>
                <p className="mx-auto mt-xs max-w-sm text-[length:var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-secondary)]">
                  A stay can be reviewed once you have checked out of it. Your stays, past and
                  coming, are all in one place.
                </p>
                <Link href="/bookings?side=stays&from=stays" className="nf-btn nf-btn--primary mt-lg" onClick={closeReview}>
                  See your stays
                </Link>
              </div>
            )}
      </Sheet>
    </>
  );
}
