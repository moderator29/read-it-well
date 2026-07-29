"use client";

import { useRef, type ReactNode } from "react";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * Horizontal snap rail with desktop paging controls.
 *
 * The rail itself is plain CSS scroll snap, so phones swipe natively with no
 * JavaScript in the way. The only client behaviour here is the pair of glass
 * prev and next buttons, which page the rail one card at a time by asking the
 * neighbouring card to scroll itself into view. Children are rendered on the
 * server and passed through untouched.
 */
export function CarouselRail({
  children,
  ariaLabel,
  prevLabel = "Previous",
  nextLabel = "Next",
}: {
  children: ReactNode;
  ariaLabel: string;
  prevLabel?: string;
  nextLabel?: string;
}) {
  const railRef = useRef<HTMLUListElement | null>(null);

  const page = (dir: 1 | -1) => {
    const rail = railRef.current;
    if (!rail) return;
    const cards = Array.from(rail.children) as HTMLElement[];
    if (cards.length === 0) return;

    const railLeft = rail.getBoundingClientRect().left;
    // The next anchor forward is the first card whose left edge sits past the
    // rail's start; backward, the last card whose left edge sits before it.
    const target =
      dir === 1
        ? cards.find((c) => c.getBoundingClientRect().left - railLeft > 8)
        : [...cards].reverse().find((c) => c.getBoundingClientRect().left - railLeft < -8);

    target?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
  };

  return (
    <div className="relative">
      <ul
        ref={railRef}
        aria-label={ariaLabel}
        className="nf-snap-x -mx-5 gap-3 px-5 pb-1 sm:mx-0 sm:gap-4 sm:px-0"
      >
        {children}
      </ul>

      {/* Paging controls. Phones swipe, so these only appear from sm up. */}
      <div className="mt-4 hidden justify-end gap-2 sm:flex">
        <button
          type="button"
          onClick={() => page(-1)}
          aria-label={prevLabel}
          className="nf-icon-btn"
        >
          <UiIcon name="arrow-left" size={18} />
        </button>
        <button
          type="button"
          onClick={() => page(1)}
          aria-label={nextLabel}
          className="nf-icon-btn"
        >
          <UiIcon name="arrow-right" size={18} />
        </button>
      </div>
    </div>
  );
}
