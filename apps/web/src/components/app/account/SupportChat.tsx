"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { findFaqAnswer } from "@/lib/support/faq";
import { fileSupportTicket } from "@/lib/support/actions";

/**
 * Help and support.
 *
 * A card that opens an inline support conversation. The assistant answers the
 * questions people actually ask from the shared knowledge base in
 * `lib/support/faq`, covering bookings, payments, the wallet, listing a
 * property, verification, cancellations, languages, privacy and more.
 * Anything outside that knowledge is escalated for real: the escalation card
 * collects a name and email only, files a support ticket through the server
 * action, and shows the returned NF-SUP reference. The thread persists under
 * `nf_support_thread` on this device and survives navigation and reloads.
 */

type Role = "user" | "assistant";
type Message = {
  id: string;
  role: Role;
  text: string;
  escalated?: boolean;
  /** The original question an escalated message will file as the ticket body. */
  question?: string;
  /** Set once the ticket is filed; the card then shows the receipt. */
  reference?: string;
};

const THREAD_KEY = "nf_support_thread";
const NAME_KEY = "nf_profile_name";
const EMAIL_KEY = "nf_profile_email";

const GREETING =
  "Hello, I am the RentMe support assistant. Ask me about bookings, payments, the wallet, listing a property, verification or cancellations.";

const ESCALATION_TEXT =
  "I do not have that answer in my notes, so let me file it with our human support team. Check your details below and send it over.";

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

const STARTERS = [
  "How do bookings work?",
  "How do I pay?",
  "How do I list my property?",
  "How do cancellations work?",
];

export function SupportChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState("");
  const [identity, setIdentity] = useState<{ name: string; email: string }>({
    name: "Guest",
    email: "",
  });

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const replyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelId = "support-chat-panel";

  useEffect(() => {
    setMessages(loadThread());
    try {
      const name = window.localStorage.getItem(NAME_KEY);
      const email = window.localStorage.getItem(EMAIL_KEY);
      setIdentity({
        name: name && name.trim() ? name.trim() : "Guest",
        email: email && email.trim() ? email.trim() : "",
      });
    } catch {
      // Defaults stand: the escalation card asks for details inline.
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
  }, [messages, typing, open]);

  useEffect(() => {
    return () => {
      if (replyTimer.current) clearTimeout(replyTimer.current);
    };
  }, []);

  const send = (raw: string) => {
    const text = raw.trim();
    if (!text || typing) return;
    setDraft("");
    setMessages((prev) => [...prev, { id: makeId(), role: "user", text }]);
    setTyping(true);
    const answer = findFaqAnswer(text);
    replyTimer.current = setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        answer
          ? { id: makeId(), role: "assistant", text: answer }
          : {
              id: makeId(),
              role: "assistant",
              escalated: true,
              question: text,
              text: ESCALATION_TEXT,
            },
      ]);
      setTyping(false);
    }, 650);
  };

  /** Called by the escalation card once the server confirms the ticket. */
  const markFiled = (messageId: string, reference: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, reference } : m)),
    );
  };

  const clearConversation = () => {
    if (replyTimer.current) clearTimeout(replyTimer.current);
    setTyping(false);
    setMessages([]);
    try {
      window.localStorage.removeItem(THREAD_KEY);
    } catch {
      // Already cleared in memory.
    }
  };

  const empty = hydrated && messages.length === 0;

  return (
    <section className="nf-card p-5 sm:p-6" aria-label="Help and support">
      <div className="flex items-center gap-4">
        <span className="block h-14 w-14 shrink-0">
          <BrandIcon name="support-chat" fill />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[0.9375rem] font-semibold leading-tight">Help and support</h2>
          <p className="mt-0.5 text-[0.8125rem] text-[var(--nf-content-muted)]">
            Instant answers, with escalation to the human team.
          </p>
        </div>
        <button
          type="button"
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
          <div className="nf-rise mt-4 overflow-hidden rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)]">
            <div
              ref={scrollerRef}
              className="max-h-80 min-h-48 space-y-3.5 overflow-y-auto p-4"
              aria-live="polite"
              aria-label="Support conversation"
            >
              <AssistantBubble text={GREETING} />

              {empty && (
                <div className="flex flex-wrap gap-2 pl-9">
                  {STARTERS.map((s) => (
                    <button key={s} type="button" onClick={() => send(s)} className="nf-chip cursor-pointer">
                      <UiIcon name="sparkle" size={13} />
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {messages.map((m) =>
                m.role === "user" ? (
                  <div key={m.id} className="nf-rise flex justify-end">
                    <p className="max-w-[85%] rounded-2xl rounded-br-md bg-[var(--nf-brand-primary)] px-3.5 py-2 text-[0.875rem] leading-relaxed text-white">
                      {m.text}
                    </p>
                  </div>
                ) : (
                  <AssistantBubble key={m.id} text={m.text}>
                    {m.escalated && (
                      <EscalationCard
                        defaultName={identity.name}
                        defaultEmail={identity.email}
                        question={m.question ?? m.text}
                        reference={m.reference}
                        onFiled={(reference) => markFiled(m.id, reference)}
                      />
                    )}
                  </AssistantBubble>
                ),
              )}

              {typing && (
                <div className="nf-rise flex items-end gap-3">
                  <span className="h-6.5 w-6.5 shrink-0" aria-hidden="true">
                    <BrandIcon name="support-chat" fill />
                  </span>
                  <div
                    className="rounded-2xl rounded-bl-md border border-[var(--nf-border-subtle)] px-3.5 py-3"
                    aria-label="Support assistant is typing"
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
                send(draft);
              }}
              className="flex items-center gap-2 border-t border-[var(--nf-border-subtle)] p-3"
            >
              <label htmlFor="support-input" className="sr-only">
                Message support
              </label>
              <input
                id="support-input"
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Ask about bookings, payments, cancellations"
                autoComplete="off"
                enterKeyHint="send"
                className="nf-field min-w-0 flex-1"
              />
              <button
                type="submit"
                aria-label="Send message"
                disabled={!draft.trim() || typing}
                className="nf-btn nf-btn--primary h-10 w-10 shrink-0 rounded-full p-0"
              >
                <UiIcon name="arrow-right" size={16} className="-rotate-90" />
              </button>
            </form>

            {messages.length > 0 && (
              <div className="border-t border-[var(--nf-border-subtle)] p-3 pt-2.5">
                <button
                  type="button"
                  onClick={clearConversation}
                  className="text-[0.8125rem] font-medium text-[var(--nf-content-muted)] transition-colors hover:text-[var(--nf-content-primary)]"
                >
                  Clear conversation
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function AssistantBubble({ text, children }: { text: string; children?: React.ReactNode }) {
  return (
    <div className="nf-rise flex items-end gap-3">
      <span className="h-6.5 w-6.5 shrink-0" aria-hidden="true">
        <BrandIcon name="support-chat" fill />
      </span>
      <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-[var(--nf-border-subtle)] px-3.5 py-2.5">
        <p className="text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">{text}</p>
        {children}
      </div>
    </div>
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Escalation card. Collects a name and email only, validates them, files the
 * ticket through the server action, and shows the real NF-SUP reference the
 * database returned. When the platform cannot file yet, the action's honest
 * message is shown instead of pretending a ticket exists.
 */
function EscalationCard({
  defaultName,
  defaultEmail,
  question,
  reference,
  onFiled,
}: {
  defaultName: string;
  defaultEmail: string;
  question: string;
  reference?: string;
  onFiled: (reference: string) => void;
}) {
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string }>({});
  const [note, setNote] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (reference) {
    return (
      <div className="mt-3 rounded-[var(--nf-radius-sm)] border border-[color-mix(in_oklab,var(--nf-brand-primary)_35%,transparent)] bg-[color-mix(in_oklab,var(--nf-brand-primary)_8%,transparent)] p-3">
        <p className="flex items-center gap-1.5 text-[0.8125rem] font-semibold text-[var(--nf-electric-300)]">
          <UiIcon name="verified" size={14} className="shrink-0" />
          Ticket {reference} is filed. We reply by email.
        </p>
        <p className="mt-2 text-[0.75rem] leading-relaxed text-[var(--nf-content-muted)]">
          We keep only the name and email you gave here, and use them just to
          reply to this ticket.
        </p>
      </div>
    );
  }

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
    <div className="mt-3 rounded-[var(--nf-radius-sm)] border border-[color-mix(in_oklab,var(--nf-brand-primary)_35%,transparent)] bg-[color-mix(in_oklab,var(--nf-brand-primary)_8%,transparent)] p-3">
      <p className="flex items-center gap-1.5 text-[0.8125rem] font-semibold text-[var(--nf-electric-300)]">
        <UiIcon name="verified" size={14} className="shrink-0" />
        Escalate to the human team
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
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            className="nf-field w-full py-2 text-[0.8438rem]"
            aria-invalid={fieldErrors.name ? "true" : undefined}
          />
          {fieldErrors.name && (
            <p className="mt-1 text-[0.75rem] text-[var(--nf-state-error)]">{fieldErrors.name}</p>
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
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            inputMode="email"
            className="nf-field w-full py-2 text-[0.8438rem]"
            aria-invalid={fieldErrors.email ? "true" : undefined}
          />
          {fieldErrors.email && (
            <p className="mt-1 text-[0.75rem] text-[var(--nf-state-error)]">{fieldErrors.email}</p>
          )}
        </div>
      </div>

      {note && (
        <p className="mt-2 text-[0.75rem] leading-relaxed text-[var(--nf-content-muted)]">{note}</p>
      )}

      <button
        type="button"
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
