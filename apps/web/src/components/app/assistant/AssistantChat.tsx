"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { PageHeader } from "@/components/app/PageHeader";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import type {
  AssistantListingItem,
  AssistantStreamEvent,
  AssistantTurn,
} from "@/lib/assistant/types";
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
  type Message,
  type Thread,
} from "./threads";
import { Button } from "@/components/ui/Button";

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
 * Replies stream live from /api/assistant: text lands token by token in the
 * bubble, and when the concierge searches the catalogue the real results
 * render as tappable listing cards inside the thread. Sending again or
 * leaving the page aborts any in-flight stream. When the caller is signed in
 * the server returns a durable conversation id, kept on the thread as
 * `serverId` so future turns append to the same row.
 */

const NETWORK_ERROR_MESSAGE =
  "The assistant could not reach the network. Your message is kept; tap retry.";
const PACE_FALLBACK_MESSAGE =
  "You are moving faster than the assistant can think. Give it a few minutes and try again.";

const STARTERS = [
  "2 bedroom in Lekki under 300k",
  "Weekend beach resorts near Lagos",
  "Best jollof in Abuja",
];

const DRAWER_EXIT_MS = 240;

/** Turns a thread's visible messages into the wire history for the route. */
function toTurns(messages: Message[]): AssistantTurn[] {
  return messages
    .filter((m) => m.text.trim().length > 0)
    .map((m) => ({ role: m.role, content: m.text }));
}

export function AssistantChat() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [streamingThread, setStreamingThread] = useState<string | null>(null);
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
  const drawerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const streamSeq = useRef(0);

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
  const streamingHere = streamingThread !== null && streamingThread === activeId;

  /* Keep the newest bubble in view as the thread grows or switches. */
  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight });
  }, [messages, streamingHere, activeId]);

  /* Abort any in-flight stream on navigation away from the page. */
  useEffect(() => {
    return () => {
      if (drawerTimer.current) clearTimeout(drawerTimer.current);
      abortRef.current?.abort();
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

  /** Patch one message inside one thread, bumping the thread's activity time. */
  const patchMessage = useCallback(
    (threadId: string, messageId: string, patch: (m: Message) => Message) => {
      setThreads((prev) =>
        prev.map((t) =>
          t.id === threadId
            ? {
                ...t,
                updatedAt: Date.now(),
                messages: t.messages.map((m) => (m.id === messageId ? patch(m) : m)),
              }
            : t,
        ),
      );
    },
    [],
  );

  const dropMessageIfEmpty = useCallback((threadId: string, messageId: string) => {
    setThreads((prev) =>
      prev.map((t) =>
        t.id === threadId
          ? {
              ...t,
              messages: t.messages.filter(
                (m) =>
                  m.id !== messageId ||
                  m.text.trim().length > 0 ||
                  (m.listings?.length ?? 0) > 0,
              ),
            }
          : t,
      ),
    );
  }, []);

  /**
   * Stream one assistant turn into `threadId`. `history` already ends with
   * the user's newest message. Any previous stream is aborted first.
   */
  const runAssistant = useCallback(
    async (threadId: string, history: AssistantTurn[], serverId?: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const seq = ++streamSeq.current;

      const assistantId = makeId();
      setThreads((prev) =>
        prev.map((t) =>
          t.id === threadId
            ? {
                ...t,
                messages: [...t.messages, { id: assistantId, role: "assistant", text: "" }],
              }
            : t,
        ),
      );
      setStreamingThread(threadId);

      const setText = (text: string, error = false) =>
        patchMessage(threadId, assistantId, (m) => ({ ...m, text, error }));
      const appendText = (text: string) =>
        patchMessage(threadId, assistantId, (m) => ({ ...m, text: m.text + text }));
      const addListings = (items: AssistantListingItem[]) =>
        patchMessage(threadId, assistantId, (m) => {
          const seen = new Set((m.listings ?? []).map((l) => l.id));
          const merged = [...(m.listings ?? []), ...items.filter((l) => !seen.has(l.id))];
          return { ...m, listings: merged };
        });

      try {
        const res = await fetch("/api/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: history,
            ...(serverId ? { threadId: serverId } : {}),
          }),
          signal: controller.signal,
        });

        if (res.status === 429) {
          const j = (await res.json().catch(() => null)) as { message?: string } | null;
          setText(j?.message ?? PACE_FALLBACK_MESSAGE);
          return;
        }
        if (!res.ok || !res.body) {
          setText(NETWORK_ERROR_MESSAGE, true);
          return;
        }

        const contentType = res.headers.get("content-type") ?? "";
        if (contentType.includes("application/json")) {
          // The graceful no-key answer renders as an ordinary assistant bubble.
          const j = (await res.json().catch(() => null)) as { message?: string } | null;
          setText(j?.message ?? NETWORK_ERROR_MESSAGE, !j?.message);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let split: number;
          while ((split = buffer.indexOf("\n\n")) !== -1) {
            const chunk = buffer.slice(0, split);
            buffer = buffer.slice(split + 2);
            for (const line of chunk.split("\n")) {
              if (!line.startsWith("data:")) continue;
              let event: AssistantStreamEvent;
              try {
                event = JSON.parse(line.slice(5).trim()) as AssistantStreamEvent;
              } catch {
                continue;
              }
              if (event.type === "text") {
                appendText(event.text);
              } else if (event.type === "listings") {
                addListings(event.items);
              } else if (event.type === "thread") {
                const id = event.id;
                setThreads((prev) =>
                  prev.map((t) => (t.id === threadId ? { ...t, serverId: id } : t)),
                );
              } else if (event.type === "error") {
                const message = event.message;
                patchMessage(threadId, assistantId, (m) =>
                  m.text.trim() ? m : { ...m, text: message, error: true },
                );
              }
            }
          }
        }

        // A stream that ended with nothing to show still deserves an answer.
        patchMessage(threadId, assistantId, (m) =>
          m.text.trim() || (m.listings?.length ?? 0) > 0
            ? m
            : { ...m, text: NETWORK_ERROR_MESSAGE, error: true },
        );
      } catch {
        if (controller.signal.aborted) {
          dropMessageIfEmpty(threadId, assistantId);
          return;
        }
        setText(NETWORK_ERROR_MESSAGE, true);
      } finally {
        if (streamSeq.current === seq) setStreamingThread(null);
      }
    },
    [dropMessageIfEmpty, patchMessage],
  );

  const send = useCallback(
    (raw: string) => {
      const text = raw.trim();
      if (!text) return;
      setDraft("");

      const userMessage: Message = { id: makeId(), role: "user", text };
      let targetId: string;
      let history: AssistantTurn[];
      let serverId: string | undefined;

      const existing = activeId ? threads.find((t) => t.id === activeId) : undefined;
      if (!existing) {
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
        history = toTurns([userMessage]);
      } else {
        targetId = existing.id;
        serverId = existing.serverId;
        setThreads((prev) =>
          prev.map((t) =>
            t.id === existing.id
              ? { ...t, updatedAt: Date.now(), messages: [...t.messages, userMessage] }
              : t,
          ),
        );
        history = toTurns([...existing.messages, userMessage]);
      }

      void runAssistant(targetId, history, serverId);
    },
    [activeId, threads, runAssistant],
  );

  /** Re-run the last turn after a failure: drop the failed bubble, resend. */
  const retry = useCallback(
    (threadId: string, failedMessageId: string) => {
      const thread = threads.find((t) => t.id === threadId);
      if (!thread) return;
      const remaining = thread.messages.filter((m) => m.id !== failedMessageId);
      const history = toTurns(remaining);
      if (history.length === 0 || history[history.length - 1]?.role !== "user") return;
      setThreads((prev) =>
        prev.map((t) => (t.id === threadId ? { ...t, messages: remaining } : t)),
      );
      void runAssistant(threadId, history, thread.serverId);
    },
    [threads, runAssistant],
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
    if (streamingThread === id) {
      abortRef.current?.abort();
      setStreamingThread(null);
    }
    setThreads((prev) => prev.filter((t) => t.id !== id));
    if (activeId === id) setActiveId(null);
  };

  const clearAll = () => {
    abortRef.current?.abort();
    setStreamingThread(null);
    setThreads([]);
    setActiveId(null);
    clearStoredThreads();
    closeHistory();
    inputRef.current?.focus();
  };

  const empty = hydrated && messages.length === 0;
  const lastMessage = messages[messages.length - 1];
  const showTyping =
    streamingHere &&
    (!lastMessage ||
      lastMessage.role === "user" ||
      (lastMessage.text === "" && (lastMessage.listings?.length ?? 0) === 0));

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
    <div className="flex h-full min-h-0 w-full flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-6 lg:px-8">
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

      <div className="flex min-h-0 flex-1 gap-6">
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
            className="flex-1 space-y-5 overflow-y-auto pb-5 pr-1"
            aria-live="polite"
            aria-label="Conversation"
          >
            {empty && (
              <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
                <span className="block h-16 w-16 sm:h-16 sm:w-16">
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

            {messages.map((m) => {
              if (m.role === "user") {
                return (
                  <div key={m.id} className="nf-rise flex justify-end">
                    <p className="max-w-[85%] rounded-2xl rounded-br-md bg-[var(--nf-brand-primary)] px-4 py-2.5 text-[0.9rem] leading-relaxed text-white">
                      {m.text}
                    </p>
                  </div>
                );
              }
              // An assistant bubble appears once it has something to show.
              if (!m.text.trim() && (m.listings?.length ?? 0) === 0) return null;
              // Still streaming into this exact bubble: the avatar's ring
              // spins to signal active reasoning, real signal, no loop of
              // its own once the turn finishes.
              const thisStreaming = streamingHere && m.id === lastMessage?.id;
              return (
                <div key={m.id} className="nf-rise flex items-end gap-3">
                  <span
                    className={`h-12 w-12 shrink-0 ${thisStreaming ? "nf-bot-thinking" : ""}`}
                    aria-hidden="true"
                  >
                    <BrandIcon name="bot-home" fill />
                  </span>
                  <div className="nf-card max-w-[85%] rounded-2xl rounded-bl-md p-4">
                    {m.text.trim() && (
                      <p className="whitespace-pre-wrap text-[0.9rem] leading-relaxed text-[var(--nf-content-secondary)]">
                        {m.text}
                      </p>
                    )}
                    {m.listings && m.listings.length > 0 && (
                      <ul
                        className="mt-3 space-y-2 [perspective:700px]"
                        aria-label="Matching listings"
                      >
                        {m.listings.map((l, i) => (
                          <li
                            key={l.id}
                            className="nf-listing-fold-in"
                            style={{ "--i": i } as React.CSSProperties}
                          >
                            <ThreadListingCard listing={l} />
                          </li>
                        ))}
                      </ul>
                    )}
                    {m.error && activeId && (
                      <Button
                        variant="secondary"
                        size="sm"
                        leadingIcon="arrow-right"
                        className="mt-3"
                        onClick={() => {
                          if (activeId) retry(activeId, m.id);
                        }}
                      >
                        Retry
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}

            {showTyping && (
              <div className="nf-rise flex items-end gap-3">
                <span className="nf-bot-thinking h-12 w-12 shrink-0" aria-hidden="true">
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
            <Button
              type="submit"
              variant="primary"
              iconOnly
              aria-label="Send message"
              disabled={!draft.trim()}
              className="shrink-0 rounded-full"
            >
              <UiIcon name="arrow-right" size={18} className="-rotate-90" />
            </Button>
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

/**
 * A real catalogue result inside the thread: thumbnail, title, city, price
 * and an arrow, the whole row tappable through to the listing page.
 */
function ThreadListingCard({ listing }: { listing: AssistantListingItem }) {
  return (
    <Link
      href={listing.href}
      className="nf-card nf-card--interactive flex items-center gap-4 rounded-xl p-2.5"
    >
      <span className="relative block h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[var(--nf-glass-fill)]">
        {listing.photo && (
          <Image src={listing.photo} alt="" fill sizes="56px" className="object-cover" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.875rem] font-semibold text-[var(--nf-content-primary)]">
          {listing.title}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 text-[0.75rem] text-[var(--nf-content-muted)]">
          <span className="truncate">{listing.city}</span>
          <span className="nf-numeric flex shrink-0 items-center gap-0.5">
            <UiIcon name="star" size={11} className="text-[var(--nf-rating)]" />
            {listing.rating.toFixed(1)}
          </span>
        </span>
        <span className="nf-numeric mt-0.5 block truncate text-[0.8125rem] font-semibold text-[var(--nf-content-primary)]">
          {listing.price}
        </span>
      </span>
      <UiIcon
        name="arrow-right"
        size={16}
        className="shrink-0 text-[var(--nf-content-muted)]"
      />
    </Link>
  );
}
