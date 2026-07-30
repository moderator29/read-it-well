"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { findFaqEntry } from "@/lib/support/faq";
import { fileSupportTicket } from "@/lib/support/actions";
import type { SupportAction, SupportStreamEvent, SupportTurn } from "@/lib/support/types";

/**
 * Help and support, AI first.
 *
 * The card opens a real support conversation: replies stream token by token
 * from /api/support, where a grounded agent answers from RentMe's canonical
 * help notes and, for a signed-in person, from their own bookings and wallet
 * read under their own Row Level Security. When it should stop trying it files
 * a real support ticket and hands back the NF-SUP reference the database gave,
 * which lands in this thread as a receipt.
 *
 * Two promises the surface keeps whatever happens. Talk to a person is visible
 * at all times, never buried behind a failed answer, and it collects a name and
 * an email and nothing else. And when the platform has no model key, the route
 * says so honestly and this surface falls back to the keyword help store, so
 * support answers the common questions rather than going dark.
 *
 * The thread lives under `nf_support_thread` on this device and survives
 * navigation and reloads.
 */

type Role = "user" | "assistant";

type Message = {
  id: string;
  role: Role;
  text: string;
  /** Real surfaces this answer earned, rendered as chips under the bubble. */
  actions?: SupportAction[];
  /** Set when a ticket row was really written, by the agent or by the form. */
  reference?: string;
  /** True when this bubble carries the name and email escalation card. */
  escalating?: boolean;
  /** The question an escalation from this bubble files as the ticket body. */
  question?: string;
  error?: boolean;
};

const THREAD_KEY = "nf_support_thread";
const NAME_KEY = "nf_profile_name";
const EMAIL_KEY = "nf_profile_email";

const GREETING =
  "Hello, I am RentMe's support agent. Ask me anything about your bookings, payments, the wallet, listing a property, verification or cancellations. If you are signed in I can look at your own bookings and wallet, and I bring in a person whenever that is the right answer.";

const STARTERS = [
  "Where is my booking?",
  "How do cancellations work?",
  "What is my wallet balance?",
  "How do I list my property?",
];

const HUMAN_TEXT =
  "Of course. Tell me who to reply to and I will pass this to the support team. We keep only your name and email, and use them just to answer you.";
const ESCALATION_TEXT =
  "I do not have a confident answer for that, so let me put it in front of a person. Check your details below and send it over.";
const NETWORK_ERROR_MESSAGE =
  "Support could not reach the network just now. Your message is kept; try again, or use Talk to a person.";
const PACE_FALLBACK_MESSAGE =
  "You are asking faster than support can answer. Give it a few minutes and try again.";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Quick actions the keyword fallback can offer honestly.
 *
 * When the agent is running it earns these from the tools it actually called.
 * With no key there are no tool results, so the only actions offered are the
 * ones the matched help topic guarantees: a booking answer really does belong
 * on the trips hub, a wallet answer really does belong on the wallet. Nothing
 * here claims to have read anybody's record.
 */
const FALLBACK_ACTIONS: Record<string, SupportAction | undefined> = {
  booking: { kind: "bookings", label: "Open my bookings", href: "/bookings" },
  cancellations: { kind: "bookings", label: "Open my bookings", href: "/bookings" },
  wallet: { kind: "wallet", label: "Open my wallet", href: "/wallet" },
  payments: { kind: "wallet", label: "Open my wallet", href: "/wallet" },
  "messaging-safety": { kind: "messages", label: "Message the agent", href: "/messages" },
  "rent-inspection": { kind: "messages", label: "Message the agent", href: "/messages" },
};

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadThread(): Message[] {
  try {
    const raw = window.localStorage.getItem(THREAD_KEY);
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

/** The wire history: plain text turns, empty bubbles left out. */
function toTurns(messages: Message[]): SupportTurn[] {
  return messages
    .filter((m) => m.text.trim().length > 0)
    .map((m) => ({ role: m.role, content: m.text }));
}

/** What a human picking up the ticket sees first when the person escalated. */
function transcriptSummary(messages: Message[]): string {
  const recent = messages.filter((m) => m.text.trim().length > 0).slice(-6);
  if (recent.length === 0) return "Escalated from the support chat with no earlier messages.";
  const lines = recent.map(
    (m) => `${m.role === "user" ? "Person" : "Support agent"}: ${m.text.trim()}`,
  );
  return `Conversation so far:\n${lines.join("\n")}`;
}

export function SupportChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [draft, setDraft] = useState("");
  /**
   * True once the route has told us it cannot run: no key, or the support flag
   * switched off. From then on this surface answers from the keyword help
   * store rather than asking the route the same question again.
   */
  const [keywordOnly, setKeywordOnly] = useState(false);
  const [identity, setIdentity] = useState<{ name: string; email: string }>({
    name: "",
    email: "",
  });

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  /** The latest thread, so sending reads it without re-binding the callback. */
  const messagesRef = useRef<Message[]>([]);
  const panelId = "support-chat-panel";

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    setMessages(loadThread());
    try {
      const name = window.localStorage.getItem(NAME_KEY);
      const email = window.localStorage.getItem(EMAIL_KEY);
      setIdentity({
        name: name && name.trim() ? name.trim() : "",
        email: email && email.trim() ? email.trim() : "",
      });
    } catch {
      // Defaults stand: the escalation card asks for both inline.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(THREAD_KEY, JSON.stringify(messages));
    } catch {
      // Storage full or blocked: the conversation lives in memory.
    }
  }, [messages, hydrated]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight });
  }, [messages, streaming, open]);

  /* Abort any in-flight reply when this card leaves the page. */
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const patch = useCallback((id: string, next: (m: Message) => Message) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? next(m) : m)));
  }, []);

  /** Answer from the keyword help store, escalating when nothing matches. */
  const answerFromKeywords = useCallback(
    (id: string, question: string, prefix?: string) => {
      const entry = findFaqEntry(question);
      const answer = entry?.answer ?? null;
      const action = entry ? FALLBACK_ACTIONS[entry.id] : undefined;
      patch(id, (m) => ({
        ...m,
        text: answer
          ? prefix
            ? `${prefix}\n\n${answer}`
            : answer
          : (prefix ?? ESCALATION_TEXT),
        ...(action ? { actions: [action] } : {}),
        ...(answer ? {} : { escalating: true, question }),
      }));
    },
    [patch],
  );

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || streaming) return;
      setDraft("");

      const userMessage: Message = { id: makeId(), role: "user", text };
      const replyId = makeId();
      const history: SupportTurn[] = toTurns([...messagesRef.current, userMessage]);
      setMessages((prev) => [
        ...prev,
        userMessage,
        { id: replyId, role: "assistant" as const, text: "" },
      ]);

      // Already told the platform cannot answer: stay local, stay useful.
      if (keywordOnly) {
        answerFromKeywords(replyId, text);
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setStreaming(true);

      try {
        const res = await fetch("/api/support", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history }),
          signal: controller.signal,
        });

        if (res.status === 429) {
          const j = (await res.json().catch(() => null)) as { message?: string } | null;
          patch(replyId, (m) => ({ ...m, text: j?.message ?? PACE_FALLBACK_MESSAGE }));
          return;
        }
        if (!res.ok || !res.body) {
          patch(replyId, (m) => ({ ...m, text: NETWORK_ERROR_MESSAGE, error: true }));
          return;
        }

        const contentType = res.headers.get("content-type") ?? "";
        if (contentType.includes("application/json")) {
          // The honest unconfigured answer, rendered as an ordinary reply, with
          // the keyword store carrying the question from here on.
          const j = (await res.json().catch(() => null)) as { message?: string } | null;
          setKeywordOnly(true);
          answerFromKeywords(replyId, text, j?.message ?? NETWORK_ERROR_MESSAGE);
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
              let event: SupportStreamEvent;
              try {
                event = JSON.parse(line.slice(5).trim()) as SupportStreamEvent;
              } catch {
                continue;
              }
              if (event.type === "text") {
                const slice = event.text;
                patch(replyId, (m) => ({ ...m, text: m.text + slice }));
              } else if (event.type === "actions") {
                const items = event.items;
                patch(replyId, (m) => ({ ...m, actions: items }));
              } else if (event.type === "ticket") {
                const reference = event.reference;
                patch(replyId, (m) => ({ ...m, reference }));
              } else if (event.type === "error") {
                const message = event.message;
                patch(replyId, (m) =>
                  m.text.trim() ? m : { ...m, text: message, error: true },
                );
              }
            }
          }
        }

        // A reply that arrived empty still deserves a way forward.
        patch(replyId, (m) =>
          m.text.trim()
            ? m
            : { ...m, text: ESCALATION_TEXT, escalating: true, question: text },
        );
      } catch {
        if (controller.signal.aborted) return;
        patch(replyId, (m) => ({ ...m, text: NETWORK_ERROR_MESSAGE, error: true }));
      } finally {
        setStreaming(false);
      }
    },
    [answerFromKeywords, keywordOnly, patch, streaming],
  );

  /** Talk to a person: always available, never behind a failed answer. */
  const askForHuman = () => {
    const lastQuestion = [...messages].reverse().find((m) => m.role === "user")?.text ?? "";
    setMessages((prev) => [
      ...prev,
      { id: makeId(), role: "user", text: "I would like to talk to a person." },
      {
        id: makeId(),
        role: "assistant",
        text: HUMAN_TEXT,
        escalating: true,
        question: lastQuestion || "Asked to speak to a person from the support chat.",
      },
    ]);
  };

  const markFiled = (messageId: string, reference: string) => {
    patch(messageId, (m) => ({ ...m, reference }));
  };

  const clearConversation = () => {
    abortRef.current?.abort();
    setStreaming(false);
    setMessages([]);
    try {
      window.localStorage.removeItem(THREAD_KEY);
    } catch {
      // Already cleared in memory.
    }
  };

  const empty = hydrated && messages.length === 0;
  const awaitingFirstToken =
    streaming && messages[messages.length - 1]?.text.trim().length === 0;

  return (
    <section className="nf-card p-5 sm:p-6" aria-label="Help and support">
      <div className="flex items-center gap-4">
        <span className="block h-14 w-14 shrink-0">
          <BrandIcon name="support-shield" fill />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[0.9375rem] font-semibold leading-tight">Help and support</h2>
          <p className="mt-0.5 text-[0.8125rem] text-[var(--nf-content-muted)]">
            An agent that reads your own bookings and hands you to a person when it should.
          </p>
        </div>
        <button
          type="button"
          data-testid="support-open"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
          className="nf-chip shrink-0 cursor-pointer text-[0.8125rem] font-semibold"
        >
          {open ? "Close" : "Open chat"}
        </button>
      </div>

      <div id={panelId} hidden={!open}>
        {open && (
          <div
            data-testid="support-panel"
            className="nf-rise mt-4 overflow-hidden rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)]"
          >
            <div
              ref={scrollerRef}
              className="max-h-96 min-h-52 space-y-3.5 overflow-y-auto p-4"
              aria-live="polite"
              aria-label="Support conversation"
            >
              <AgentBubble text={GREETING} />

              {empty && (
                <div className="flex flex-wrap gap-2 pl-9">
                  {STARTERS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => void send(s)}
                      className="nf-chip max-w-full cursor-pointer text-left"
                    >
                      <UiIcon name="sparkle" size={13} />
                      <span className="min-w-0 break-words">{s}</span>
                    </button>
                  ))}
                </div>
              )}

              {messages.map((m) =>
                m.role === "user" ? (
                  <div key={m.id} className="nf-rise flex justify-end">
                    <p className="max-w-[85%] break-words rounded-2xl rounded-br-md bg-[var(--nf-brand-primary)] px-3.5 py-2 text-[0.875rem] leading-relaxed text-white">
                      {m.text}
                    </p>
                  </div>
                ) : m.text.trim() || m.escalating || m.reference ? (
                  <AgentBubble key={m.id} text={m.text} error={m.error}>
                    {m.actions && m.actions.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        {m.actions.map((action) => (
                          <Link
                            key={action.kind}
                            href={action.href}
                            className="nf-chip max-w-full cursor-pointer text-[0.75rem] font-semibold"
                          >
                            <UiIcon name={ACTION_GLYPH[action.kind]} size={13} />
                            <span className="min-w-0 break-words">{action.label}</span>
                          </Link>
                        ))}
                      </div>
                    )}

                    {m.reference ? (
                      <TicketReceipt reference={m.reference} />
                    ) : (
                      m.escalating && (
                        <EscalationCard
                          defaultName={identity.name}
                          defaultEmail={identity.email}
                          question={m.question ?? m.text}
                          summary={transcriptSummary(messages)}
                          onFiled={(reference) => markFiled(m.id, reference)}
                        />
                      )
                    )}
                  </AgentBubble>
                ) : null,
              )}

              {awaitingFirstToken && (
                <div className="nf-rise flex items-end gap-3">
                  <span className="h-6.5 w-6.5 shrink-0" aria-hidden="true">
                    <BrandIcon name="bot-chat" fill />
                  </span>
                  <div
                    className="rounded-2xl rounded-bl-md border border-[var(--nf-border-subtle)] bg-[var(--nf-surface-inset)] px-3.5 py-3"
                    aria-label="Support is typing"
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

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void send(draft);
              }}
              className="flex items-center gap-2 border-t border-[var(--nf-border-subtle)] p-3"
            >
              <label htmlFor="support-input" className="sr-only">
                Message support
              </label>
              <input
                id="support-input"
                data-testid="support-input"
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Ask about a booking, a payment or your account"
                autoComplete="off"
                enterKeyHint="send"
                className="nf-field min-w-0 flex-1"
              />
              <button
                type="submit"
                aria-label="Send message"
                data-testid="support-send"
                disabled={!draft.trim() || streaming}
                className="nf-btn nf-btn--primary h-10 w-10 shrink-0 rounded-full p-0 disabled:opacity-60"
              >
                <UiIcon name="arrow-right" size={16} className="-rotate-90" />
              </button>
            </form>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[var(--nf-border-subtle)] p-3">
              <button
                type="button"
                data-testid="support-human"
                onClick={askForHuman}
                className="inline-flex min-w-0 cursor-pointer items-center gap-1.5 text-[0.8125rem] font-semibold text-[var(--nf-content-primary)]"
              >
                <UiIcon name="user" size={14} className="shrink-0" />
                Talk to a person
              </button>
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={clearConversation}
                  className="text-[0.8125rem] font-medium text-[var(--nf-content-muted)] transition-colors hover:text-[var(--nf-content-primary)]"
                >
                  Clear conversation
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/** Navigation glyphs for the quick actions; content icons never go here. */
const ACTION_GLYPH: Record<SupportAction["kind"], "calendar-booking" | "wallet" | "chat-bubble" | "user"> = {
  bookings: "calendar-booking",
  wallet: "wallet",
  messages: "chat-bubble",
  "sign-in": "user",
};

function AgentBubble({
  text,
  error,
  children,
}: {
  text: string;
  error?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="nf-rise flex items-end gap-3">
      <span className="h-6.5 w-6.5 shrink-0" aria-hidden="true">
        <BrandIcon name="bot-chat" fill />
      </span>
      <div className="min-w-0 max-w-[85%] rounded-2xl rounded-bl-md border border-[var(--nf-border-subtle)] bg-[var(--nf-surface-inset)] px-3.5 py-2.5">
        {text.trim() && (
          <p
            data-testid="support-reply"
            className={`whitespace-pre-wrap break-words text-[0.875rem] leading-relaxed ${
              error ? "text-[var(--nf-state-error)]" : "text-[var(--nf-content-secondary)]"
            }`}
          >
            {text}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}

/** The receipt. Only ever rendered from a reference the database returned. */
function TicketReceipt({ reference }: { reference: string }) {
  return (
    <div
      data-testid="support-receipt"
      className="mt-3 rounded-[var(--nf-radius-sm)] border border-[color-mix(in_oklab,var(--nf-brand-primary)_35%,transparent)] bg-[color-mix(in_oklab,var(--nf-brand-primary)_8%,transparent)] p-3"
    >
      <p className="flex items-start gap-1.5 text-[0.8125rem] font-semibold text-[var(--nf-electric-300)]">
        <UiIcon name="verified" size={14} className="mt-0.5 shrink-0" />
        <span className="min-w-0 break-words">
          Ticket {reference} is filed. A person replies by email.
        </span>
      </p>
      <p className="mt-2 text-[0.75rem] leading-relaxed text-[var(--nf-content-muted)]">
        We keep only the name and email you gave here, and use them just to
        reply to this ticket.
      </p>
    </div>
  );
}

/**
 * Escalation card. Collects a name and an email and nothing else, validates
 * both, files the ticket through the server action, and shows the real NF-SUP
 * reference the database returned. When the platform cannot file yet, the
 * action's honest message is shown instead of pretending a ticket exists.
 */
function EscalationCard({
  defaultName,
  defaultEmail,
  question,
  summary,
  onFiled,
}: {
  defaultName: string;
  defaultEmail: string;
  question: string;
  summary: string;
  onFiled: (reference: string) => void;
}) {
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string }>({});
  const [note, setNote] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    const errors: { name?: string; email?: string } = {};
    if (!name.trim()) errors.name = "Add your name so we know who to reply to.";
    if (!email.trim()) errors.email = "Add an email address so we can reply.";
    else if (!EMAIL_RE.test(email.trim())) errors.email = "Enter a valid email address.";
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setNote(null);
    startTransition(async () => {
      const result = await fileSupportTicket({
        name: name.trim(),
        email: email.trim(),
        topic: "Support chat escalation",
        body: question,
        summary,
      });
      if (result.ok) {
        onFiled(result.data.reference);
      } else {
        setFieldErrors({
          ...(result.fieldErrors?.name ? { name: result.fieldErrors.name } : {}),
          ...(result.fieldErrors?.email ? { email: result.fieldErrors.email } : {}),
        });
        setNote(result.error);
      }
    });
  };

  return (
    <div
      data-testid="support-escalation"
      className="mt-3 rounded-[var(--nf-radius-sm)] border border-[color-mix(in_oklab,var(--nf-brand-primary)_35%,transparent)] bg-[color-mix(in_oklab,var(--nf-brand-primary)_8%,transparent)] p-3"
    >
      <p className="flex items-center gap-1.5 text-[0.8125rem] font-semibold text-[var(--nf-electric-300)]">
        <UiIcon name="user" size={14} className="shrink-0" />
        Bring in a person
      </p>

      <div className="mt-2.5 space-y-2.5">
        <div>
          <label
            htmlFor="support-escalation-name"
            className="mb-1 block text-[0.75rem] font-medium text-[var(--nf-content-muted)]"
          >
            Name
          </label>
          <input
            id="support-escalation-name"
            data-testid="support-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            className="nf-field w-full py-2 text-[0.8438rem]"
            aria-invalid={fieldErrors.name ? "true" : undefined}
          />
          {fieldErrors.name && (
            <p
              data-testid="support-name-error"
              className="mt-1 text-[0.75rem] text-[var(--nf-state-error)]"
            >
              {fieldErrors.name}
            </p>
          )}
        </div>
        <div>
          <label
            htmlFor="support-escalation-email"
            className="mb-1 block text-[0.75rem] font-medium text-[var(--nf-content-muted)]"
          >
            Email
          </label>
          <input
            id="support-escalation-email"
            data-testid="support-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            inputMode="email"
            className="nf-field w-full py-2 text-[0.8438rem]"
            aria-invalid={fieldErrors.email ? "true" : undefined}
          />
          {fieldErrors.email && (
            <p
              data-testid="support-email-error"
              className="mt-1 text-[0.75rem] text-[var(--nf-state-error)]"
            >
              {fieldErrors.email}
            </p>
          )}
        </div>
      </div>

      {note && (
        <p className="mt-2 text-[0.75rem] leading-relaxed text-[var(--nf-content-muted)]">{note}</p>
      )}

      <button
        type="button"
        data-testid="support-file"
        onClick={submit}
        disabled={pending}
        className="nf-btn nf-btn--primary mt-3 w-full py-2 text-[0.8125rem] disabled:opacity-60"
      >
        {pending ? "Filing your ticket" : "File the ticket"}
      </button>

      <p className="mt-2 text-[0.75rem] leading-relaxed text-[var(--nf-content-muted)]">
        We collect only the name and email above, and use them just to reply to
        this question.
      </p>
    </div>
  );
}
