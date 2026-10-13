"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
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
 * KEYBOARD AND SCREEN READER (W12, A8). The field is a plain search field and
 * the list is a list of links, not a combobox, so nothing here claims otherwise.
 * TAB REACHES EVERY ROW. The submit button and the filters control sit between
 * the field and the list in document order, and the list used to close the
 * moment focus left the field for them, so Tab never arrived (A8: "unreachable
 * by keyboard"). The list now stays open while focus is anywhere from the field
 * to the list (the field, what sits between, the list itself), so Tab walks
 * field, submit, filters, Clear, then each row, each with the shared focus ring;
 * it closes once focus leaves that stretch. ArrowDown from the field is the
 * shortcut to the first row (ArrowDown and ArrowUp then walk the rows; ArrowUp
 * off the first returns to the field), and Escape from any of them closes the
 * list and puts focus back in the field. The list is named by its title
 * (`aria-labelledby`), and while it is shown the field's `aria-describedby`
 * names the title too, so "Recent searches" is read with the field the moment
 * it appears and again on entering the list.
 *
 * It attaches to an existing field by id rather than owning one, so the
 * three search fields (the results bar, the Stays bar and the Home hero) stay
 * server components and keep working with no script. It sits in the page's
 * flow under the field, not floating over it, so it can never be clipped by
 * the hero plate's rounded frame and never covers the results. On the
 * results bar (`/search`) it floats instead (catalogue.css, round 5): there
 * the flow made the results jump twice per search, under the thumb.
 *
 * Device only: nothing leaves the phone. Nothing renders until there is
 * something remembered for this screen (`/search` or `/stays/search`).
 */
/**
 * THE PALETTE (the founder's `command-search-palette.jpg`, 7 October, and
 * ONE-PRODUCT-DECISIONS recommendation 4, "one search"). When a page passes
 * `palette`, the panel is no longer only the remembered searches on an empty
 * field: it opens on focus and stays while somebody types, as one card of
 * rows, each a small glyph tile and a label. Typing filters it: the first row
 * is what Enter will do (searching the words, with every filter the bar
 * already carries), drawn on the soft fill with the return hint, then the
 * same words as a rental and as a purchase, then the remembered searches
 * that contain them. Every row is a real destination; nothing is suggested
 * that the catalogue was not asked for. Without `palette` the panel is
 * exactly what it was.
 */
export type PaletteCopy = {
  label: string;
  searchFor: string;
  rentIn: string;
  buyIn: string;
  enter: string;
};

export function RecentSearches({
  inputId,
  path,
  copy,
  className,
  palette,
}: {
  inputId: string;
  path: "/search" | "/stays/search";
  copy: { title: string; clear: string; clearLabel: string };
  className?: string;
  palette?: PaletteCopy;
}) {
  const all = useSyncExternalStore(subscribeRecent, recentSearchesSnapshot, recentSearchesServerSnapshot);
  const entries = searchesFor(all, path);
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const listId = useId();
  const titleId = useId();
  /* Set when focus is sent back to the field on purpose (Escape, Clear): the
     field's own focus handler would otherwise read "focused and empty" and
     open the list again at once. Typing or leaving the field ends it. */
  const dismissed = useRef(false);

  useEffect(() => {
    const input = document.getElementById(inputId);
    if (!(input instanceof HTMLInputElement)) return;
    const panel = () => document.getElementById(listId);
    const rows = () => Array.from(panel()?.querySelectorAll<HTMLElement>("a.nf-recent__row") ?? []);
    /* The stretch focus may travel without closing the list: the field, the
       list, and whatever sits between them in document order (submit, filters). */
    const withOffer = (node: Node | null) => {
      const list = panel();
      if (!node || !list) return false;
      if (node === input || list.contains(node)) return true;
      return (
        (input.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0 &&
        (list.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_PRECEDING) !== 0
      );
    };
    const sync = () => {
      if (dismissed.current) {
        dismissed.current = false;
        return;
      }
      setTyped(input.value.trim());
      setOpen(document.activeElement === input && (palette !== undefined || input.value.trim() === ""));
    };
    const onInput = () => {
      dismissed.current = false;
      sync();
    };
    /* One listener for the whole stretch: focus leaving it closes the list,
       focus moving within it (Tab from the field to submit, to Clear, to a
       row) does not. */
    const onFocusOut = (event: FocusEvent) => {
      if (!withOffer(event.target as Node | null)) return;
      if (withOffer(event.relatedTarget as Node | null)) return;
      dismissed.current = false;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key === "ArrowDown" && !event.altKey && !event.metaKey && !event.ctrlKey) {
        /* Only while the list is on screen: a closed list has nothing to enter. */
        const first = panel()?.hidden ? undefined : rows()[0];
        if (!first) return;
        event.preventDefault();
        first.focus();
      }
    };
    input.setAttribute("aria-controls", listId);
    /* Focused before hydration (a fast tap, autofocus): answer it now. */
    if (document.activeElement === input) sync();
    input.addEventListener("focus", sync);
    input.addEventListener("input", onInput);
    document.addEventListener("focusout", onFocusOut);
    input.addEventListener("keydown", onKey);
    return () => {
      input.removeEventListener("focus", sync);
      input.removeEventListener("input", onInput);
      document.removeEventListener("focusout", onFocusOut);
      input.removeEventListener("keydown", onKey);
    };
  }, [inputId, listId, palette]);

  /* No `aria-expanded` on the input: it is a plain search field, not a combobox
     (the panel is a list of links, not options), and `aria-expanded` is not
     allowed on a textbox (axe `aria-allowed-attr`, W12). The panel carries
     `hidden` while it is closed, and the input keeps `aria-controls`. */

  const q = palette ? typed : "";
  const needle = q.toLowerCase();
  const recents = q ? entries.filter((entry) => entry.label.toLowerCase().includes(needle)).slice(0, 4) : entries;
  const commands = q && palette
    ? [
        { key: "search", glyph: "search" as const, label: palette.searchFor.replace("{q}", q), href: `${path}?q=${encodeURIComponent(q)}`, submit: true },
        { key: "rent", glyph: "key" as const, label: palette.rentIn.replace("{q}", q), href: `${path}?q=${encodeURIComponent(q)}&market=rent`, submit: false },
        { key: "buy", glyph: "house" as const, label: palette.buyIn.replace("{q}", q), href: `${path}?q=${encodeURIComponent(q)}&market=buy`, submit: false },
      ]
    : [];
  const shown = open && (entries.length > 0 || commands.length > 0);

  /* The field describes itself with the list's title while the list is shown.
     The title only exists while it is shown, so the reference is added and
     taken away with it, and any description the page already gave the field
     is kept. */
  useEffect(() => {
    const input = document.getElementById(inputId);
    if (!input) return;
    const others = (input.getAttribute("aria-describedby") ?? "").split(/\s+/).filter((id) => id && id !== titleId);
    const next = shown ? [...others, titleId] : others;
    if (next.length) input.setAttribute("aria-describedby", next.join(" "));
    else input.removeAttribute("aria-describedby");
  }, [inputId, titleId, shown]);

  /*
   * THE LAST ROW STAYS ABOVE THE KEYBOARD (round 5 craft). While the list is
   * shown, the room between its top and the bottom of what is visible (the
   * visual viewport, which shrinks when a phone's keyboard rises) is written
   * to `--nf-recent-room`; on the results bar the list is no taller than that
   * (catalogue.css) and scrolls inside itself. Measured on open and on every
   * visual viewport change, never per keystroke, so typing waits on nothing.
   */
  useEffect(() => {
    if (!shown) return;
    const panel = document.getElementById(listId);
    if (!panel) return;
    const vv = window.visualViewport;
    const fit = () => {
      const bottom = vv ? vv.offsetTop + vv.height : window.innerHeight;
      const room = Math.floor(bottom - panel.getBoundingClientRect().top - 8);
      /* Never below the title and two rows, whatever the keyboard leaves. */
      panel.style.setProperty("--nf-recent-room", `${Math.max(room, 132)}px`);
    };
    fit();
    vv?.addEventListener("resize", fit);
    vv?.addEventListener("scroll", fit);
    return () => {
      vv?.removeEventListener("resize", fit);
      vv?.removeEventListener("scroll", fit);
    };
  }, [shown, listId]);

  const backToField = () => {
    dismissed.current = true;
    setOpen(false);
    const input = document.getElementById(inputId);
    input?.focus();
    /* Already focused (nothing to fire): do not leave the flag armed. */
    if (document.activeElement === input) dismissed.current = false;
  };

  return (
    <div
      id={listId}
      className={["nf-recent", className ?? ""].filter(Boolean).join(" ")}
      hidden={!shown}
      data-testid="recent-searches"
      onFocus={() => setOpen(true)}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          backToField();
          return;
        }
        if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
        const links = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("a.nf-recent__row"));
        const at = links.indexOf(document.activeElement as HTMLElement);
        if (at < 0) return;
        event.preventDefault();
        if (event.key === "ArrowDown") links[Math.min(at + 1, links.length - 1)]?.focus();
        else if (at === 0) document.getElementById(inputId)?.focus();
        else links[at - 1]?.focus();
      }}
    >
      {shown && commands.length > 0 && palette ? (
        <ul className="nf-recent__list nf-recent__list--palette" aria-label={palette.label}>
          {commands.map((row, index) => (
            <li key={row.key}>
              <Link
                href={row.href}
                className="nf-recent__row"
                data-active={index === 0 || undefined}
                onClick={(event) => {
                  setOpen(false);
                  if (!row.submit) return;
                  /* The first row is Enter: the form submits, so the filters
                     the bar carries in its hidden fields travel too. */
                  const input = document.getElementById(inputId);
                  const form = input instanceof HTMLInputElement ? input.form : null;
                  if (!form) return;
                  event.preventDefault();
                  form.requestSubmit();
                }}
              >
                <span className="nf-recent__tile" aria-hidden="true">
                  <UiIcon name={row.glyph} size={16} />
                </span>
                <span className="nf-recent__label">{row.label}</span>
                {index === 0 ? (
                  <kbd className="nf-recent__kbd" aria-hidden="true">
                    {palette.enter}
                  </kbd>
                ) : null}
              </Link>
            </li>
          ))}
          {recents.map((entry) => (
            <li key={entry.href}>
              <Link href={entry.href} className="nf-recent__row" onClick={() => setOpen(false)}>
                <span className="nf-recent__tile" aria-hidden="true">
                  <UiIcon name="history" size={16} />
                </span>
                <span className="nf-recent__label">{entry.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : shown ? (
        <>
          <div className="nf-recent__head">
            <p id={titleId} className="nf-section-label">
              {copy.title}
            </p>
            <Button
              variant="quiet"
              size="sm"
              aria-label={copy.clearLabel}
              onClick={() => {
                clearRecentSearches();
                backToField();
              }}
            >
              {copy.clear}
            </Button>
          </div>
          <ul className="nf-recent__list" aria-labelledby={titleId}>
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
