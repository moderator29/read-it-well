"use client";

import { useId, useState } from "react";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * The right-hand rail: the headings of the chapter you are reading.
 *
 * Built from the same `sections` array the article renders, so a heading can
 * never appear in one and not the other. There is no scroll spy: a highlight
 * racing the reader down the page is a decoration, and on a phone it is a
 * scroll listener nobody asked to pay for.
 *
 * From `xl` up it sits to the right of the article and sticks. Below that it
 * folds behind one row, for the same reason the chapter rail does: eleven
 * headings is 480 pixels of list standing between somebody and the first
 * sentence of the chapter they opened. Folded, it costs one line and is still
 * there when they want it.
 *
 * It is placed after the chapter heading rather than before it, so the reading
 * order on a phone is title, what the chapter covers, then the contents.
 */
export function OnThisPage({ sections }: { sections: { id: string; heading: string }[] }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  // One heading is not a contents list, it is the chapter.
  if (sections.length < 2) return null;

  return (
    <nav
      aria-label="On this page"
      className="min-w-0 xl:sticky xl:top-24 xl:w-[196px] xl:shrink-0 xl:self-start"
    >
      {/* --------------------------------------------------- phone opener */}
      <button
        type="button"
        onClick={() => setOpen((was) => !was)}
        aria-expanded={open}
        aria-controls={panelId}
        className="nf-tap flex min-h-11 w-full items-center justify-between gap-row rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] bg-[var(--nf-surface-secondary)] px-group py-inline text-left xl:hidden"
      >
        <span className="flex items-center gap-inline">
          <UiIcon name="document" size={16} className="text-[var(--nf-content-muted)]" />
          <span className="text-[0.8125rem] font-semibold text-[var(--nf-content-primary)]">
            On this page
          </span>
          <span className="nf-numeric text-[0.75rem] text-[var(--nf-content-muted)]">
            {sections.length}
          </span>
        </span>
        <UiIcon
          name="chevron-down"
          size={16}
          className={`shrink-0 text-[var(--nf-content-muted)] transition-transform duration-[var(--nf-duration-base)] ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* ---------------------------------------------------- the headings */}
      <div id={panelId} className={`${open ? "mt-inline block" : "hidden"} xl:mt-0 xl:block`}>
        <p className="nf-overline hidden items-center gap-inline text-[var(--nf-content-muted)] xl:flex">
          <UiIcon name="document" size={16} />
          On this page
        </p>
        <ul className="mt-inline space-y-inline-tight border-l border-[var(--nf-border-subtle)]">
          {sections.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                onClick={() => setOpen(false)}
                className="nf-tap -ml-px flex min-h-11 items-center border-l-2 border-transparent py-inline pl-row text-[0.8125rem] leading-snug text-[var(--nf-content-secondary)] transition-colors hover:border-l-[var(--nf-brand-secondary)] hover:text-[var(--nf-content-primary)]"
              >
                {section.heading}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
