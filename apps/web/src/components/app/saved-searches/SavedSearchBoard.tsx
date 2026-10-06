"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { formatDate, type Locale } from "@vallo/i18n/core";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { Switch } from "@/components/ui/Switch";
import { RowGlyph, Surface, TYPE } from "@/components/app/Screen";
import {
  deleteSavedSearch,
  renameSavedSearch,
  setSavedSearchAlert,
} from "@/lib/saved/searches-actions";
import {
  SAVED_SEARCH_LABEL_MAX,
  summariseSearch,
  type SavedSearchView,
  type SearchChipCopy,
} from "@/lib/saved/searches";

/**
 * THE KEPT SEARCHES, AND EVERY WRITE THAT CAN REACH THEM.
 *
 * ---------------------------------------------------------------------------
 * WHAT THE SCREEN SHOWS IS WHAT THE DATABASE HOLDS.
 *
 * The rows arrive from the server component, which read them under the
 * account's own policy in this request. Each control here flips its row
 * optimistically and then replaces it with THE ROW THE ACTION RETURNED, which
 * is the database's own answer after its own write. A refusal puts the row
 * back exactly as it was and says why.
 *
 * So there is no second copy of the truth anywhere in this component. The
 * chips under a label are derived from the STORED parameters, in this render,
 * by the same function the control on the results shelf uses, which is what
 * makes a reload the proof: the switch reads on because a column says true,
 * not because somebody tapped it a minute ago.
 *
 * ---------------------------------------------------------------------------
 * NO COUNTS. A row does not say how many places match it, and that is
 * deliberate. The only honest way to show that number is to run every saved
 * search on every paint of this screen, and a number that is cached anywhere
 * else is the disagreement this build keeps finding: a badge saying three over
 * a list showing five. The alert says how many went up, counted in the run
 * that sent it; this screen says what was saved.
 *
 * ---------------------------------------------------------------------------
 * REMOVING TAKES TWO TAPS. Not a dialogue, which is heavy for a reversible
 * thing, and not one tap, which is how a search somebody spent ten minutes
 * building disappears under a thumb on a bus.
 */

/** How long a line of feedback stays. Matches the heart's note. */
const NOTE_MS = 2600;

type Note = { text: string; tone: "ok" | "error" } | null;

export function SavedSearchBoard({
  initial,
  locale,
  chipCopy,
}: {
  initial: SavedSearchView[];
  locale: Locale;
  /** The dictionary's lines for the chips, read on the server (`searchChipCopyOf`). */
  chipCopy: SearchChipCopy;
}) {
  const [rows, setRows] = useState(initial);

  const replace = useCallback((next: SavedSearchView) => {
    setRows((held) => held.map((row) => (row.id === next.id ? next : row)));
  }, []);

  const drop = useCallback((id: string) => {
    setRows((held) => held.filter((row) => row.id !== id));
  }, []);

  return (
    <Surface data-testid="saved-searches">
      <ul className="nf-rows">
        {rows.map((row) => (
          <SavedSearchRow
            key={row.id}
            row={row}
            locale={locale}
            chipCopy={chipCopy}
            onReplace={replace}
            onDrop={drop}
          />
        ))}
      </ul>
    </Surface>
  );
}

function SavedSearchRow({
  row,
  locale,
  chipCopy,
  onReplace,
  onDrop,
}: {
  row: SavedSearchView;
  locale: Locale;
  chipCopy: SearchChipCopy;
  onReplace: (next: SavedSearchView) => void;
  onDrop: (id: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<Note>(null);
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(row.label);
  const [confirming, setConfirming] = useState(false);
  /* The switch's optimistic position. `null` means nobody has touched it on
     this screen, so the stored column is what is drawn. */
  const [alertOverride, setAlertOverride] = useState<boolean | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const alertOn = alertOverride ?? row.alertEnabled;
  const chips = summariseSearch(row.params, locale, chipCopy);

  /* The timer is cleared on unmount, because a row that has just been removed
     is unmounted while its note is still counting down. */
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const say = useCallback((text: string, tone: "ok" | "error" = "ok") => {
    setNote({ text, tone });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setNote(null), NOTE_MS);
  }, []);

  const toggleAlert = useCallback(() => {
    if (pending) return;
    const next = !alertOn;
    setAlertOverride(next);
    startTransition(async () => {
      const result = await setSavedSearchAlert({ id: row.id, enabled: next });
      if (!result.ok) {
        setAlertOverride(!next);
        say(result.error, "error");
        return;
      }
      /* The row the database returned, not the row this component guessed. */
      onReplace(result.data);
      setAlertOverride(null);
      say(
        result.data.alertEnabled
          ? "We will tell you when a new place matches this."
          : "Alerts off. The search is still saved.",
      );
    });
  }, [alertOn, onReplace, pending, row.id, say]);

  const commitRename = useCallback(() => {
    if (pending) return;
    const label = draft.trim();
    if (label.length === 0) {
      say("Give this search a name.", "error");
      return;
    }
    startTransition(async () => {
      const result = await renameSavedSearch({ id: row.id, label });
      if (!result.ok) {
        say(result.error, "error");
        return;
      }
      onReplace(result.data);
      setRenaming(false);
      say("Renamed");
    });
  }, [draft, onReplace, pending, row.id, say]);

  const remove = useCallback(() => {
    if (pending) return;
    startTransition(async () => {
      const result = await deleteSavedSearch({ id: row.id });
      if (!result.ok) {
        setConfirming(false);
        say(result.error, "error");
        return;
      }
      onDrop(row.id);
    });
  }, [onDrop, pending, row.id, say]);

  return (
    <li className="nf-row flex-col items-stretch gap-sm" data-testid="saved-search-row">
      {renaming ? (
        <div className="flex flex-col gap-sm">
          <TextField
            label="Name this search"
            value={draft}
            maxLength={SAVED_SEARCH_LABEL_MAX}
            autoFocus
            onChange={(event) => setDraft(event.target.value)}
            data-testid="saved-search-name"
          />
          <div className="flex flex-wrap gap-sm">
            <Button
              variant="primary"
              size="sm"
              loading={pending}
              onClick={commitRename}
              data-testid="saved-search-name-save"
            >
              Save name
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setDraft(row.label);
                setRenaming(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex min-w-0 items-start gap-sm">
          <RowGlyph icon="search" />
          <div className="min-w-0 flex-1">
            <Link
              href={row.href}
              prefetch
              className="nf-link-quiet flex items-center gap-2xs"
              data-testid="saved-search-open"
            >
              <span className={`${TYPE.rowTitle} min-w-0 truncate`}>{row.label}</span>
              <UiIcon name="chevron-right" size={16} />
            </Link>
            {chips.length > 0 && (
              <p className={`${TYPE.rowMeta} mt-3xs`} data-testid="saved-search-chips">
                {chips.join(" · ")}
              </p>
            )}
            <p className={`${TYPE.rowMeta} mt-3xs`}>
              Saved {formatDate(new Date(row.createdAt), locale)}
              {row.derivedLabel ? ". Named from its filters." : ""}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-sm">
        <Switch
          checked={alertOn}
          disabled={pending}
          onCheckedChange={toggleAlert}
          label="Tell me about new matches"
          data-testid="saved-search-alert"
        />
        <div className="flex items-center gap-2xs">
          {!renaming && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setDraft(row.label);
                setRenaming(true);
              }}
              data-testid="saved-search-rename"
            >
              Rename
            </Button>
          )}
          {confirming ? (
            <>
              <Button
                variant="danger"
                size="sm"
                loading={pending}
                onClick={remove}
                data-testid="saved-search-remove-confirm"
              >
                Remove it
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setConfirming(false)}>
                Keep
              </Button>
            </>
          ) : (
            <Button
              variant="dangerQuiet"
              size="sm"
              onClick={() => setConfirming(true)}
              data-testid="saved-search-remove"
            >
              Remove
            </Button>
          )}
        </div>
      </div>

      {/* The space for the note is not reserved, because this row is in a
          vertical list and a line appearing below a row pushes rows down
          rather than sideways under a thumb aiming at a control. */}
      {note && (
        <p
          role="status"
          className={
            note.tone === "error"
              ? "nf-body-sm text-[var(--nf-state-error)]"
              : "nf-body-sm text-[var(--nf-content-muted)]"
          }
        >
          {note.text}
        </p>
      )}
    </li>
  );
}
