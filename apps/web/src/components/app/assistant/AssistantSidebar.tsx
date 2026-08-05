"use client";

import { useMemo, useState } from "react";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { BinGlyph, PlusGlyph } from "./glyphs";
import type { Thread } from "./threads";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { TextField } from "@/components/ui/Field";

/**
 * Assistant side navigation.
 *
 * One component serves both placements: the persistent left column on
 * desktop and the slide-in drawer on mobile. Top to bottom it reads search,
 * new chat, conversation history, then a settings block pinned to the foot
 * with reply style, language and the clear-all control. The search field
 * filters titles and message text so a half-remembered conversation is
 * still findable.
 */

export const TONES = ["Concise", "Detailed"] as const;
export const LANGUAGES = ["English", "Pidgin", "Hausa", "Igbo", "Yoruba"] as const;

export type Tone = (typeof TONES)[number];
export type Language = (typeof LANGUAGES)[number];

const timeOfDay = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
});
const dayOfYear = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
});

/** Clock time for today's activity, a short date for anything older. */
function whenLabel(timestamp: number): string {
  const then = new Date(timestamp);
  const now = new Date();
  const sameDay =
    then.getFullYear() === now.getFullYear() &&
    then.getMonth() === now.getMonth() &&
    then.getDate() === now.getDate();
  return sameDay ? timeOfDay.format(then) : dayOfYear.format(then);
}

export function AssistantSidebar({
  threads,
  activeId,
  tone,
  language,
  onSelect,
  onNew,
  onDelete,
  onClearAll,
  onToneChange,
  onLanguageChange,
}: {
  threads: Thread[];
  activeId: string | null;
  tone: Tone;
  language: Language;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  onToneChange: (tone: Tone) => void;
  onLanguageChange: (language: Language) => void;
}) {
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const ordered = [...threads].sort((a, b) => b.updatedAt - a.updatedAt);
    const needle = query.trim().toLowerCase();
    if (!needle) return ordered;
    return ordered.filter(
      (t) =>
        t.title.toLowerCase().includes(needle) ||
        t.messages.some((m) => m.text.toLowerCase().includes(needle)),
    );
  }, [threads, query]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* -------------------------------------------- search and new chat */}
      <div className="space-y-2.5 p-3 pb-2.5">
        {/* The sidebar's own search bar was the fifth arrangement of a leading
            icon and a left padding on the platform. It also had no way to get
            back to the whole history except deleting what you typed, which is
            the affordance `clearable` is. */}
        <TextField
          label="Search conversations"
          hideLabel
          type="search"
          leadingIcon="search"
          clearable="Clear the search"
          onClear={() => setQuery("")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search conversations"
          autoComplete="off"
        />
        <Button variant="primary" size="sm" full onClick={onNew}>
          <PlusGlyph size={15} />
          New chat
        </Button>
      </div>

      {/* ------------------------------------------------------- history */}
      <nav
        aria-label="Conversation history"
        className="min-h-0 flex-1 overflow-y-auto px-3 pb-2"
      >
        {visible.length === 0 ? (
          <p className="px-1 pt-3 text-[0.8125rem] text-[var(--nf-content-muted)]">
            {query.trim()
              ? "No conversations match your search."
              : "Your conversations will appear here."}
          </p>
        ) : (
          <ul className="space-y-1">
            {visible.map((t) => {
              const active = t.id === activeId;
              return (
                <li key={t.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => onSelect(t.id)}
                    aria-current={active ? "true" : undefined}
                    /* The active row's border was `rgb(0 102 255 / 0.55)`, a
                       raw literal of the brand blue that would not have moved
                       if the brand did. Same colour, said in the token. */
                    className={`w-full rounded-xl border px-3 py-2.5 pr-10 text-left transition-colors ${
                      active
                        ? "border-[color-mix(in_oklab,var(--nf-brand-primary)_55%,transparent)] bg-[color-mix(in_oklab,var(--nf-brand-primary)_16%,transparent)]"
                        : "border-transparent hover:bg-[var(--nf-glass-fill)]"
                    }`}
                  >
                    <span
                      className={`block truncate text-[0.8438rem] font-medium ${
                        active
                          ? "text-[var(--nf-content-primary)]"
                          : "text-[var(--nf-content-secondary)]"
                      }`}
                    >
                      {t.title}
                    </span>
                    <span className="nf-numeric mt-0.5 block text-[0.6875rem] text-[var(--nf-content-muted)]">
                      {whenLabel(t.updatedAt)}
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete conversation: ${t.title}`}
                    onClick={() => onDelete(t.id)}
                    className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--nf-content-muted)] opacity-70 transition-colors hover:bg-[var(--nf-glass-fill)] hover:text-[var(--nf-content-primary)] group-hover:opacity-100"
                  >
                    <BinGlyph size={15} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </nav>

      {/* ------------------------------------------------------ settings */}
      <div className="space-y-3.5 border-t border-[var(--nf-border-subtle)] p-3">
        <div>
          <p className="nf-overline mb-2">Reply style</p>
          {/* `behaviour="filter"`, keeping the `aria-pressed` these already
              announced. They are a choice out of two, but the group has no
              `radiogroup` around it and never had one, and a `role="radio"`
              with no group is invalid ARIA - worse than the toggle semantics
              that were at least true. The `px-3 py-1.5` override is gone: it
              was there to force the height back DOWN after the chip had been
              inflated to reach the touch floor. The primitive keeps the paint
              at 36px and overflows an invisible 44pt target. */}
          <div className="flex flex-wrap gap-2" role="group" aria-label="Reply style">
            {TONES.map((t) => (
              <Chip
                key={t}
                size="sm"
                behaviour="filter"
                selected={tone === t}
                onSelectedChange={() => onToneChange(t)}
              >
                {t}
              </Chip>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between gap-4">
          <p className="nf-overline">Language</p>
          <button
            type="button"
            aria-label={`Language: ${language}. Switch to the next language`}
            onClick={() => {
              const next =
                LANGUAGES[(LANGUAGES.indexOf(language) + 1) % LANGUAGES.length] ??
                "English";
              onLanguageChange(next);
            }}
            className="nf-chip px-3 py-1.5 text-[0.75rem]"
          >
            {language}
            <UiIcon name="chevron-down" size={12} />
          </button>
        </div>
        <Button variant="ghost" size="sm" full onClick={onClearAll} disabled={threads.length === 0}>
          Clear all history
        </Button>
      </div>
    </div>
  );
}
