"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/design-system/icons/Icon";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * Help and support.
 *
 * A card that opens an inline support conversation. The assistant answers the
 * questions people actually ask, from a built-in knowledge base covering
 * bookings, payments, listing a property, verification and refunds. Anything
 * outside that knowledge is escalated: the assistant says so plainly and shows
 * exactly what will reach the human team and when. The thread persists under
 * `nf_support_thread` on this device and survives navigation and reloads.
 */

type Role = "user" | "assistant";
type Message = { id: string; role: Role; text: string; escalated?: boolean };

const THREAD_KEY = "nf_support_thread";
const NAME_KEY = "nf_profile_name";
const EMAIL_KEY = "nf_profile_email";

const GREETING =
  "Hello, I am the NaijaFinds support assistant. Ask me about bookings, payments, listing a property, verification or refunds.";

type FaqEntry = { keywords: string[]; answer: string };

const FAQ: FaqEntry[] = [
  {
    keywords: ["book", "reserv", "stay", "check in", "check-in", "checkin", "date"],
    answer:
      "To book a place, open it from Search, pick your dates and guests, then confirm on the booking screen. Every booking you make appears under Bookings, with its status and dates, and the host is notified straight away.",
  },
  {
    keywords: ["pay", "card", "transfer", "wallet", "price", "charge", "naira", "ngn"],
    answer:
      "Payments are made in Naira through the in-app wallet or a bank card at checkout. Your money is held safely until your check-in is confirmed, and every transaction shows in Wallet with a receipt.",
  },
  {
    keywords: ["list", "agent", "propert", "host", "landlord", "shortlet", "rent out"],
    answer:
      "To list a property, open Become an agent from your profile and complete the application: your details, your business area and a valid ID. Once approved you can publish listings, manage availability and receive bookings.",
  },
  {
    keywords: ["verif", "id", "kyc", "identity", "badge", "trust"],
    answer:
      "Verification keeps the marketplace safe. Agents submit a government ID and proof of address, and verified listings carry the blue badge so guests know a real person stands behind them. Guest verification uses your phone number and email.",
  },
  {
    keywords: ["refund", "cancel", "money back", "dispute", "complain"],
    answer:
      "If you cancel before the property's free-cancellation deadline, the full amount returns to your wallet. After the deadline, the listing's cancellation policy applies. If a place is not as described, report it within 24 hours of check-in for a full review.",
  },
  {
    keywords: ["hello", "hi", "hey", "good morning", "good afternoon", "good evening", "how far"],
    answer:
      "Hello. I can help with bookings, payments, listing a property, verification and refunds. What would you like to know?",
  },
];

function findAnswer(text: string): string | null {
  const q = text.toLowerCase();
  for (const entry of FAQ) {
    if (entry.keywords.some((k) => q.includes(k))) return entry.answer;
  }
  return null;
}

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
  "How do refunds work?",
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
      // Defaults stand: the escalation card explains how to add details.
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
    const answer = findAnswer(text);
    replyTimer.current = setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        answer
          ? { id: makeId(), role: "assistant", text: answer }
          : {
              id: makeId(),
              role: "assistant",
              escalated: true,
              text: "I do not have that answer in my notes, so I am escalating it to our human support team.",
            },
      ]);
      setTyping(false);
    }, 650);
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
      <div className="flex items-center gap-3">
        <span className="block h-9 w-9 shrink-0">
          <Icon name="help" fill />
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
                    {m.escalated && <EscalationCard name={identity.name} email={identity.email} />}
                  </AssistantBubble>
                ),
              )}

              {typing && (
                <div className="nf-rise flex items-end gap-2.5">
                  <span className="h-6.5 w-6.5 shrink-0" aria-hidden="true">
                    <Icon name="help" fill />
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
                placeholder="Ask about bookings, payments, refunds"
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
    <div className="nf-rise flex items-end gap-2.5">
      <span className="h-6.5 w-6.5 shrink-0" aria-hidden="true">
        <Icon name="help" fill />
      </span>
      <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-[var(--nf-border-subtle)] px-3.5 py-2.5">
        <p className="text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">{text}</p>
        {children}
      </div>
    </div>
  );
}

/**
 * Escalation receipt. Shows exactly what is recorded and is direct about
 * timing: the report reaches the admin desk when the platform goes live, and
 * until then it stays on this device with the rest of the thread.
 */
function EscalationCard({ name, email }: { name: string; email: string }) {
  return (
    <div className="mt-3 rounded-[var(--nf-radius-sm)] border border-[color-mix(in_oklab,var(--nf-brand-primary)_35%,transparent)] bg-[color-mix(in_oklab,var(--nf-brand-primary)_8%,transparent)] p-3">
      <p className="flex items-center gap-1.5 text-[0.8125rem] font-semibold text-[var(--nf-electric-300)]">
        <UiIcon name="verified" size={14} className="shrink-0" />
        Escalated to the human team
      </p>
      <dl className="mt-2 space-y-1 text-[0.8125rem]">
        <div className="flex gap-2">
          <dt className="text-[var(--nf-content-muted)]">Name</dt>
          <dd className="min-w-0 flex-1 truncate text-right font-medium">{name}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-[var(--nf-content-muted)]">Email</dt>
          <dd className="min-w-0 flex-1 truncate text-right font-medium">
            {email || "Add one on your Profile"}
          </dd>
        </div>
      </dl>
      <p className="mt-2 text-[0.75rem] leading-relaxed text-[var(--nf-content-muted)]">
        Your report, with the details above, reaches the NaijaFinds admin desk
        the moment the platform goes live. Until then it stays saved on this
        device with this conversation.
      </p>
    </div>
  );
}
