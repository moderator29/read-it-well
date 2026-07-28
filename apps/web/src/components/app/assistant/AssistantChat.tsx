"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/app/PageHeader";
import { Icon } from "@/design-system/icons/Icon";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * NaijaFinds AI chat surface.
 *
 * A full conversational column: scrollable thread, starter suggestions, a
 * pinned composer and an options panel behind the header gear. The assistant
 * is honest about its current reach. Every reply states plainly what it can
 * do today and routes the user to Search, so nothing on this screen ever
 * pretends to be a live result. The thread persists locally under
 * `nf_ai_thread` and survives navigation and reloads on this device.
 */

type Role = "user" | "assistant";
type Message = { id: string; role: Role; text: string };

const STORAGE_KEY = "nf_ai_thread";

const ASSISTANT_REPLY =
  "I can search stays, restaurants and experiences for you once my tools come online. For now, try Search to browse the catalogue.";

const STARTERS = [
  "2 bedroom in Lekki under 300k",
  "Weekend beach resorts near Lagos",
  "Best jollof in Abuja",
];

const TONES = ["Concise", "Detailed"] as const;
const LANGUAGES = ["English", "Pidgin", "Hausa", "Igbo", "Yoruba"] as const;

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadThread(): Message[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m): m is Message =>
        typeof m === "object" &&
        m !== null &&
        typeof (m as Message).id === "string" &&
        typeof (m as Message).text === "string" &&
        ((m as Message).role === "user" || (m as Message).role === "assistant"),
    );
  } catch {
    return [];
  }
}

export function AssistantChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [typing, setTyping] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [tone, setTone] = useState<(typeof TONES)[number]>("Concise");
  const [language, setLanguage] = useState<(typeof LANGUAGES)[number]>("English");
  const [draft, setDraft] = useState("");

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const replyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Restore the saved thread once on mount, then persist every change. */
  useEffect(() => {
    setMessages(loadThread());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      /* Storage full or blocked: the conversation simply lives in memory. */
    }
  }, [messages, hydrated]);

  /* Keep the newest bubble in view as the thread grows. */
  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight });
  }, [messages, typing]);

  useEffect(() => {
    return () => {
      if (replyTimer.current) clearTimeout(replyTimer.current);
    };
  }, []);

  const send = useCallback(
    (raw: string) => {
      const text = raw.trim();
      if (!text || typing) return;
      setDraft("");
      setMessages((prev) => [...prev, { id: makeId(), role: "user", text }]);
      setTyping(true);
      replyTimer.current = setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { id: makeId(), role: "assistant", text: ASSISTANT_REPLY },
        ]);
        setTyping(false);
      }, 600);
    },
    [typing],
  );

  const clearConversation = () => {
    if (replyTimer.current) clearTimeout(replyTimer.current);
    setTyping(false);
    setMessages([]);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* Nothing to recover from: state is already cleared. */
    }
    setOptionsOpen(false);
    inputRef.current?.focus();
  };

  const empty = hydrated && messages.length === 0;

  return (
    <div className="mx-auto flex h-[calc(100dvh-64px-10rem)] min-h-[26rem] w-full max-w-2xl flex-col lg:h-[calc(100dvh-64px-4rem)]">
      <PageHeader
        title="NaijaFinds AI"
        subtitle="Beta"
        actions={
          <button
            type="button"
            aria-label="Assistant options"
            aria-expanded={optionsOpen}
            aria-controls="assistant-options"
            onClick={() => setOptionsOpen((v) => !v)}
            className="nf-icon-btn h-9 w-9 sm:h-10 sm:w-10"
          >
            <span className="h-6 w-6">
              <Icon name="settings" fill />
            </span>
          </button>
        }
      />

      {optionsOpen && (
        <div id="assistant-options" className="nf-card nf-rise mb-4 space-y-4 p-4">
          <div>
            <p className="nf-overline mb-2">Reply style</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Reply style">
              {TONES.map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={tone === t}
                  onClick={() => setTone(t)}
                  className={`nf-chip ${tone === t ? "nf-chip--active" : ""}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="nf-overline mb-2">Language</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Language">
              {LANGUAGES.map((l) => (
                <button
                  key={l}
                  type="button"
                  aria-pressed={language === l}
                  onClick={() => setLanguage(l)}
                  className={`nf-chip ${language === l ? "nf-chip--active" : ""}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <button type="button" onClick={clearConversation} className="nf-btn nf-btn--ghost">
            Clear conversation
          </button>
        </div>
      )}

      {/* ------------------------------------------------------ chat thread */}
      <div
        ref={scrollerRef}
        className="flex-1 space-y-4 overflow-y-auto pb-4 pr-1"
        aria-live="polite"
        aria-label="Conversation"
      >
        {empty && (
          <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
            <span className="block h-14 w-14 sm:h-16 sm:w-16">
              <Icon name="ai-assistant" fill />
            </span>
            <div>
              <p className="text-[0.9375rem] font-semibold">How can I help today?</p>
              <p className="mx-auto mt-1 max-w-[36ch] text-[0.8125rem] text-[var(--nf-content-muted)]">
                Ask about places to stay, eat and explore across Nigeria.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {STARTERS.map((s) => (
                <button key={s} type="button" onClick={() => send(s)} className="nf-chip">
                  <UiIcon name="sparkle" size={14} />
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="nf-rise flex justify-end">
              <p className="max-w-[85%] rounded-2xl rounded-br-md bg-[var(--nf-brand-primary)] px-4 py-2.5 text-[0.9rem] leading-relaxed text-white">
                {m.text}
              </p>
            </div>
          ) : (
            <div key={m.id} className="nf-rise flex items-end gap-2.5">
              <span className="h-7 w-7 shrink-0" aria-hidden="true">
                <Icon name="ai-assistant" fill />
              </span>
              <div className="nf-card max-w-[85%] rounded-2xl rounded-bl-md p-4">
                <p className="text-[0.9rem] leading-relaxed text-[var(--nf-content-secondary)]">
                  {m.text}
                </p>
                <Link href="/search" className="nf-btn nf-btn--glass mt-3 gap-2 px-3.5 py-2 text-[0.8125rem]">
                  <UiIcon name="search" size={15} />
                  Open Search
                </Link>
              </div>
            </div>
          ),
        )}

        {typing && (
          <div className="nf-rise flex items-end gap-2.5">
            <span className="h-7 w-7 shrink-0" aria-hidden="true">
              <Icon name="ai-assistant" fill />
            </span>
            <div className="nf-card rounded-2xl rounded-bl-md px-4 py-3.5" aria-label="NaijaFinds AI is typing">
              <span className="flex items-center gap-1.5" aria-hidden="true">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-[var(--nf-content-muted)] motion-safe:animate-bounce"
                    style={{ animationDelay: `${i * 140}ms` }}
                  />
                ))}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* --------------------------------------------------------- composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
        className="flex items-center gap-2.5 border-t border-[var(--nf-border-subtle)] pt-3"
      >
        <label htmlFor="assistant-input" className="sr-only">
          Message NaijaFinds AI
        </label>
        <input
          id="assistant-input"
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask NaijaFinds AI anything"
          autoComplete="off"
          enterKeyHint="send"
          className="nf-field min-w-0 flex-1"
        />
        <button
          type="submit"
          aria-label="Send message"
          disabled={!draft.trim() || typing}
          className="nf-btn nf-btn--primary h-11 w-11 shrink-0 rounded-full p-0"
        >
          <UiIcon name="arrow-right" size={18} className="-rotate-90" />
        </button>
      </form>
    </div>
  );
}
