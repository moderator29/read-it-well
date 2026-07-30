"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage, ConversationThread } from "@/lib/messages/types";
import { PageHeader } from "@/components/app/PageHeader";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { ListingOptionsSheet } from "./ListingOptionsSheet";

/**
 * Conversation thread.
 *
 * A guest to agent chat column: scrollable bubbles, a pinned composer that
 * takes text and images, and the listing options sheet behind the header
 * shield. Sent messages append locally; the server write path lives in
 * `lib/messages/actions.ts` and the composer adopts it once the messaging
 * backend is connected, so nothing here pretends a message reached the agent.
 * Inspection confirmations persist on this device under `nf_inspections`
 * until the `inspection_confirmations` table takes over.
 */

const INSPECTIONS_KEY = "nf_inspections";
const READ_KEY = "nf_messages_read";

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadIds(key: string): string[] {
  try {
    const raw = window.localStorage.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function appendId(key: string, id: string) {
  try {
    window.localStorage.setItem(key, JSON.stringify([...new Set([...loadIds(key), id])]));
  } catch {
    /* Storage unavailable: state simply lives in memory for this visit. */
  }
}

/** Local wall-clock stamp in the same `YYYY-MM-DDTHH:MM` shape the seed uses. */
function localStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function timeLabel(sentAt: string): string {
  return sentAt.slice(11, 16);
}

export function MessageThread({ thread }: { thread: ConversationThread }) {
  const [messages, setMessages] = useState<ChatMessage[]>(thread.messages);
  const [draft, setDraft] = useState("");
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [inspected, setInspected] = useState(false);

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const sheetTriggerRef = useRef<HTMLButtonElement | null>(null);
  const objectUrls = useRef<string[]>([]);

  /* Opening the thread marks it read and restores the inspection state. */
  useEffect(() => {
    appendId(READ_KEY, thread.id);
    setInspected(loadIds(INSPECTIONS_KEY).includes(thread.id));
  }, [thread.id]);

  /* Keep the newest bubble in view as the thread grows. */
  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight });
  }, [messages]);

  /* Object URLs live as long as the thread is mounted, then get released. */
  useEffect(() => {
    const urls = objectUrls.current;
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  const pickImage = (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    objectUrls.current.push(url);
    setPendingImage(url);
  };

  const send = useCallback(() => {
    const body = draft.trim();
    if (!body && !pendingImage) return;
    setMessages((prev) => [
      ...prev,
      {
        id: makeId(),
        author: "guest",
        body,
        image: pendingImage ? { src: pendingImage, alt: "Photo you attached" } : undefined,
        sentAt: localStamp(),
      },
    ]);
    setDraft("");
    setPendingImage(null);
    if (fileRef.current) fileRef.current.value = "";
  }, [draft, pendingImage]);

  const confirmInspection = () => {
    appendId(INSPECTIONS_KEY, thread.id);
    setInspected(true);
  };

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    sheetTriggerRef.current?.focus();
  }, []);

  return (
    <div className="mx-auto flex h-[calc(100dvh-64px-10rem)] min-h-[26rem] w-full max-w-2xl flex-col lg:h-[calc(100dvh-64px-4rem)]">
      <PageHeader
        title={thread.agentName}
        subtitle={thread.listing.title}
        fallback="/messages"
        actions={
          <button
            ref={sheetTriggerRef}
            type="button"
            aria-label="Listing and safety options"
            aria-haspopup="dialog"
            aria-expanded={sheetOpen}
            onClick={() => setSheetOpen(true)}
            className="nf-icon-btn h-9 w-9 sm:h-10 sm:w-10"
          >
            <svg
              width={18}
              height={18}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="8.6" />
              <path d="M12 11.2v5" />
              <circle cx="12" cy="7.9" r="0.5" fill="currentColor" stroke="none" />
            </svg>
          </button>
        }
      />

      <ListingOptionsSheet
        open={sheetOpen}
        listing={thread.listing}
        agentName={thread.agentName}
        inspected={inspected}
        onConfirmInspection={confirmInspection}
        onClose={closeSheet}
      />

      {/* ------------------------------------------------------ chat thread */}
      <div
        ref={scrollerRef}
        className="flex-1 space-y-4 overflow-y-auto pb-4 pr-1"
        aria-live="polite"
        aria-label="Conversation"
      >
        <p className="flex items-center justify-center gap-1.5 py-1 text-center text-[0.7rem] text-[var(--nf-content-muted)]">
          <UiIcon name="verified" size={12} strokeWidth={2.1} />
          Chats are protected by RentMe fraud monitoring
        </p>

        {messages.map((m) =>
          m.author === "guest" ? (
            <div key={m.id} className="nf-rise flex justify-end">
              {/* Deep blue keeps white body text readable at chat sizes. */}
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-[color-mix(in_oklab,var(--nf-brand-primary)_58%,var(--nf-brand-primary-strong))] px-4 py-2.5 text-white">
                {m.image && (
                  /* Object URLs cannot go through the image optimiser. */
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.image.src}
                    alt={m.image.alt}
                    className="mb-2 max-h-64 w-full rounded-xl object-cover"
                  />
                )}
                {m.body && <p className="text-[0.9rem] leading-relaxed">{m.body}</p>}
                <p className="nf-numeric mt-1 text-right text-[0.65rem] text-white/70">
                  {timeLabel(m.sentAt)}
                </p>
              </div>
            </div>
          ) : (
            <div key={m.id} className="nf-rise flex items-end gap-3">
              <span
                aria-hidden="true"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--nf-brand-primary)_22%,transparent)] text-[0.75rem] font-bold text-[var(--nf-electric-300)]"
              >
                {thread.agentName.charAt(0)}
              </span>
              <div className="nf-card max-w-[85%] rounded-2xl rounded-bl-md px-4 py-2.5">
                {m.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.image.src}
                    alt={m.image.alt}
                    className="mb-2 max-h-64 w-full rounded-xl object-cover"
                  />
                )}
                {m.body && (
                  <p className="text-[0.9rem] leading-relaxed text-[var(--nf-content-secondary)]">
                    {m.body}
                  </p>
                )}
                <p className="nf-numeric mt-1 text-right text-[0.65rem] text-[var(--nf-content-muted)]">
                  {timeLabel(m.sentAt)}
                </p>
              </div>
            </div>
          ),
        )}
      </div>

      {/* --------------------------------------------------------- composer */}
      {pendingImage && (
        <div className="flex items-center gap-3 border-t border-[var(--nf-border-subtle)] pt-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={pendingImage}
            alt="Photo ready to send"
            className="h-14 w-14 rounded-xl object-cover"
          />
          <p className="min-w-0 flex-1 truncate text-[0.8125rem] text-[var(--nf-content-muted)]">
            Photo attached
          </p>
          <button
            type="button"
            aria-label="Remove photo"
            onClick={() => {
              setPendingImage(null);
              if (fileRef.current) fileRef.current.value = "";
            }}
            className="nf-btn nf-btn--ghost px-3 py-2 text-[0.8125rem]"
          >
            Remove
          </button>
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className={`flex items-center gap-3 pt-3 ${
          pendingImage ? "" : "border-t border-[var(--nf-border-subtle)]"
        }`}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="sr-only"
          aria-hidden="true"
          tabIndex={-1}
          onChange={(e) => pickImage(e.target.files?.[0])}
        />
        <button
          type="button"
          aria-label="Attach a photo"
          onClick={() => fileRef.current?.click()}
          className="nf-icon-btn h-11 w-11 shrink-0"
        >
          <svg
            width={18}
            height={18}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3.4" y="5" width="17.2" height="14" rx="2.6" />
            <circle cx="9" cy="10" r="1.7" />
            <path d="m5 17.6 4.6-4.4 3.2 3 3.4-3.4 3.4 3.6" />
          </svg>
        </button>
        <label htmlFor="thread-input" className="sr-only">
          Message {thread.agentName}
        </label>
        <input
          id="thread-input"
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Message ${thread.agentName}`}
          autoComplete="off"
          enterKeyHint="send"
          className="nf-field min-w-0 flex-1"
        />
        <button
          type="submit"
          aria-label="Send message"
          disabled={!draft.trim() && !pendingImage}
          className="nf-btn nf-btn--primary h-11 w-11 shrink-0 rounded-full p-0"
        >
          <UiIcon name="arrow-right" size={18} className="-rotate-90" />
        </button>
      </form>
    </div>
  );
}
