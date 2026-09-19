"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useOverlay } from "@/lib/ui/use-overlay";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogoMark } from "@/design-system/brand/Logo";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import {
  formatNumber,
  formatRating,
  getDictionary,
  type Dictionary,
  type Locale,
} from "@vallo/i18n";
import type {
  AssistantListingItem,
  AssistantStreamEvent,
  AssistantTurn,
} from "@/lib/assistant/types";
import { canGoBackInApp } from "@/lib/ui/history";
import { SaveButton, useSaveControl } from "@/components/app/SaveControl";
import {
  AssistantSidebar,
  type Language,
  type Tone,
} from "./AssistantSidebar";
import { AssistantSettingsSheet } from "./AssistantSettingsSheet";
import {
  clearStoredThreads,
  deriveTitle,
  loadThreads,
  makeId,
  saveThreads,
  type Message,
  type Thread,
} from "./threads";

/**
 * Vallo AI, to its governing image (`docs/design/references/BF49B814`).
 *
 * The header pair under the chrome (the name and "Always here. Ask
 * anything."), the thread as bubbles (mine brand blue on the right with the
 * time and the ticks, the assistant's glass on the left with the concierge
 * object beside it), the real catalogue results as two-up cards inside the
 * thread, the thinking pill while the model works, the suggestion chips on a
 * rail above the composer, and the composer with the sparkle in its well.
 *
 * WHAT IS REAL, because every control on this screen does its thing:
 *
 *   Replies stream live from /api/assistant: text lands token by token in
 *   the bubble, and when the concierge searches the catalogue the results
 *   render as cards linking to the listing, each with a working save.
 *   The chips send their question. The ticks appear on a message once the
 *   assistant has answered it. The settings button opens the real settings
 *   sheet (reply style, language, clear history). The history button opens
 *   the drawer of past conversations, which live under `nf_ai_threads` on
 *   this device. Sending again or leaving the page aborts any in-flight
 *   stream. Signed in, the server returns a durable conversation id, kept on
 *   the thread as `serverId` so future turns append to the same row.
 *
 * THE CARDS CARRY ONLY WHAT THE ROUTE STREAMS. The wire type now carries the
 * facts the render shows (the Verified mark, beds, baths and floor area),
 * each read off the repository row and omitted when the lister stated
 * nothing, so a card here draws exactly what the search page's card draws
 * for the same listing and never a picture of a fact.
 *
 * The chrome strings (the name pair, the prompts, the composer's placeholder,
 * the thinking word) come from `home.assistant` in the dictionary, so the
 * three other languages reach them.
 */

const NETWORK_ERROR_MESSAGE =
  "The assistant could not reach the network. Your message is kept; tap retry.";
const PACE_FALLBACK_MESSAGE =
  "You are moving faster than the assistant can think. Give it a few minutes and try again.";

/*
 * THE OPENING PROMPTS, AND WHY THESE.
 *
 * Each asks what this platform, specifically, can answer: a real budget in
 * the unit rent is actually quoted in, the move-in total it computes, the
 * power columns no competitor carries, and the shortlet market. A starter
 * that cannot be answered teaches somebody the assistant does not work, so
 * nothing here is a mood the catalogue has no inventory for.
 */
const STARTERS: { icon: UiIconName; key: keyof Dictionary["home"]["assistant"]["chips"] }[] = [
  { icon: "search", key: "lekki" },
  { icon: "wallet", key: "moveIn" },
  { icon: "bolt", key: "generator" },
  { icon: "calendar-booking", key: "shortlets" },
];

const DRAWER_EXIT_MS = 240;

const TIME = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Lagos",
  hour: "2-digit",
  minute: "2-digit",
});

/** Turns a thread's visible messages into the wire history for the route. */
function toTurns(messages: Message[]): AssistantTurn[] {
  return messages
    .filter((m) => m.text.trim().length > 0)
    .map((m) => ({ role: m.role, content: m.text }));
}

export function AssistantChat({
  locale,
  viewer,
  seed,
}: {
  locale: Locale;
  /** The signed-in person, for the mark beside their own bubbles. Absent for a guest. */
  viewer?: { initials: string; avatarUrl: string } | undefined;
  /**
   * Fixture conversations for the dev preview harness only. When present
   * they replace the device's stored threads and are never written back, so
   * a screenshot of a conversation costs nobody their real history.
   */
  seed?: { threads: Thread[]; thinking?: boolean };
}) {
  const router = useRouter();
  const t = getDictionary(locale);
  const copy = t.home.assistant;
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [streamingThread, setStreamingThread] = useState<string | null>(null);
  const [tone, setTone] = useState<Tone>("Concise");
  const [language, setLanguage] = useState<Language>("English");
  const [draft, setDraft] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);

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
  const historyRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const streamSeq = useRef(0);

  /* Restore saved conversations once on mount, then persist every change.
     A seeded preview restores the fixtures instead and persists nothing. */
  useEffect(() => {
    const restored = seed ? seed.threads : loadThreads();
    setThreads(restored);
    const latest = [...restored].sort((a, b) => b.updatedAt - a.updatedAt)[0];
    if (latest) setActiveId(latest.id);
    if (seed?.thinking && latest) setStreamingThread(latest.id);
    setHydrated(true);
  }, [seed]);

  useEffect(() => {
    if (!hydrated || seed) return;
    saveThreads(threads);
  }, [threads, hydrated, seed]);

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

  /* The history drawer had Escape only: the page scrolled behind it and Tab
     walked straight out into the conversation it was covering. */
  useOverlay({ open: historyOpen, onClose: closeHistory, panelRef: historyRef });

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
                messages: [
                  ...t.messages,
                  { id: assistantId, role: "assistant", text: "", at: Date.now() },
                ],
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

      const userMessage: Message = { id: makeId(), role: "user", text, at: Date.now() };
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
    if (!seed) clearStoredThreads();
    closeHistory();
    inputRef.current?.focus();
  };

  const back = () => {
    if (canGoBackInApp()) router.back();
    else router.push("/home");
  };

  const empty = hydrated && messages.length === 0;
  const lastMessage = messages[messages.length - 1];
  const showThinking =
    streamingHere &&
    (!lastMessage ||
      lastMessage.role === "user" ||
      (lastMessage.text === "" && (lastMessage.listings?.length ?? 0) === 0));

  const sidebar = () => (
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
    />
  );

  return (
    <div className="nf-ai px-md pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-lg lg:px-xl">
      {/* --------------------------------------------------------- header */}
      {/* This route is immersive, so this bar is the whole chrome: back, the
          lockup, history on a phone, settings; then the name pair beneath. */}
      <div className="nf-ai__bar">
        <button
          type="button"
          aria-label="Back"
          onClick={back}
          className="nf-icon-btn h-11 w-11 shrink-0"
        >
          <UiIcon name="arrow-left" size={20} />
        </button>
        <Link href="/home" aria-label="Vallo home" className="nf-ai__lockup nf-tap">
          <LogoMark size={32} />
          <Image
            src="/brand/vallo-wordmark.png"
            alt=""
            width={72}
            height={15}
            priority
            className="nf-ai__word"
          />
        </Link>
        <div className="nf-ai__bar-actions">
          <button
            type="button"
            aria-label="Conversation history"
            aria-expanded={historyOpen}
            onClick={openHistory}
            className="nf-icon-btn h-11 w-11 lg:hidden"
          >
            <UiIcon name="history" size={20} />
          </button>
          <button
            type="button"
            aria-label="Assistant settings"
            aria-haspopup="dialog"
            onClick={() => setSettingsOpen(true)}
            className="nf-icon-btn h-11 w-11"
          >
            <UiIcon name="sliders" size={20} />
          </button>
        </div>
      </div>
      <div className="nf-ai__ident">
        <h1 className="nf-ai__title">{copy.title}</h1>
        <p className="nf-ai__sub">{copy.sub}</p>
      </div>

      <div className="flex min-h-0 flex-1 gap-lg">
        {/* --------------------------------------------- desktop sidebar */}
        <aside
          aria-label="Assistant navigation"
          className="nf-card hidden w-72 shrink-0 overflow-hidden lg:block"
        >
          {sidebar()}
        </aside>

        {/* ------------------------------------------------- thread area */}
        <section className="mx-auto flex h-full min-h-0 w-full max-w-2xl flex-1 flex-col lg:mx-0 lg:max-w-none">
          <div
            ref={scrollerRef}
            className="nf-ai__thread"
            aria-live="polite"
            aria-label="Conversation"
          >
            {empty && (
              <div className="flex flex-1 flex-col items-center justify-center gap-md py-section-tight text-center">
                <span className="block h-24 w-24">
                  <BrandIcon name="bot" fill />
                </span>
                <div>
                  <p className="nf-h3">How can I help today?</p>
                  <p className="nf-body-sm mx-auto mt-2xs max-w-[36ch] text-[var(--nf-content-muted)]">
                    Ask about places to rent, buy or stay in across Nigeria, and what moving in
                    really costs.
                  </p>
                </div>
              </div>
            )}

            {messages.map((m, index) => {
              const stamp = m.at ? TIME.format(new Date(m.at)) : "";
              if (m.role === "user") {
                /* The ticks say the assistant has answered this one: a reply
                   follows it in the thread. Nothing here claims "read". */
                const answered = messages.slice(index + 1).some((n) => n.role === "assistant");
                return (
                  <div key={m.id} className="nf-rise nf-ai__turn nf-ai__turn--mine">
                    <div className="nf-ai__bubble nf-ai__bubble--mine">
                      {m.text}
                      {(stamp || answered) && (
                        <span className="nf-ai__stamp nf-numeric">
                          {stamp}
                          {answered && (
                            <span className="nf-ai__ticks" aria-label="Answered">
                              <UiIcon name="verified" size={12} />
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                    {viewer && (
                      <span className="nf-ai__me" aria-hidden="true">
                        {viewer.avatarUrl ? (
                          /* A storage URL signed for this reader, so next/image
                             would only add a hop to a link that expires. */
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={viewer.avatarUrl} alt="" width={36} height={36} />
                        ) : (
                          viewer.initials
                        )}
                      </span>
                    )}
                  </div>
                );
              }
              // An assistant bubble appears once it has something to show.
              if (!m.text.trim() && (m.listings?.length ?? 0) === 0) return null;
              const thisStreaming = streamingHere && m.id === lastMessage?.id;
              return (
                <div key={m.id} className="nf-rise flex flex-col gap-xs">
                  {m.text.trim() && (
                    <div className="nf-ai__turn">
                      <span
                        className={`nf-ai__avatar ${thisStreaming ? "nf-bot-thinking" : ""}`}
                        aria-hidden="true"
                      >
                        <BrandIcon name="bot" size={28} />
                      </span>
                      <div className="nf-ai__bubble nf-ai__bubble--theirs">
                        {m.text}
                        {stamp && <span className="nf-ai__stamp nf-numeric">{stamp}</span>}
                        {m.error && activeId && (
                          <button
                            type="button"
                            onClick={() => {
                              if (activeId) retry(activeId, m.id);
                            }}
                            className="nf-btn nf-btn--glass nf-btn--sm mt-sm"
                          >
                            <UiIcon name="arrow-right" size={16} />
                            <span className="nf-btn__label">Retry</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  {m.listings && m.listings.length > 0 && (
                    <ul className="nf-ai__results" aria-label="Matching listings">
                      {m.listings.map((l, i) => (
                        <li
                          key={l.id}
                          className="nf-listing-fold-in min-w-0"
                          style={{ "--i": i } as React.CSSProperties}
                        >
                          <ThreadListingCard listing={l} locale={locale} t={t} />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}

            {showThinking && (
              <div className="nf-rise nf-ai__turn" aria-label="Vallo AI is thinking">
                <span className="nf-ai__thinking">
                  <span className="nf-ai__ring" aria-hidden="true" />
                  {copy.thinking}
                </span>
              </div>
            )}
          </div>

          {/* ---------------------------------------------- suggestions */}
          <div className="nf-ai__chips" role="group" aria-label="Suggested questions">
            {STARTERS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => send(copy.chips[s.key])}
                disabled={streamingHere}
                className="nf-ai__chip nf-tap"
              >
                <UiIcon name={s.icon} size={20} />
                {copy.chips[s.key]}
              </button>
            ))}
          </div>

          {/* ----------------------------------------------------- composer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(draft);
            }}
            className="nf-ai__composer"
          >
            <label htmlFor="assistant-input" className="sr-only">
              Message Vallo AI
            </label>
            <div className="nf-ai__well nf-focus-well">
              <UiIcon name="sparkle" size={20} />
              <input
                id="assistant-input"
                ref={inputRef}
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={copy.placeholder}
                autoComplete="off"
                enterKeyHint="send"
                className="nf-ai__input"
              />
            </div>
            <button
              type="submit"
              aria-label="Send message"
              disabled={!draft.trim()}
              className="nf-btn nf-btn--primary nf-btn--icon nf-ai__send"
            >
              <UiIcon name="arrow-up" size={24} />
            </button>
          </form>
        </section>
      </div>

      <AssistantSettingsSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        tone={tone}
        language={language}
        onToneChange={setTone}
        onLanguageChange={setLanguage}
        onClearAll={clearAll}
        threadCount={threads.length}
      />

      {/* ------------------------------------------------- mobile drawer */}
      {historyOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close conversation history"
            onClick={closeHistory}
            className={`absolute inset-0 bg-[var(--nf-overlay-backdrop)] transition-opacity duration-200 ${
              historyShown ? "opacity-100" : "opacity-0"
            }`}
          />
          <div
            ref={historyRef}
            role="dialog"
            aria-modal="true"
            aria-label="Conversation history"
            className={`nf-card absolute inset-y-0 left-0 flex w-80 max-w-[85vw] flex-col rounded-l-none transition-transform duration-200 ease-out ${
              historyShown ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <div className="flex items-center justify-between border-b border-[var(--nf-border-subtle)] py-xs pl-md pr-xs">
              <p className="text-[var(--nf-text-body-sm)] font-semibold">Conversations</p>
              <button
                type="button"
                aria-label="Close conversation history"
                onClick={closeHistory}
                className="nf-icon-btn h-9 w-9"
              >
                <UiIcon name="close" size={16} />
              </button>
            </div>
            <div className="min-h-0 flex-1">{sidebar()}</div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * A real catalogue result inside the thread, in the render's card anatomy:
 * the photograph with the Verified mark and a working save on it, the title,
 * where it is, the price, then beds, baths and floor area on a rule, and
 * beneath them what the place is and its rating. Every fact is one the route
 * streamed off the row; an absent one leaves no gap, the row just shrinks.
 */
function ThreadListingCard({
  listing,
  locale,
  t,
}: {
  listing: AssistantListingItem;
  locale: Locale;
  t: Dictionary;
}) {
  const save = useSaveControl(listing.id);
  const facts: { key: string; icon: UiIconName; label: string }[] = [];
  if (listing.bedrooms !== undefined && listing.bedrooms > 0) {
    facts.push({
      key: "beds",
      icon: "bed",
      label: `${listing.bedrooms} ${listing.bedrooms === 1 ? t.common.bed : t.common.beds}`,
    });
  }
  if (listing.bathrooms !== undefined && listing.bathrooms > 0) {
    facts.push({
      key: "baths",
      icon: "bath",
      label: `${listing.bathrooms} ${listing.bathrooms === 1 ? t.common.bath : t.common.baths}`,
    });
  }
  if (listing.sizeSqm !== undefined && listing.sizeSqm > 0) {
    facts.push({
      key: "size",
      icon: "grid",
      label: `${formatNumber(listing.sizeSqm, locale)} ${t.catalogue.card.sqm}`,
    });
  }
  return (
    <article className="nf-ai__result">
      <div className="nf-ai__result-media">
        {listing.photo && (
          <Image src={listing.photo} alt="" fill sizes="(max-width: 640px) 45vw, 240px" />
        )}
        {/* The mark means a person at Vallo checked the lister, and the wire
            carries it off the row, so it is never drawn from anything else. */}
        {listing.verified && (
          <span className="nf-ai__result-mark">
            <UiIcon name="verified" size={12} />
            {t.common.verified}
          </span>
        )}
        <SaveButton
          saved={save.saved}
          pending={save.pending}
          onToggle={save.toggle}
          title={listing.title}
          className="nf-ai__result-save h-9 w-9"
        />
      </div>
      <Link href={listing.href} className="nf-ai__result-body">
        <span className="nf-ai__result-title">{listing.title}</span>
        <span className="nf-ai__result-where">
          <UiIcon name="location" size={12} className="shrink-0" />
          <span className="truncate">{listing.city}</span>
        </span>
        <span className="nf-ai__result-price nf-numeric">{listing.price}</span>
        {facts.length > 0 && (
          <span className="nf-ai__result-facts">
            {facts.map((f) => (
              <span key={f.key} className="nf-ai__result-fact nf-numeric">
                <UiIcon name={f.icon} size={12} />
                {f.label}
              </span>
            ))}
          </span>
        )}
        <span className={`nf-ai__result-meta ${facts.length === 0 ? "nf-ai__result-facts" : ""}`}>
          <span className="nf-ai__result-fact">{listing.kind}</span>
          {listing.rating > 0 && (
            <span className="nf-ai__result-fact nf-numeric">
              <UiIcon name="star" size={12} className="text-[var(--nf-rating)]" />
              {formatRating(listing.rating, locale)}
            </span>
          )}
        </span>
      </Link>
    </article>
  );
}
