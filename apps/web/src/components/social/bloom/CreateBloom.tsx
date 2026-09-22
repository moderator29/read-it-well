"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOverlay } from "@/lib/ui/use-overlay";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { Composer } from "../feed/Composer";
import {
  BLOOM_STAGGER_MS,
  bloomSlot,
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
 * they open in. The glyphs are the stroked UiIcon tier, as the render shows
 * line glyphs: a pencil and a camera are drawn there and the platform's set
 * has neither yet, so a post is the speech glyph and a story is the picture
 * glyph until the two are cut.
 */
const ACTIONS: { key: Action; icon: UiIconName; label: string }[] = [
  { key: "review", icon: "star", label: "Review" },
  { key: "story", icon: "picture", label: "Story" },
  { key: "post", icon: "chat-bubble", label: "Post" },
];

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
  /** The preview harness opens it on mount so the fan can be photographed. */
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

  const fabRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const springs = useRef<SpringState[]>(ACTIONS.map(() => ({ value: 0, velocity: 0 })));
  const frame = useRef<number | null>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const reviewRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);
  const closeComposer = useCallback(() => setComposing(false), []);
  const closeReview = useCallback(() => setReviewing(false), []);

  /* Escape, the Tab trap, the counted scroll lock and the focus return, from
     the one hook every overlay on the platform uses. `autoFocus` is off
     because the fan moves focus itself, to the nearest lozenge, once the
     first one exists. */
  useOverlay({ open, onClose: close, panelRef, autoFocus: false });
  useOverlay({ open: composing, onClose: closeComposer, panelRef: composerRef });
  useOverlay({ open: reviewing, onClose: closeReview, panelRef: reviewRef });

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
    if (open) setMounted(true);
    const reduced = prefersReducedMotion();
    const target = open ? 1 : 0;

    if (reduced) {
      springs.current = ACTIONS.map(() => ({ value: target, velocity: 0 }));
      itemRefs.current.forEach((el, i) => {
        if (el) el.style.transform = bloomTransform(bloomSlot(i), target);
      });
      if (!open) setMounted(false);
      return;
    }

    const started = performance.now();
    let last = started;
    const order = open ? [0, 1, 2] : [2, 1, 0];

    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      let settled = true;
      order.forEach((index, position) => {
        const el = itemRefs.current[index];
        if (now - started < position * BLOOM_STAGGER_MS) {
          settled = false;
          return;
        }
        const next = stepSpring(springs.current[index]!, target, dt);
        springs.current[index] = next;
        if (el) el.style.transform = bloomTransform(bloomSlot(index), next.value);
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

  /* Focus lands on the nearest lozenge once it is in the document. */
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
          onClick={() => setOpen((value) => !value)}
          data-testid="bloom-fab"
        >
          <UiIcon name="plus" size={28} className="nf-bloom__glyph" />
        </button>

        {mounted ? (
          <div
            id="nf-bloom-menu"
            role="menu"
            aria-label="What do you want to create?"
            className="nf-bloom__fan"
            aria-hidden={!open}
          >
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
                style={{ transform: bloomTransform(bloomSlot(index), 0) }}
                onClick={() => choose(action.key)}
                data-testid={`bloom-${action.key}`}
              >
                <UiIcon name={action.icon} size={18} />
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {composing ? (
        <div className="nf-social-sheet" role="dialog" aria-modal="true" aria-label="Post">
          <div ref={composerRef} className="nf-social-sheet__panel">
            <header className="mb-md flex items-start justify-between gap-sm">
              <div className="min-w-0">
                <h2 className="nf-h3 text-[length:var(--nf-text-body-lg)]">Post</h2>
                <p className="mt-2xs text-[length:var(--nf-text-caption)] leading-relaxed text-[var(--nf-content-muted)]">
                  {picking
                    ? "Choose where this belongs"
                    : chosen
                      ? `Around ${chosen.name}, ${chosen.city}`
                      : "Everyone on Vallo"}
                </p>
              </div>
              <button
                type="button"
                onClick={closeComposer}
                aria-label="Close"
                className="nf-post__act shrink-0"
              >
                <UiIcon name="close" size={20} />
              </button>
            </header>

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
                  autoFocus
                  onDone={() => {
                    setComposing(false);
                    router.refresh();
                  }}
                />
              </>
            )}
          </div>
        </div>
      ) : null}

      {reviewing ? (
        <div className="nf-social-sheet" role="dialog" aria-modal="true" aria-label="Review a stay">
          <div ref={reviewRef} className="nf-social-sheet__panel">
            <header className="mb-md flex items-start justify-between gap-sm">
              <div className="min-w-0">
                <h2 className="nf-h3 text-[length:var(--nf-text-body-lg)]">Review a stay</h2>
                <p className="mt-2xs text-[length:var(--nf-text-caption)] leading-relaxed text-[var(--nf-content-muted)]">
                  A review is written against a stay you finished, so it starts from one of them.
                </p>
              </div>
              <button
                type="button"
                onClick={closeReview}
                aria-label="Close"
                className="nf-post__act shrink-0"
              >
                <UiIcon name="close" size={20} />
              </button>
            </header>

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
              <div className="nf-card nf-social-card p-lg text-center">
                <div className="mx-auto w-fit">
                  <BrandIcon name="reviews" size={44} />
                </div>
                <h3 className="nf-h3 mt-md text-[length:var(--nf-text-body-lg)]">Nothing to review yet</h3>
                <p className="mx-auto mt-xs max-w-sm text-[length:var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-secondary)]">
                  A stay can be reviewed once you have checked out of it. Your stays, past and
                  coming, are all in one place.
                </p>
                <Link href="/bookings" className="nf-btn nf-btn--primary mt-lg" onClick={closeReview}>
                  See your stays
                </Link>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
