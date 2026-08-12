"use client";

import { useMemo, useState } from "react";
import { UiIcon } from "@/design-system/icons/UiIcon";
import type { Thread } from "./threads";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { AssistantSettingsSheet } from "./AssistantSettingsSheet";

/**
 * Assistant side navigation.
 *
 * One component serves both placements: the persistent left column on
 * desktop and the slide-in drawer on mobile. Top to bottom it reads search,
 * new chat, conversation history, then a single Settings row pinned to the
 * foot which opens reply style, language and clear-all in a sheet. The search
 * field filters titles and message text so a half-remembered conversation is
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
  const [settingsOpen, setSettingsOpen] = useState(false);

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
          <UiIcon name="plus" size={15} />
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
                    <UiIcon name="trash" size={15} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </nav>

      {/* ------------------------------------------------------ settings */}
      {/*
        ONE ROW, AND IT WAS THREE CONTROLS PERMANENTLY OPEN.

        Reply style, language and clear-all were splayed under the history with
        a heading each, taking the bottom third of a column whose job is
        showing you which conversation to go back to. On a phone drawer that
        was most of the history gone - to show settings somebody chooses once
        in their first week and then never looks at again.

        The row sits at the foot the way ChatGPT puts its account there, and
        `AssistantSettingsSheet` holds the lot. The history gets the space.
      */}
      <div className="border-t border-[var(--nf-border-subtle)] p-3">
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          aria-haspopup="dialog"
          className="nf-tap flex w-full items-center gap-md rounded-[var(--nf-radius-control)] px-3 py-2.5 text-left text-[var(--nf-content-secondary)] transition-colors hover:bg-[var(--nf-glass-fill)] hover:text-[var(--nf-content-primary)]"
        >
          <UiIcon name="settings-gear" size={18} className="shrink-0" />
          <span className="flex-1 text-[0.8438rem] font-medium">Settings</span>
          {/* The current reply style, on the row. A settings entry that says
              only "Settings" makes somebody open it to find out what it is
              set to; naming the one they are most likely to be checking
              answers that without a tap. */}
          <span className="shrink-0 text-[0.75rem] text-[var(--nf-content-muted)]">
            {tone}
          </span>
          <UiIcon name="chevron-right" size={14} className="shrink-0" />
        </button>
      </div>

      <AssistantSettingsSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        tone={tone}
        language={language}
        onToneChange={onToneChange}
        onLanguageChange={onLanguageChange}
        onClearAll={onClearAll}
        threadCount={threads.length}
      />

    </div>
  );
}
