"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/app/PageHeader";
import { VerifiedAvatar } from "@/components/messages/VerifiedAvatar";
import { UiIcon } from "@/design-system/icons/UiIcon";
import {
  attachImage,
  confirmInspection,
  markThreadRead,
  sendMessage,
} from "@/lib/messages/actions";
import {
  MONEY_TALK_RE,
  SAFETY_EDUCATION_COPY,
  SAFETY_EDUCATION_SEEN_KEY,
} from "@/lib/messages/education";
import { lagosTimeLabel } from "@/lib/messages/time";
import {
  useThreadRealtime,
  useThreadTyping,
  type LiveMessageRow,
} from "@/lib/messages/useRealtime";
import { createClient } from "@/lib/supabase/client";
import { ThreadOptionsSheet, type SheetListing } from "./ThreadOptionsSheet";
import { Button } from "@/components/ui/Button";

/**
 * The conversation thread, one component for both data sources.
 *
 * Live mode (signed in, platform configured): sends go through the messaging
 * actions with an optimistic bubble that adopts the database row on success
 * and grows a retry affordance on failure; new rows from the other side
 * arrive over realtime; photos upload to the private bucket first and then
 * record their attachment row. Seed mode: everything stays on this device,
 * exactly as the seeded threads always have, with read and inspection state
 * in localStorage. Either way, a reload renders whatever the source of truth
 * holds; nothing here pretends.
 */

export type ThreadBubble = {
  id: string;
  mine: boolean;
  body: string;
  timeLabel: string;
  imageUrl: string | null;
  state?: "sending" | "failed";
};

export type ThreadViewProps = {
  live: boolean;
  conversationId: string;
  meId: string | null;
  counterpartName: string;
  /**
   * The counterpart's REAL verification state, from `agents.verified`.
   *
   * Required rather than optional and never defaulted at this boundary, for the
   * same reason `VerifiedAvatar` requires it: the tick beside a stranger's name
   * is the mark somebody weighs before agreeing to meet them at a property, and
   * one that appears because a prop was forgotten is worse than none at all.
   */
  counterpartVerified: boolean;
  listing: SheetListing | null;
  inspected: boolean;
  messages: ThreadBubble[];
};

const INSPECTIONS_KEY = "nf_inspections";
const READ_KEY = "nf_messages_read";
const ALREADY_CONFIRMED = "You have already confirmed inspection here.";

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

function nowLabel(): string {
  return lagosTimeLabel(new Date().toISOString());
}

/** A safe lowercase extension for the storage path, defaulting to jpg. */
function extOf(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? "";
  if (fromName && fromName.length <= 8) return fromName;
  const fromType = file.type.split("/").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? "";
  return fromType && fromType.length <= 8 ? fromType : "jpg";
}

/** Natural dimensions of an image object URL, best effort. */
function dimensionsOf(url: string): Promise<{ width?: number; height?: number }> {
  return new Promise((resolve) => {
    const probe = new Image();
    probe.onload = () => resolve({ width: probe.naturalWidth, height: probe.naturalHeight });
    probe.onerror = () => resolve({});
    probe.src = url;
  });
}

type RetryPayload = { kind: "text"; body: string } | { kind: "image"; file: File };

export function ThreadView({
  live,
  conversationId,
  meId,
  counterpartName,
  counterpartVerified,
  listing,
  inspected: inspectedInitial,
  messages,
}: ThreadViewProps) {
  const [items, setItems] = useState<ThreadBubble[]>(messages);
  const [draft, setDraft] = useState("");
  const [pendingFile, setPendingFile] = useState<{ file: File; url: string } | null>(null);
  const [educationOpen, setEducationOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [inspected, setInspected] = useState(inspectedInitial);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmNote, setConfirmNote] = useState<string | null>(null);

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const sheetTriggerRef = useRef<HTMLButtonElement | null>(null);
  const objectUrls = useRef<string[]>([]);
  const retryPayloads = useRef<Map<string, RetryPayload>>(new Map());

  /* Opening the thread records read state: on the platform in live mode, on
     this device in seed mode. Fire and forget; a miss never blocks reading. */
  useEffect(() => {
    if (live) {
      void markThreadRead({ conversationId });
    } else {
      appendId(READ_KEY, conversationId);
      setInspected(loadIds(INSPECTIONS_KEY).includes(conversationId));
    }
  }, [live, conversationId]);

  /* Keep the newest bubble in view as the thread grows. */
  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight });
  }, [items]);

  /* Object URLs live as long as the thread is mounted, then get released. */
  useEffect(() => {
    const urls = objectUrls.current;
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  /* Realtime arrivals for the open thread. Own sends are deduped by id (the
     action result or an earlier event may have landed first); the other
     side's messages append and are immediately marked read, since the thread
     is on screen. */
  // "Someone is typing", the real signal: a broadcast on the thread's own
  // channel (see useThreadTyping), not a timer with nobody behind it. Seed
  // mode passes null, since there is no counterpart really present there.
  const { typing: counterpartTyping, ping: pingTyping } = useThreadTyping(
    live ? conversationId : null,
    meId,
  );

  useThreadRealtime(live ? conversationId : null, (row: LiveMessageRow) => {
    setItems((prev) => {
      if (prev.some((m) => m.id === row.id)) return prev;
      return [
        ...prev,
        {
          id: row.id,
          mine: row.sender_id === meId,
          body: row.body,
          timeLabel: lagosTimeLabel(row.created_at),
          imageUrl: null,
        },
      ];
    });
    if (row.sender_id !== meId) void markThreadRead({ conversationId });
  });

  /* The safety education moment: the first money-shaped draft in a session
     surfaces the canonical copy once, inline and dismissible. */
  const onDraftChange = (value: string) => {
    setDraft(value);
    if (live && value.trim()) pingTyping();
    if (!educationOpen && MONEY_TALK_RE.test(value)) {
      try {
        if (window.sessionStorage.getItem(SAFETY_EDUCATION_SEEN_KEY)) return;
        window.sessionStorage.setItem(SAFETY_EDUCATION_SEEN_KEY, "1");
      } catch {
        /* Storage unavailable: still educate this once. */
      }
      setEducationOpen(true);
    }
  };

  const adoptResult = useCallback((tempId: string, realId: string, timeLabel?: string) => {
    retryPayloads.current.delete(tempId);
    setItems((prev) => {
      // Realtime may have delivered the real row already; drop the temp then.
      if (prev.some((m) => m.id === realId)) return prev.filter((m) => m.id !== tempId);
      return prev.map((m) =>
        m.id === tempId
          ? { ...m, id: realId, state: undefined, timeLabel: timeLabel ?? m.timeLabel }
          : m,
      );
    });
  }, []);

  const markFailed = useCallback((tempId: string) => {
    setItems((prev) => prev.map((m) => (m.id === tempId ? { ...m, state: "failed" } : m)));
  }, []);

  const runTextSend = useCallback(
    async (tempId: string, body: string) => {
      const result = await sendMessage({ conversationId, body });
      if (result.ok) adoptResult(tempId, result.data.id, lagosTimeLabel(result.data.createdAt));
      else markFailed(tempId);
    },
    [conversationId, adoptResult, markFailed],
  );

  const runImageSend = useCallback(
    async (tempId: string, file: File, previewUrl: string) => {
      try {
        const path = `${conversationId}/${crypto.randomUUID()}.${extOf(file)}`;
        const supabase = createClient();
        const { error: uploadError } = await supabase.storage
          .from("message-attachments")
          .upload(path, file, { contentType: file.type || "image/jpeg" });
        if (uploadError) {
          markFailed(tempId);
          return;
        }
        const { width, height } = await dimensionsOf(previewUrl);
        const result = await attachImage({ conversationId, storagePath: path, width, height });
        if (result.ok) adoptResult(tempId, result.data.messageId);
        else markFailed(tempId);
      } catch {
        markFailed(tempId);
      }
    },
    [conversationId, adoptResult, markFailed],
  );

  const send = useCallback(() => {
    const body = draft.trim();
    const picked = pendingFile;
    if (!body && !picked) return;

    setDraft("");
    setPendingFile(null);
    if (fileRef.current) fileRef.current.value = "";

    if (!live) {
      // Seed mode: the thread lives on this device, exactly as before.
      const appended: ThreadBubble[] = [];
      if (picked) {
        appended.push({
          id: `local-${crypto.randomUUID()}`,
          mine: true,
          body: "",
          timeLabel: nowLabel(),
          imageUrl: picked.url,
        });
      }
      if (body) {
        appended.push({
          id: `local-${crypto.randomUUID()}`,
          mine: true,
          body,
          timeLabel: nowLabel(),
          imageUrl: null,
        });
      }
      setItems((prev) => [...prev, ...appended]);
      return;
    }

    if (picked) {
      const tempId = `local-${crypto.randomUUID()}`;
      retryPayloads.current.set(tempId, { kind: "image", file: picked.file });
      setItems((prev) => [
        ...prev,
        {
          id: tempId,
          mine: true,
          body: "",
          timeLabel: nowLabel(),
          imageUrl: picked.url,
          state: "sending",
        },
      ]);
      void runImageSend(tempId, picked.file, picked.url);
    }
    if (body) {
      const tempId = `local-${crypto.randomUUID()}`;
      retryPayloads.current.set(tempId, { kind: "text", body });
      setItems((prev) => [
        ...prev,
        { id: tempId, mine: true, body, timeLabel: nowLabel(), imageUrl: null, state: "sending" },
      ]);
      void runTextSend(tempId, body);
    }
  }, [draft, pendingFile, live, runTextSend, runImageSend]);

  const retry = useCallback(
    (tempId: string) => {
      const payload = retryPayloads.current.get(tempId);
      if (!payload) return;
      setItems((prev) => prev.map((m) => (m.id === tempId ? { ...m, state: "sending" } : m)));
      if (payload.kind === "text") void runTextSend(tempId, payload.body);
      else {
        const bubble = items.find((m) => m.id === tempId);
        void runImageSend(tempId, payload.file, bubble?.imageUrl ?? "");
      }
    },
    [items, runTextSend, runImageSend],
  );

  const pickImage = (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    objectUrls.current.push(url);
    setPendingFile({ file, url });
  };

  const handleConfirmInspection = useCallback(async () => {
    if (!listing) return;
    if (!live) {
      appendId(INSPECTIONS_KEY, conversationId);
      setInspected(true);
      return;
    }
    setConfirmBusy(true);
    setConfirmNote(null);
    const result = await confirmInspection({ conversationId, listingId: listing.id });
    setConfirmBusy(false);
    if (result.ok) {
      setInspected(true);
    } else if (result.error === ALREADY_CONFIRMED) {
      setInspected(true);
      setConfirmNote(result.error);
    } else {
      setConfirmNote(result.error);
    }
  }, [live, listing, conversationId]);

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    sheetTriggerRef.current?.focus();
  }, []);

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-3xl flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-6">
      <PageHeader
        title={counterpartName}
        subtitle={listing?.title ?? "Direct message"}
        fallback="/messages"
        tone={inspected ? "verified" : "default"}
        /*
          The counterpart's avatar, carrying their verified mark.

          This slot used to hold a shield that appeared when an INSPECTION had
          been confirmed, which is a fact about the booking rather than about
          the person, and it looked exactly like a verification badge. Somebody
          reading a thread saw a shield beside a stranger's name and had no way
          to tell that it meant "you visited this flat" rather than "we checked
          who this is". The inspection still tints the header row through
          `tone`; the mark on the avatar is now only ever about identity.
        */
        leading={
          <VerifiedAvatar
            name={counterpartName}
            verified={counterpartVerified}
            size="sm"
          />
        }
        actions={
          listing ? (
            <button
              ref={sheetTriggerRef}
              type="button"
              aria-label="Listing and safety options"
              aria-haspopup="dialog"
              aria-expanded={sheetOpen}
              onClick={() => setSheetOpen(true)}
              className="nf-icon-btn h-9 w-9 sm:h-10 sm:w-10"
            >
<UiIcon name="info" size="sm" />
            </button>
          ) : undefined
        }
      />

      {listing && (
        <ThreadOptionsSheet
          open={sheetOpen}
          listing={listing}
          counterpartName={counterpartName}
          inspected={inspected}
          confirmedLabel={live ? "Inspection confirmed." : "Inspection confirmed on this device"}
          busy={confirmBusy}
          note={confirmNote}
          onConfirmInspection={() => void handleConfirmInspection()}
          onClose={closeSheet}
        />
      )}

      {/* ------------------------------------------------------ chat thread */}
      <div
        ref={scrollerRef}
        className="flex-1 space-y-5 overflow-y-auto pb-5 pr-1"
        aria-live="polite"
        aria-label="Conversation"
      >
        <p className="flex items-center justify-center gap-1.5 py-1 text-center text-[0.7rem] text-[var(--nf-content-muted)]">
          <UiIcon name="verified" size={12} />
          Keep every chat and payment inside RentMe
        </p>

        {items.map((m) =>
          m.mine ? (
            <div key={m.id} className="nf-msg-in--mine flex flex-col items-end">
              {/* Deep blue keeps white body text readable at chat sizes. */}
              <div
                className={`max-w-[85%] rounded-2xl rounded-br-md bg-[color-mix(in_oklab,var(--nf-brand-primary)_58%,var(--nf-brand-primary-strong))] px-4 py-2.5 text-white ${
                  m.state === "sending" ? "opacity-70" : ""
                }`}
              >
                {m.imageUrl && (
                  /* Signed and object URLs cannot go through the optimiser. */
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.imageUrl}
                    alt="Photo you attached"
                    className="mb-2 aspect-[4/3] max-h-64 w-full rounded-xl bg-[var(--nf-surface-inset)] object-cover"
                  />
                )}
                {m.body && <p className="text-[0.9rem] leading-relaxed">{m.body}</p>}
                <p className="nf-numeric mt-1 text-right text-[0.65rem] text-white/70">
                  {m.state === "sending" ? "Sending" : m.timeLabel}
                </p>
              </div>
              {m.state === "failed" && (
                <p className="mt-1 flex items-center gap-2 text-[0.75rem] text-[var(--nf-state-error)]">
                  Not sent.
                  <button
                    type="button"
                    onClick={() => retry(m.id)}
                    className="font-semibold underline underline-offset-2"
                  >
                    Retry
                  </button>
                </p>
              )}
            </div>
          ) : (
            <div key={m.id} className="nf-msg-in--theirs flex items-end gap-3">
              <span
                aria-hidden="true"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--nf-brand-primary)_22%,transparent)] text-[0.75rem] font-bold text-[var(--nf-brand-secondary)]"
              >
                {counterpartName.charAt(0)}
              </span>
              <div className="nf-card max-w-[85%] rounded-2xl rounded-bl-md px-4 py-2.5">
                {m.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.imageUrl}
                    alt={`Photo from ${counterpartName}`}
                    className="mb-2 aspect-[4/3] max-h-64 w-full rounded-xl bg-[var(--nf-surface-inset)] object-cover"
                  />
                )}
                {m.body && (
                  <p className="text-[0.9rem] leading-relaxed text-[var(--nf-content-secondary)]">
                    {m.body}
                  </p>
                )}
                <p className="nf-numeric mt-1 text-right text-[0.65rem] text-[var(--nf-content-muted)]">
                  {m.timeLabel}
                </p>
              </div>
            </div>
          ),
        )}

        {/* "Someone is typing": three breathing dots in the same bubble shape
            a reply lands in, driven by the real broadcast above. */}
        {counterpartTyping && (
          <div className="nf-msg-in--theirs flex items-end gap-3">
            <span
              aria-hidden="true"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--nf-brand-primary)_22%,transparent)] text-[0.75rem] font-bold text-[var(--nf-brand-secondary)]"
            >
              {counterpartName.charAt(0)}
            </span>
            <div
              className="nf-card flex items-center gap-1.5 rounded-2xl rounded-bl-md px-4 py-3.5"
              role="status"
              aria-label={`${counterpartName} is typing`}
            >
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  aria-hidden="true"
                  className="nf-typing-dot h-1.5 w-1.5 rounded-full bg-[var(--nf-content-muted)]"
                  style={{ animationDelay: `${i * 160}ms` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ----------------------------------------------- safety education */}
      {educationOpen && (
        <div
          role="status"
          className="nf-card mb-2 flex items-start gap-3 border-t border-[var(--nf-border-subtle)] p-3.5"
        >
          <span className="mt-0.5 shrink-0 text-[var(--nf-brand-secondary)]" aria-hidden="true">
            <UiIcon name="verified" size={16} />
          </span>
          <p className="min-w-0 flex-1 text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]">
            {SAFETY_EDUCATION_COPY}
          </p>
          <button
            type="button"
            aria-label="Dismiss safety note"
            onClick={() => setEducationOpen(false)}
            className="nf-icon-btn h-8 w-8 shrink-0"
          >
            <UiIcon name="close" size={16} />
          </button>
        </div>
      )}

      {/* --------------------------------------------------------- composer */}
      {pendingFile && (
        <div className="flex items-center gap-3 border-t border-[var(--nf-border-subtle)] pt-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={pendingFile.url}
            alt="Photo ready to send"
            className="h-14 w-14 rounded-xl object-cover"
          />
          <p className="min-w-0 flex-1 text-[0.8125rem] text-[var(--nf-content-muted)]">
            Photo attached
          </p>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Remove photo"
            onClick={() => {
              setPendingFile(null);
              if (fileRef.current) fileRef.current.value = "";
            }}
          >
            Remove
          </Button>
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className={`flex items-center gap-3 pt-3 ${
          pendingFile || educationOpen ? "" : "border-t border-[var(--nf-border-subtle)]"
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
<UiIcon name="picture" size="sm" />
        </button>
        <label htmlFor="thread-input" className="sr-only">
          Message {counterpartName}
        </label>
        <input
          id="thread-input"
          type="text"
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          placeholder={`Message ${counterpartName}`}
          autoComplete="off"
          enterKeyHint="send"
          className="nf-field min-w-0 flex-1"
        />
        <Button
          type="submit"
          variant="primary"
          iconOnly
          aria-label="Send message"
          disabled={!draft.trim() && !pendingFile}
          className="shrink-0 rounded-full"
        >
          <UiIcon name="arrow-right" size={20} className="-rotate-90" />
        </Button>
      </form>
    </div>
  );
}
