"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UiIcon } from "@/design-system/icons/UiIcon";
import type { DocChapterIndexEntry } from "./chapters";

/**
 * The chapter rail.
 *
 * It lives in the docs layout rather than on a page, so it survives navigation
 * between chapters and the reader keeps their place in the list instead of
 * watching a sidebar rebuild itself twelve times on the way through.
 *
 * ONE list of links, drawn two ways.
 *
 * From `lg` up it is an ordinary sticky column and the opener is not rendered.
 * Below that a phone has no room for a permanent 248px rail, so the same list
 * collapses behind a control that says where you currently are, which is the
 * only thing worth spending a line of a 390px screen on. It is a real button
 * with real state rather than a `<details>` element, because the browsers
 * involved disagree about whether CSS may keep details content visible, and a
 * navigation that vanishes on one engine is not a navigation.
 *
 * Choosing a chapter closes it: the pathname changing is the signal, so it
 * closes on a back gesture too, not only on a tap.
 */
export function DocsSidebar({ items }: { items: DocChapterIndexEntry[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const panelId = useId();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const current = items.find((item) => pathname === `/docs/${item.slug}`);
  const onContents = pathname === "/docs";

  const label = current ? `${current.number}. ${current.title}` : "Contents";

  return (
    <div className="lg:sticky lg:top-24 lg:w-[248px] lg:shrink-0 lg:self-start">
      {/*
        The phone opener, which the contents page itself does not get: that
        page IS the list of chapters, so a control that unfolds the same twelve
        titles above it is one tap to see what is already on screen.
      */}
      {!onContents && (
        <button
          type="button"
          onClick={() => setOpen((was) => !was)}
          aria-expanded={open}
          aria-controls={panelId}
          className="nf-tap flex min-h-11 w-full items-center justify-between gap-3 rounded-[var(--nf-radius-md)] border border-[var(--nf-border-default)] bg-[var(--nf-surface-secondary)] px-4 py-2.5 text-left lg:hidden"
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <UiIcon
              name="panel-left"
              size={16}
              className="shrink-0 text-[var(--nf-content-muted)]"
            />
            <span className="min-w-0 text-[0.875rem] font-semibold text-[var(--nf-content-primary)]">
              {label}
            </span>
          </span>
          <UiIcon
            name="chevron-down"
            size={16}
            className={`shrink-0 text-[var(--nf-content-muted)] transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>
      )}

      {/* ---------------------------------------------------- the list */}
      <nav
        id={panelId}
        aria-label="Documentation chapters"
        className={`${open ? "mt-2 block" : "hidden"} lg:mt-0 lg:block`}
      >
        <p className="nf-overline hidden px-3 pb-2 text-[var(--nf-content-muted)] lg:block">
          Documentation
        </p>
        <ol className="space-y-0.5 rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] bg-[var(--nf-surface-secondary)] p-2 lg:border-0 lg:bg-transparent lg:p-0">
          <li>
            <ChapterLink href="/docs" active={onContents} number={null} title="All chapters" />
          </li>
          {items.map((item) => (
            <li key={item.slug}>
              <ChapterLink
                href={`/docs/${item.slug}`}
                active={pathname === `/docs/${item.slug}`}
                number={item.number}
                title={item.title}
              />
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
}

/**
 * One row.
 *
 * The active row is marked three ways and not one: an electric left rail, a
 * lifted surface, and `aria-current`, so it reads for somebody looking at it,
 * somebody listening to it, and somebody who cannot separate the two blues.
 * The whole row is the target and it is 44px tall, not a 14px word.
 */
function ChapterLink({
  href,
  active,
  number,
  title,
}: {
  href: string;
  active: boolean;
  number: number | null;
  title: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`nf-tap flex min-h-11 items-center gap-2.5 rounded-[var(--nf-radius-sm)] border-l-2 py-2 pr-2.5 pl-2.5 text-[0.8125rem] leading-snug transition-colors ${
        active
          ? "border-l-[var(--nf-electric-300)] bg-[var(--nf-brand-primary-soft)] font-semibold text-[var(--nf-content-primary)]"
          : "border-l-transparent text-[var(--nf-content-secondary)] hover:bg-[var(--nf-glass-fill-thin)] hover:text-[var(--nf-content-primary)]"
      }`}
    >
      {number !== null && (
        <span
          aria-hidden="true"
          className={`nf-numeric w-4 shrink-0 text-right text-[0.6875rem] ${
            active ? "text-[var(--nf-electric-300)]" : "text-[var(--nf-content-muted)]"
          }`}
        >
          {number}
        </span>
      )}
      <span className="min-w-0">{title}</span>
    </Link>
  );
}
