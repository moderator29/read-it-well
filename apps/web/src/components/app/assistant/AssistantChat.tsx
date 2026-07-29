"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/app/PageHeader";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import {
  AssistantSidebar,
  type Language,
  type Tone,
} from "./AssistantSidebar";
import { CloseGlyph, HistoryGlyph } from "./glyphs";
import {
  clearStoredThreads,
  deriveTitle,
  loadThreads,
  makeId,
  saveThreads,
  type Thread,
} from "./threads";

/**
 * RentMe AI chat surface.
 *
 * A full assistant page in the shape people know from the big chat products:
 * a conversation column with pinned composer, plus its own side navigation.
 * On desktop the sidebar sits as a left column inside the page content; on
 * mobile it slides in from a history control in the page header. The sidebar
 * carries search, new chat, the persisted conversation history and the
 * assistant settings. Conversations live under `nf_ai_threads` on this
 * device and switching threads swaps the visible messages.
 *
 * The assistant stays honest about its current reach: every reply states
 * plainly what it can do today and routes the user to Search, so nothing on
 * this screen ever pretends to be a live result.
 */

const ASSISTANT_REPLY =
  "I can search stays, restaurants and experiences for you once my tools come online. For now, try Search to browse the catalogue.";

const STARTERS = [
  "2 bedroom in Lekki under 300k",
  "Weekend beach resorts near Lagos",
  "Best jollof in Abuja",
];

const DRAWER_EXIT_MS = 240;

export function AssistantChat() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [typingThread, setTypingThread] = useState<string | null>(null);
  const [tone, setTone] = useState<Tone>("Concise");
  const [language, setLanguage] = useState<Language>("English");
  const [draft, setDraft] = useState("");

  // A question can arrive from anywhere on the platform via ?q=, e.g. the home
  // banner's quick-ask bar. It seeds the composer after mount, never auto-sends.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) setDraft((d) => (d ? d : q));
  }, []);

  /* Mobile drawer: `historyOpen` mounts it, `historyShown` slides it in, so
     both directions of the transition get a frame to run. */
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyShown, setHistoryShown] = useState(false);

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const replyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const drawerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Restore saved conversations once on mount, then persist every change. */
  useEffect(() => {
    const restored = loadThreads();
    setThreads(restored);
    const latest = [...restored].sort((a, b) => b.updatedAt - a.updatedAt)[0];
    if (latest) setActiveId(latest.id);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveThreads(threads);
  }, [threads, hydrated]);

  const active = activeId ? threads.find((t) => t.id === activeId) : undefined;
  const messages = active?.messages ?? [];
  const typing = typingThread !== null;
  const typingHere = typingThread !== null && typingThread === activeId;

  /* Keep the newest bubble in view as the thread grows or switches. */
  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight });
  }, [messages, typingHere, activeId]);

  useEffect(() => {
    return () => {
      if (replyTimer.current) clearTimeout(replyTimer.current);
      if (drawerTimer.current) clearTimeout(drawerTimer.current);
    };
  }, []);

  /* Slide the drawer in one frame after it mounts. */
  useEffect(() => {
    if (!historyOpen) return;
    const frame = requestAnimationFrame(() => setHistoryShown(true));
    return () => cancelAnimationFrame(frame);
  }, [historyOpen]);

  const openHistory = () => {
    if (drawerTimer.current) clearTimeout(drawerTimer.current);
    setHistoryOpen(true);
  };

  const closeHistory = useCallback(() => {
    setHistoryShown(false);
    if (drawerTimer.current) clearTimeout(drawerTimer.current);
    drawerTimer.current = setTimeout(() => setHistoryOpen(false), DRAWER_EXIT_MS);
  }, []);

  useEffect(() => {
    if (!historyOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeHistory();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [historyOpen, closeHistory]);

  const send = useCallback(
    (raw: string) => {
      const text = raw.trim();
      if (!text || typing) return;
      setDraft("");

      const userMessage = { id: makeId(), role: "user" as const, text };
      let targetId = activeId;

      if (!targetId || !threads.some((t) => t.id === targetId)) {
        targetId = makeId();
        const now = Date.now();
        const fresh: Thread = {
          id: targetId,
          title: deriveTitle(text),
          createdAt: now,
          updatedAt: now,
          messages: [userMessage],
        };
        setThreads((prev) => [fresh, ...prev]);
        setActiveId(targetId);
      } else {
        setThreads((prev) =>
          prev.map((t) =>
            t.id === targetId
              ? { ...t, updatedAt: Date.now(), messages: [...t.messages, userMessage] }
              : t,
          ),
        );
      }

      setTypingThread(targetId);
      replyTimer.current = setTimeout(() => {
        setThreads((prev) =>
          prev.map((t) =>
            t.id === targetId
              ? {
                  ...t,
                  updatedAt: Date.now(),
                  messages: [
                    ...t.messages,
                    { id: makeId(), role: "assistant" as const, text: ASSISTANT_REPLY },
                  ],
                }
              : t,
          ),
        );
        setTypingThread(null);
      }, 600);
    },
    [activeId, threads, typing],
  );

  const selectThread = (id: string) => {
    setActiveId(id);
    closeHistory();
    inputRef.current?.focus();
  };

  const newChat = () => {
    setActiveId(null);
    closeHistory();
    inputRef.current?.focus();
  };

  const deleteThread = (id: string) => {
    if (typingThread === id) {
      if (replyTimer.current) clearTimeout(replyTimer.current);
      setTypingThread(null);
    }
    setThreads((prev) => prev.filter((t) => t.id !== id));
    if (activeId === id) setActiveId(null);
  };

  const clearAll = () => {
    if (replyTimer.current) clearTimeout(replyTimer.current);
    setTypingThread(null);
    setThreads([]);
    setActiveId(null);
    clearStoredThreads();
    closeHistory();
    inputRef.current?.focus();
  };

  const empty = hydrated && messages.length === 0;

  const sidebar = (idPrefix: string) => (
    <AssistantSidebar
      threads={threads}
      activeId={activeId}
      tone={tone}
      language={language}
      onSelect={selectThread}
      onNew={newChat}
      onDelete={deleteThread}
      onClearAll={clearAll}
      onToneChange={setTone}
      onLanguageChange={setLanguage}
      idPrefix={idPrefix}
    />
  );

  return (
    <div className="mx-auto flex h-[calc(100dvh-64px-10rem)] min-h-[26rem] w-full max-w-5xl flex-col lg:h-[calc(100dvh-64px-4rem)]">
      <PageHeader
        title="RentMe AI"
        subtitle="Beta"
        actions={
          <button
            type="button"
            aria-label="Conversation history"
            aria-expanded={historyOpen}
            onClick={openHistory}
            className="nf-icon-btn h-9 w-9 lg:hidden"
          >
            <HistoryGlyph size={17} />
          </button>
        }
      />

      <div className="flex min-h-0 flex-1 gap-4">
        {/* --------------------------------------------- desktop sidebar */}
        <aside
          aria-label="Assistant navigation"
          className="nf-card hidden w-72 shrink-0 overflow-hidden lg:block"
        >
          {sidebar("desktop")}
        </aside>

        {/* ------------------------------------------------- thread area */}
        <section className="mx-auto flex h-full min-h-0 w-full max-w-2xl flex-1 flex-col lg:mx-0 lg:max-w-none">
          <div
            ref={scrollerRef}
            className="flex-1 space-y-4 overflow-y-auto pb-4 pr-1"
            aria-live="polite"
            aria-label="Conversation"
          >
            {empty && (
              <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
                <span className="block h-14 w-14 sm:h-16 sm:w-16">
                  <BrandIcon name="bot-home" fill />
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
                    <BrandIcon name="bot-home" fill />
                  </span>
                  <div className="nf-card max-w-[85%] rounded-2xl rounded-bl-md p-4">
                    <p className="text-[0.9rem] leading-relaxed text-[var(--nf-content-secondary)]">
                      {m.text}
                    </p>
                    <Link
                      href="/search"
                      className="nf-btn nf-btn--glass mt-3 gap-2 px-3.5 py-2 text-[0.8125rem]"
                    >
                      <UiIcon name="search" size={15} />
                      Open Search
                    </Link>
                  </div>
                </div>
              ),
            )}

            {typingHere && (
              <div className="nf-rise flex items-end gap-2.5">
                <span className="h-7 w-7 shrink-0" aria-hidden="true">
                  <BrandIcon name="bot-home" fill />
                </span>
                <div
                  className="nf-card rounded-2xl rounded-bl-md px-4 py-3.5"
                  aria-label="RentMe AI is typing"
                >
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

          {/* ----------------------------------------------------- composer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(draft);
            }}
            className="flex items-center gap-2.5 border-t border-[var(--nf-border-subtle)] pt-3"
          >
            <label htmlFor="assistant-input" className="sr-only">
              Message RentMe AI
            </label>
            <input
              id="assistant-input"
              ref={inputRef}
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask RentMe AI anything"
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
        </section>
      </div>

      {/* ------------------------------------------------- mobile drawer */}
      {historyOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close conversation history"
            onClick={closeHistory}
            className={`absolute inset-0 bg-black/60 transition-opacity duration-200 ${
              historyShown ? "opacity-100" : "opacity-0"
            }`}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Conversation history"
            className={`nf-card absolute inset-y-0 left-0 flex w-80 max-w-[85vw] flex-col rounded-l-none transition-transform duration-200 ease-out ${
              historyShown ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <div className="flex items-center justify-between border-b border-[var(--nf-border-subtle)] py-2 pl-4 pr-2">
              <p className="text-[0.875rem] font-semibold">Conversations</p>
              <button
                type="button"
                aria-label="Close conversation history"
                onClick={closeHistory}
                className="nf-icon-btn h-9 w-9"
              >
                <CloseGlyph size={16} />
              </button>
            </div>
            <div className="min-h-0 flex-1">{sidebar("drawer")}</div>
          </div>
        </div>
      )}
    </div>
  );
}
