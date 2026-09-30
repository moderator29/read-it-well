"use client";

import Link from "next/link";
import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { UiIcon } from "@/design-system/icons/UiIcon";
import {
  clearRecentSearches,
  recentSearchesServerSnapshot,
  recentSearchesSnapshot,
  searchesFor,
  subscribeRecent,
} from "@/lib/search/memory";

/**
 * PICK UP WHERE YOU LEFT OFF (recommendation B2, 30 September 2026).
 *
 * The phone already remembers the last five hunts (`rememberSearch`, written
 * by `SearchMemory` on the results page). This is the reader of that memory:
 * when the search field it names gains focus with nothing typed, a "Recent
 * searches" list opens under it; each row reruns its search in one tap, and a
 * quiet Clear forgets them. Typing closes it (the field is then a new search),
 * and so do Escape and leaving the field.
 *
 * It attaches to an existing field by id rather than owning one, so the
 * three search fields (the results bar, the Stays bar and the Home hero) stay
 * server components and keep working with no script. It sits in the page's
 * flow under the field, not floating over it, so it can never be clipped by
 * the hero plate's rounded frame and never covers the results.
 *
 * Device only: nothing leaves the phone. Nothing renders until there is
 * something remembered for this screen (`/search` or `/stays/search`).
 */
export function RecentSearches({
  inputId,
  path,
  copy,
  className,
}: {
  inputId: string;
  path: "/search" | "/stays/search";
  copy: { title: string; clear: string; clearLabel: string };
  className?: string;
}) {
  const all = useSyncExternalStore(subscribeRecent, recentSearchesSnapshot, recentSearchesServerSnapshot);
  const entries = searchesFor(all, path);
  const [open, setOpen] = useState(false);
  const listId = useId();

  useEffect(() => {
    const input = document.getElementById(inputId);
    if (!(input instanceof HTMLInputElement)) return;
    const panel = () => document.getElementById(listId);
    const sync = () => setOpen(document.activeElement === input && input.value.trim() === "");
    const onFocusOut = (event: FocusEvent) => {
      const next = event.relatedTarget as Node | null;
      if (next && panel()?.contains(next)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    input.setAttribute("aria-controls", listId);
    /* Focused before hydration (a fast tap, autofocus): answer it now. */
    if (document.activeElement === input) sync();
    input.addEventListener("focus", sync);
    input.addEventListener("input", sync);
    input.addEventListener("focusout", onFocusOut);
    input.addEventListener("keydown", onKey);
    return () => {
      input.removeEventListener("focus", sync);
      input.removeEventListener("input", sync);
      input.removeEventListener("focusout", onFocusOut);
      input.removeEventListener("keydown", onKey);
    };
  }, [inputId, listId]);

  useEffect(() => {
    const input = document.getElementById(inputId);
    if (input) input.setAttribute("aria-expanded", open && entries.length > 0 ? "true" : "false");
  }, [inputId, open, entries.length]);

  const shown = open && entries.length > 0;
  return (
    <div
      id={listId}
      className={["nf-recent", className ?? ""].filter(Boolean).join(" ")}
      hidden={!shown}
      data-testid="recent-searches"
      onFocus={() => setOpen(true)}
      onBlur={(event) => {
        const next = event.relatedTarget as Node | null;
        if (next && (event.currentTarget.contains(next) || next === document.getElementById(inputId))) return;
        setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setOpen(false);
          document.getElementById(inputId)?.focus();
        }
      }}
    >
      {shown ? (
        <>
          <div className="nf-recent__head">
            <p className="nf-section-label">{copy.title}</p>
            <button
              type="button"
              className="nf-recent__clear"
              aria-label={copy.clearLabel}
              onClick={() => {
                clearRecentSearches();
                setOpen(false);
                document.getElementById(inputId)?.focus();
              }}
            >
              {copy.clear}
            </button>
          </div>
          <ul className="nf-recent__list">
            {entries.map((entry) => (
              <li key={entry.href}>
                <Link href={entry.href} className="nf-recent__row" onClick={() => setOpen(false)}>
                  <UiIcon name="history" size={18} className="nf-recent__glyph" />
                  <span className="nf-recent__label">{entry.label}</span>
                  <UiIcon name="arrow-right" size={16} className="nf-recent__go" />
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
