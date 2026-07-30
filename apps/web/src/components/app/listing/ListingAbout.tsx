"use client";

import { useId, useState } from "react";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * About this place.
 *
 * A real disclosure, not a CSS trick: the control is a button carrying
 * `aria-expanded` and pointing at the region it owns, and the rest of the
 * description is genuinely added to the document when it opens. Collapsed, the
 * opening paragraph is clamped to four lines and stays whole in the
 * accessibility tree, so nothing is ever announced as half a sentence or
 * hidden from a screen reader while a sighted reader can see it.
 */
export function ListingAbout({ paragraphs }: { paragraphs: string[] }) {
  const [open, setOpen] = useState(false);
  const regionId = useId();

  const [lead, ...rest] = paragraphs;
  if (!lead) return null;
  const expandable = rest.length > 0;

  return (
    <div data-testid="listing-about">
      <div
        id={regionId}
        className="space-y-3 text-[0.9375rem] leading-relaxed text-[var(--nf-content-secondary)]"
      >
        <p className={expandable && !open ? "line-clamp-4" : undefined}>{lead}</p>
        {open && rest.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      </div>

      {expandable && (
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-controls={regionId}
          data-testid="about-toggle"
          className="mt-2.5 inline-flex items-center gap-1.5 text-[0.875rem] font-semibold text-[var(--nf-content-primary)] underline underline-offset-4 transition-colors hover:text-[var(--nf-brand-primary)]"
        >
          {open ? "Show less" : "Read more"}
          <UiIcon
            name="chevron-down"
            size={15}
            className={`transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      )}
    </div>
  );
}
