"use client";

import { initial } from "@/lib/text/initial";
import Link from "next/link";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { adoptBubble, arrivalClass, bubbleKey, mergeEcho } from "./thread-arrival";
import type { Dictionary, Locale } from "@vallo/i18n/core";
import { ThreadContextBanner, type ThreadRole } from "@/components/app/threads/ThreadContextBanner";
import { reservationLine } from "@/components/app/threads/ReservationFace";
import type { Inspection } from "@/lib/inspections/types";
import type { ThreadContext } from "@/lib/messages/live";
import { EmptyState, ICON } from "@/components/app/Screen";
import { VerifiedAvatar } from "@/components/messages/VerifiedAvatar";
import { TierBadge } from "@/components/trust/TierBadge";
import type { BadgeTier } from "@/lib/trust/badge-tier";
import { MediaFrame } from "@/components/app/MediaFrame";
import { InitialsTile } from "@/components/ui/InitialsTile";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { ChatCard, type ChatCardData } from "@/components/app/messages/ChatCard";
import { bundlePhotos, isCaption } from "@/components/app/messages/bundle";
import { parseShare, shareHref, SHARE_LEAD } from "@/components/app/messages/share";
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
import { reencodeToJpeg } from "@/components/social/profile/reencode";
import { useClientCopy } from "@/lib/i18n/client-copy";
import { OUTBOX_SENT_EVENT, type OutboxSentDetail } from "@/lib/offline/outbox";
import { sendOrKeep } from "@/lib/offline/send-or-keep";
import { BackControl } from "@/components/ui/BackControl";
import { ThreadOptionsSheet, type SheetListing, type ThreadSheetCopy } from "./ThreadOptionsSheet";
import { Button } from "@/components/ui/Button";
import { Chip, ChipRow } from "@/components/ui/Chip";
import { AccountMomentCard } from "@/components/app/messages/AccountMomentCard";
import { accountNumbersIn, isAccountMoment } from "@/lib/messages/account-moment";
import { offPlatformAsk } from "@/lib/messages/off-platform-ask";
import { ScamShield } from "@/components/app/messages/ScamShield";
import { feedback } from "@/lib/ui/feedback";
import type { AccountCheckView } from "@/lib/messages/account-check";
import type { ChargeOffer } from "@/lib/messages/charge-offer";
import { PushPrompt } from "@/components/app/push/PushPrompt";
import { DayDivider, UNREAD_DIVIDER_ID, UnreadDivider } from "@/components/app/messages/ThreadDividers";
import { QuotedReply, type QuotedMessage } from "@/components/app/messages/QuotedReply";
import { AttachmentRow } from "@/components/app/messages/AttachmentRow";
import { VoiceNote, type VoiceNoteData } from "@/components/app/messages/VoiceNote";
import { dayHeading, dayStarts } from "@/components/app/threads/day";
import { useInboxPart } from "@/components/app/threads/use-inbox-copy";

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
 *
 * THE FACE IS GOVERNING-chat-booking-card.png. The header is the counterpart
 * in a lit ring with the verified mark, the context line and the place, and
 * two glass controls on the right; theirs is a dark glass bubble under the
 * sender's name and time, mine is the blue bubble with the read ticks; a
 * shared listing or booking is the full card; the composer is the attach
 * control, the glass field and the blue send. The rental face (9E06F51C) adds
 * role tags beside the names and the context card under the header, both
 * drawn by `ThreadContextBanner`.
 */

export type ThreadBubble = {
  id: string;
  /** The id a sent bubble was born with; survives adoption of the real id (`thread-arrival.ts`). */
  clientKey?: string;
  mine: boolean;
  body: string;
  timeLabel: string;
  imageUrl: string | null;
  /** `waiting`: tapped with no signal, kept in the outbox, sends by itself (V-40). */
  state?: "sending" | "failed" | "waiting";
  /**
   * True once the other side has opened it. Carried by the row's `read_at`;
   * only ever drawn on my own bubbles, and only as the second tick.
   */
  read?: boolean;
  /** The card a share expands into, resolved by the page. Absent otherwise. */
  card?: ChatCardData;
  /** The row's timestamp, when known. Read by the account card's "checking" window. */
  createdAt?: string;
  /**
   * The message this one answers, by id (request W5-1: `messages.reply_to_id`).
   * Drawn as the quoted block above the bubble. Absent on every row today, so
   * nothing is quoted until the column exists.
   */
  replyToId?: string | null;
  /**
   * A voice note (request W5-3: `message_attachments` kind, duration and
   * peaks). Drawn as a waveform with its length. Absent on every row today.
   */
  audio?: VoiceNoteData;
  /** A file that is not a photo, as a bordered row with a type glyph (W5-3). */
  file?: { url: string; name?: string | null; mime?: string | null; bytes?: number | null };
};

export type ThreadViewProps = {
  live: boolean;
  conversationId: string;
  meId: string | null;
  counterpartName: string;
  /**
   * Their number, when this reader is allowed to have it, and null otherwise.
   *
   * Resolved by `lib/security/counterpart-contact.ts`, not by this component:
   * RLS decides membership first, a block in either direction withholds it,
   * every failure withholds, and an absent or unreadable number comes back
   * null. So null means DO NOT DRAW THE CONTROL, which is why the header
   * renders nothing at all rather than a disabled button (rule 19: a control
   * that cannot act is never drawn).
   */
  counterpartPhone?: string | null;
  /**
   * The other party's id, for the block control in the options sheet.
   *
   * Null in seed mode, where the counterpart is a fixture rather than a
   * person, and the sheet draws no safety rows at all rather than drawing two
   * that cannot act.
   */
  counterpartId?: string | null;
  /**
   * The counterpart's REAL verification state, from `agents.verified`.
   *
   * Required rather than optional and never defaulted at this boundary, for the
   * same reason `VerifiedAvatar` requires it: the tick beside a stranger's name
   * is the mark somebody weighs before agreeing to meet them at a property, and
   * one that appears because a prop was forgotten is worse than none at all.
   */
  counterpartTier: BadgeTier;
  listing: SheetListing | null;
  inspected: boolean;
  messages: ThreadBubble[];
  /**
   * What the conversation is FOR, resolved server-side, and the one thing that
   * changes what is drawn between the header and the bubbles. See
   * `ThreadContextBanner`. Absent in seed mode, where there is no context.
   */
  context?: ThreadContext;
  /** The live inspection on a listing thread, or null. Resolved by the page. */
  inspection?: Inspection | null;
  /** Host is the lister, the restaurant or the property; guest is the other side. */
  role?: ThreadRole;
  threadCopy?: Dictionary["threads"];
  locale?: Locale;
  /** Open the photo picker on arrival: the inspection screen's Add photos lands here. */
  openAttach?: boolean;
  /**
   * V-14: the "Still available?" card, already drawn by the page from the
   * thread's `availability_checks` row. A slot rather than data, so this
   * component learns nothing new about the question's rules.
   */
  availabilitySlot?: React.ReactNode;
  /**
   * V-72: the enquiry's stage, drawn by the page for the thread's lister only.
   * A slot, like the availability card, so this component learns no stage rules.
   */
  stageSlot?: React.ReactNode;
  /**
   * V-72: the lister's quick replies, already worded from the listing's own
   * facts. A tap puts the sentence in the composer; nothing is sent until the
   * lister sends it. Empty or absent draws no tray.
   */
  quickReplies?: { key: string; label: string; text: string }[];
  quickRepliesTitle?: string;
  /**
   * V-04, THE ACCOUNT-NUMBER MOMENT. The stored check per message from the
   * other side (only the receiver's RLS can read one) and the real charge on
   * offer. Absent draws no card, which is every thread with no account number
   * in it from the other side.
   */
  accountMoment?: { checks: Record<string, AccountCheckView>; offer: ChargeOffer } | null;
  accountCopy?: Dictionary["trustVisible"]["account"];
  /** B12: the scam shield's words. Absent draws no shield. */
  scamCopy?: Dictionary["memberKit"]["scam"];
  /** B5: the viewing day kit's words, for the inspection card. Absent, no kit. */
  dayKitCopy?: Dictionary["memberKit"]["dayKit"];
  /** The options sheet's passport and safety words, from the page's `t`. */
  sheetCopy: ThreadSheetCopy;
  /**
   * V-23: dated facts about the other person, already worded, in order.
   * Empty draws nothing: a null fact is never a line.
   */
  personLine?: { key: string; text: string }[];
  personLabel?: string;
  /**
   * V-34: the other party's Vallo Record when they are a lister, already
   * worded and gated at five. Empty draws nothing.
   */
  recordLine?: { key: string; text: string }[];
  recordLabel?: string;
  /** V-100: the renter's passport, for the lister, when the renter shows it here. */
  passportLine?: { key: string; text: string }[];
  /** V-100: the renter's own switch for this thread. Null for anybody else. */
  passportShare?: { enabled: boolean; shared: boolean } | null;
  passportLabel?: string;
  /** V-69: the "Show me" panel for a listing thread, when it is open. */
  showMe?: React.ReactNode;
  /**
   * What this reader had not read when the thread loaded: how many, and the id
   * of the first. Taken from the server BEFORE `markThreadRead` runs, because
   * once it has run the thread has no unread left to point at. Absent or zero
   * draws no unread divider.
   */
  unread?: { count: number; firstId: string } | null;
  /** The server's clock, so "Today" and "Yesterday" agree with the markup. */
  nowMs?: number;
  /**
   * The thread's inbox-family words (`experienceInbox.thread`) from the server
   * page. Passed, never read from a client dictionary: that read put the whole
   * `@vallo/i18n` index (398KB gzipped) in this route's first load.
   */
  inboxThreadCopy?: Dictionary["experienceInbox"]["thread"];
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

/**
 * What the retry button is called, for somebody who cannot see which bubble it
 * sits under. Words where there are words, and an honest noun where there are
 * not.
 */
function retryLabel(message: { body?: string | null; imageUrl?: string | null }): string {
  const words = (message.body ?? "").trim();
  if (words.length > 0) {
    const short = words.length > 40 ? `${words.slice(0, 40).trimEnd()}...` : words;
    return `Retry sending: ${short}`;
  }
  return message.imageUrl ? "Retry sending your photo" : "Retry sending this message";
}

/**
 * The read ticks. One tick is delivered (the platform holds it), two is read
 * (the other side opened it). Drawn inline so the two states are one shape
 * apart, which no glyph in the stroked set is.
 */
function Ticks({ read }: { read: boolean }) {
  return (
    <span
      className={`nf-bubble__ticks${read ? " nf-bubble__ticks--read" : ""}`}
      aria-label={read ? "Read" : "Delivered"}
      role="img"
    >
      <svg width="18" height="12" viewBox="0 0 18 12" fill="none" aria-hidden="true">
        <path d="M1 6.5l3.2 3.2L10.5 3.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        {read && (
          <path d="M7 6.5l3.2 3.2L16.5 3.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>
    </span>
  );
}

/**
 * The role a name carries on the rental face (9E06F51C): "Tenant" beside the
 * renter's name, "Agent" under the lister's avatar. The booking render draws
 * no tags at all, so a stay and a table label nobody, and neither does a
 * plain direct message.
 */
/**
 * The role tags the PROPERTY face carries and the stay face does not.
 *
 * "Vallo Agent" rather than "Agent" on the side doing the letting, which is
 * the render's own wording and is the more useful of the two: it says the
 * person answering is acting on this platform, which is exactly the fact a
 * renter is weighing. The other side is the Tenant. A stay thread gets none
 * of this: there is no tenancy in it and nobody is anybody's agent.
 */
function roleTags(context: ThreadContext | undefined, role: ThreadRole): { mine: string; theirs: string } | null {
  if (context?.kind !== "listing") return null;
  return role === "host"
    ? { mine: "Vallo Agent", theirs: "Tenant" }
    : { mine: "Tenant", theirs: "Vallo Agent" };
}

export function ThreadView({
  live,
  conversationId,
  meId,
  counterpartName,
  counterpartPhone = null,
  counterpartId = null,
  counterpartTier,
  listing,
  inspected: inspectedInitial,
  messages,
  context,
  inspection = null,
  role = "guest",
  threadCopy,
  locale = "en",
  openAttach = false,
  availabilitySlot = null,
  stageSlot = null,
  quickReplies = [],
  quickRepliesTitle = "",
  accountMoment = null,
  accountCopy,
  scamCopy,
  dayKitCopy,
  sheetCopy,
  personLine = [],
  personLabel,
  recordLine = [],
  recordLabel,
  passportLine = [],
  passportShare = null,
  passportLabel,
  showMe = null,
  unread = null,
  nowMs,
  inboxThreadCopy,
}: ThreadViewProps) {
  const [items, setItems] = useState<ThreadBubble[]>(messages);
  /* The messages the thread opened with. Only a message that arrives AFTER
     this (sent or received while the thread is open) plays the arrival
     motion; the history the thread opened with is simply there, so opening a
     long conversation is not forty bubbles sliding in at once. It is never
     added to: a bubble's class must not change under it (the realtime echo of
     my own send is merged by `mergeEcho`, not by marking its id as seen). */
  const [openedWith] = useState<ReadonlySet<string>>(() => new Set(messages.map((m) => m.id)));
  const threadWords = useInboxPart("thread", inboxThreadCopy);
  /* The unread divider is fixed at arrival: reading the thread marks it read
     and the page may re-render with nothing unread, but the divider stays
     where the reader came in until they leave. */
  const [unreadAnchor] = useState(unread);
  const [jumpedId, setJumpedId] = useState<string | null>(null);
  /*
   * THE ACCEPT CEREMONY (pitch 13). When an inspection is accepted in the
   * banner below, the header tints once through the existing
   * `nf-page-header--verified` motion, which is the platform's one "a real
   * state change landed on this page" tint. Nothing new is invented and
   * reduced motion stills it in the stylesheet.
   */
  /* The bubble's "waiting" word, from the root layout's client copy. */
  const waitingShort = useClientCopy().platform.outbox.waitingShort;
  const [ceremony, setCeremony] = useState(false);
  const [draft, setDraft] = useState("");
  const [pendingFile, setPendingFile] = useState<{ file: File; url: string } | null>(null);
  const [educationOpen, setEducationOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [inspected, setInspected] = useState(inspectedInitial);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmNote, setConfirmNote] = useState<string | null>(null);
  /* STORE-04: the push question at a real moment. Once this person has sent
     a message into a thread the other side has already written in, it is a
     conversation, and "know the moment they reply" is worth asking.
     `PushPrompt` itself decides whether to show (never twice in thirty days,
     never after two refusals, never when already granted). */
  const [conversationActive, setConversationActive] = useState(false);
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

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

  /* The inspection screen's "Add photos" arrives with the picker asked for. */
  useEffect(() => {
    if (openAttach) fileRef.current?.click();
  }, [openAttach]);

  /* Where the thread opens, then where it follows. Arriving with unread
     messages, it opens at the unread divider, the way a conversation app
     does, so the reader starts at the first thing they have not read; with
     nothing unread, or after that first arrival, it keeps the newest bubble
     in view as the thread grows. */
  const arrived = useRef(false);
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    if (!arrived.current) {
      arrived.current = true;
      const divider = unreadAnchor ? el.querySelector<HTMLElement>(`#${UNREAD_DIVIDER_ID}`) : null;
      if (divider) {
        const top = divider.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop;
        el.scrollTo({ top: Math.max(0, top - 16) });
        return;
      }
    }
    el.scrollTo({ top: el.scrollHeight });
  }, [items, unreadAnchor]);

  /* A quoted reply, tapped: bring the message it quotes into view and hold a
     ring on it for a moment so the eye finds it. Smooth only when motion is
     allowed. */
  const jumpTimer = useRef<number | null>(null);
  useEffect(() => () => {
    if (jumpTimer.current !== null) window.clearTimeout(jumpTimer.current);
  }, []);
  const jumpTo = useCallback((id: string) => {
    const el = scrollerRef.current?.querySelector<HTMLElement>(`[data-msg-id="${CSS.escape(id)}"]`);
    if (!el) return;
    const quiet = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ block: "center", behavior: quiet ? "auto" : "smooth" });
    setJumpedId(id);
    if (jumpTimer.current !== null) window.clearTimeout(jumpTimer.current);
    jumpTimer.current = window.setTimeout(() => setJumpedId(null), 1600);
  }, []);

  /* Object URLs live as long as the thread is mounted, then get released. */
  useEffect(() => {
    const urls = objectUrls.current;
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  // "Someone is typing", the real signal: a broadcast on the thread's own
  // channel (see useThreadTyping), not a timer with nobody behind it. Seed
  // mode passes null, since there is no counterpart really present there.
  const { typing: counterpartTyping, ping: pingTyping } = useThreadTyping(
    live ? conversationId : null,
    meId,
  );

  /* Realtime arrivals for the open thread. Own sends are deduped by id (the
     action result or an earlier event may have landed first); the other
     side's messages append and are immediately marked read, since the thread
     is on screen. A share arriving live draws as its words and its path
     until the next server render expands it, which is honest and opens. */
  useThreadRealtime(live ? conversationId : null, (row: LiveMessageRow) => {
    /* One merge for every order (`mergeEcho`, thread-arrival.ts): the send
       result landed first, so the bubble is already here and stays as it is;
       my own send echoing first, so the row takes the optimistic bubble's
       place and key (same element, the arrival keeps playing); a message from
       my other device or the other side, which arrives like any new one. */
    setItems((prev) =>
      mergeEcho(prev, {
        id: row.id,
        mine: row.sender_id === meId,
        body: row.body,
        timeLabel: lagosTimeLabel(row.created_at),
        imageUrl: null,
        createdAt: row.created_at,
      }),
    );
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
    /* Realtime may have delivered the real row already; the temp is dropped
       then. Otherwise the temp takes the real id and KEEPS ITS KEY, so the
       bubble is the same element and its arrival does not play again. */
    setItems((prev) => adoptBubble(prev, tempId, realId, timeLabel));
  }, []);

  const markFailed = useCallback((tempId: string) => {
    /* B14: a message that failed and was kept is a genuine failure, felt
       as the one error pattern (CRAFT_DOCTRINE 6). */
    feedback("error");
    setItems((prev) => prev.map((m) => (m.id === tempId ? { ...m, state: "failed" } : m)));
  }, []);

  /* V-40: which outbox entry stands for which waiting bubble. */
  const waitingKeys = useRef(new Map<string, string>());

  const runTextSend = useCallback(
    async (tempId: string, body: string) => {
      const done = await sendOrKeep("send_message", { conversationId, body }, (tapKey) =>
        sendMessage({ conversationId, body, tapKey }),
      );
      if (done.state === "kept") {
        waitingKeys.current.set(done.key, tempId);
        setItems((prev) => prev.map((m) => (m.id === tempId ? { ...m, state: "waiting" } : m)));
        return;
      }
      if (done.state === "sent" && done.result.ok) {
        adoptResult(tempId, done.result.data.id, lagosTimeLabel(done.result.data.createdAt));
        if (itemsRef.current.some((m) => !m.mine)) setConversationActive(true);
      } else markFailed(tempId);
    },
    [conversationId, adoptResult, markFailed],
  );

  /* The outbox sent a waiting message: the bubble takes its real id. */
  useEffect(() => {
    const onSent = (event: Event) => {
      const detail = (event as CustomEvent<OutboxSentDetail>).detail;
      const tempId = detail ? waitingKeys.current.get(detail.key) : undefined;
      if (!tempId) return;
      waitingKeys.current.delete(detail.key);
      const sent = detail.data as { id: string; createdAt: string };
      /* Delivered from the outbox, which happens whenever the network comes
         back, often with the phone in a pocket or on another screen: a
         passive state, so it is seen (the bubble takes its time) and never
         felt (CRAFT_DOCTRINE 6). */
      adoptResult(tempId, sent.id, lagosTimeLabel(sent.createdAt));
    };
    window.addEventListener(OUTBOX_SENT_EVENT, onSent);
    return () => window.removeEventListener(OUTBOX_SENT_EVENT, onSent);
  }, [adoptResult]);

  const runImageSend = useCallback(
    async (tempId: string, file: File, previewUrl: string) => {
      try {
        /* The original file is never sent. A phone photo carries EXIF, and
           usually GPS, so uploading it handed the other person the exact place
           it was taken, often the sender's home. Re-encoding through a canvas
           keeps only the pixels, and caps the long edge so a 12MB camera file
           fits the 10MB bucket and a metered connection. If the phone cannot
           decode it (HEIC outside Safari), the send fails visibly rather
           than falling back to the tagged original. */
        const clean = await reencodeToJpeg(file, { maxEdge: 2560, quality: 0.85 });
        if (!clean) {
          markFailed(tempId);
          return;
        }
        const path = `${conversationId}/${crypto.randomUUID()}.jpg`;
        const supabase = createClient();
        const { error: uploadError } = await supabase.storage
          .from("message-attachments")
          .upload(path, clean, { contentType: "image/jpeg" });
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
          createdAt: new Date().toISOString(),
        });
      }
      if (body) {
        appended.push({
          id: `local-${crypto.randomUUID()}`,
          mine: true,
          body,
          timeLabel: nowLabel(),
          imageUrl: null,
          createdAt: new Date().toISOString(),
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
          createdAt: new Date().toISOString(),
        },
      ]);
      void runImageSend(tempId, picked.file, picked.url);
    }
    if (body) {
      const tempId = `local-${crypto.randomUUID()}`;
      retryPayloads.current.set(tempId, { kind: "text", body });
      setItems((prev) => [
        ...prev,
        {
          id: tempId,
          mine: true,
          body,
          timeLabel: nowLabel(),
          imageUrl: null,
          state: "sending",
          createdAt: new Date().toISOString(),
        },
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
    /* PERF-SWEEP 8: a dropped connection used to leave the button busy for
       good; it now ends the wait and says the step did not go through. */
    const result = await confirmInspection({ conversationId, listingId: listing.id }).catch(() => ({
      ok: false as const,
      error: "That did not go through. Check your connection and try again.",
    }));
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


  /* The header's context line: what this conversation is FOR, in two words,
     under the name, the way the render writes "Hotel Booking". */
  /* From the dictionary, not from three English literals. The same three
     words are on the context card below, so they come from one place. In seed
     mode there is no dictionary, and the English is the fallback rather than
     the source. */
  const words = threadCopy?.context;
  const contextLine =
    context?.kind === "reservation" && context.reservation && threadCopy
      ? reservationLine(context.reservation, locale, threadCopy.reservation)
      : context?.kind === "booking"
        ? (words?.stayBooking ?? "Stay booking")
        : context?.kind === "listing" && listing
          ? (words?.rentalEnquiry ?? "Rental enquiry")
          : (words?.directMessage ?? "Direct message");
  const place = listing ? [listing.area, listing.city].filter(Boolean).join(", ") : "";
  /*
   * ONE COMPONENT, TWO FACES, AND THE RECORD CHOOSES.
   *
   * The founder sent both renders (docs/design/references/founder/) and the
   * thing they disagree about is WHO THE HEADER IS ABOUT.
   *
   *   A STAY thread is a conversation with a venue. The header is the venue:
   *   its mark, its name with the verified tick, "Stay booking" under it, and
   *   the place. Everything about the stay itself lives in the booking card
   *   in the thread.
   *
   *   A PROPERTY thread is a conversation about a flat. The header is the
   *   FLAT: the property's frame, its title, its place, and the listing's own
   *   emerald Verified pill beside the place. It carries no context line,
   *   because the context card directly beneath it already says "Rental
   *   enquiry" and the render does not say it twice. The counterpart is not
   *   lost: their name and their role tag sit on every bubble they send,
   *   which the stay face does not draw at all.
   *
   * So a stay thread can never show a Tenant tag and a property thread can
   * never show a check-in date, and neither face has to be told which it is.
   */
  const propertyFace = context?.kind === "listing" && listing !== null;
  /* A stay or a table is kept by a venue: a business, so the guest sees an
     initials tile. The host's counterpart is the guest, a person. */
  const venueFace = role === "guest" && (context?.kind === "booking" || context?.kind === "reservation");
  /* The kind glyph before the muted context line (the inbox rows' glyphs). */
  const contextGlyph =
    context?.kind === "booking" ? "bed" : context?.kind === "reservation" ? "calendar-clock" : "chat-bubble";
  const tags = roleTags(context, role);
  const bundles = bundlePhotos(items);
  /*
   * THE STAY IS SAID ONCE.
   *
   * GOVERNING-chat-booking-card.png draws nothing between the header and the
   * first bubble: the booking card IN the thread carries the status badge,
   * the dates, the room and the way into the booking. Where that card is
   * present the banner would repeat it and push the card's own photograph
   * and badge off a 390px screen, so the banner stands down and the card is
   * the one place the stay's state lives. A booking thread with no card
   * shared into it still gets the banner, which is the only reason it exists.
   */
  const bookingCardInThread = items.some((m) => m.card?.kind === "booking");
  /* The day dividers: where the Lagos day changes between one bundle and the
     next, on the instants the rows carry. */
  const dayBreaks = dayStarts(bundles.map(({ lead }) => lead));
  /* The message a reply quotes, resolved from the thread itself. Null means
     it is not in the loaded thread, and the block says so rather than guess. */
  const quotedOf = (id: string): QuotedMessage | null => {
    const found = items.find((x) => x.id === id);
    if (!found) return null;
    return {
      id: found.id,
      name: found.mine ? null : counterpartName,
      text: found.body,
      kind: found.audio ? "voice" : found.file ? "file" : found.imageUrl ? "photo" : "text",
    };
  };

  return (
    <div className="nf-thread mx-auto w-full max-w-3xl px-gutter">
      {/* ------------------------------------------------------- header */}
      <header
        className={`nf-thread__head${inspected || ceremony ? " nf-page-header--verified" : ""}`}
      >
        {/* The shared back control. A thread is the most deep-linked screen in
            the product (every push lands here): opened cold it goes to the
            inbox, opened from a listing or a booking it goes back there. */}
        <BackControl fallback="/messages" surface="plate" />
        {/*
          The mark in the lit ring. On a stay thread it is the counterpart and
          it carries their verified state, because the person you are talking
          to IS the venue. On a property thread it is the PROPERTY, drawn by
          the one photographic frame the platform has, because the flat is
          what the conversation is about and the person is named on every
          bubble. The mark is only ever about identity; the inspection state
          tints the header row instead.
        */}
        {/* THE ROW SPEC (plan item 19): a calm leading tile, no lit ring. The
            property is its photograph on the plate's rounded square; a venue
            (a stay or a table) is a business, so it is an initials tile;
            a person stays a round avatar. */}
        {propertyFace && listing ? (
          <span className="nf-thread__ring nf-thread__ring--tile">
            <MediaFrame hue={listing.hue} sizes="44px" />
          </span>
        ) : venueFace ? (
          <InitialsTile name={counterpartName} size="md" className="nf-thread__initials" />
        ) : (
          <span className="nf-thread__ring">
            <VerifiedAvatar name={counterpartName} tier={counterpartTier} size="md" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h1 className={`nf-thread__title${propertyFace ? " nf-thread__title--place" : ""}`}>
            <span className="min-w-0">{propertyFace && listing ? listing.title : counterpartName}</span>
            {/* The one shared renderer, from the one published tier. It used to be a
                `verified-badge` glyph gated on a boolean that was actually the
                LISTING's verified flag; see the note at this call site in
                `page.tsx`. */}
            {!propertyFace && (
              <TierBadge tier={counterpartTier} size={18} className="nf-thread__tick" />
            )}
          </h1>
          {/* Said once. The context card under a property header already
              carries "Rental enquiry", and the render does not repeat it. */}
          {!propertyFace && (
            <p className="nf-thread__context">
              <UiIcon name={contextGlyph} size={14} className="shrink-0" />
              <span className="truncate">{contextLine}</span>
            </p>
          )}
          {place && (
            <p className="nf-thread__place">
              <UiIcon name="location" size={14} className="shrink-0 text-[var(--nf-content-muted)]" />
              <span className={propertyFace ? "min-w-0" : "truncate"}>{place}</span>
              {/* The LISTING's own badge, beside the place, exactly where the
                  render puts it. It is a claim about the property and it is
                  never drawn from anything but `listings.verified`. */}
              {propertyFace && listing?.verified && (
                <span className="nf-badge nf-badge--success shrink-0">
                  <UiIcon name="verified" size={12} />
                  Verified
                </span>
              )}
            </p>
          )}
        </div>
        <div className="nf-thread__actions">
          {/*
            THE CALL, TO THE LEFT OF THE KEBAB, exactly where
            GOVERNING-chat-booking-card.png draws it.

            A plain `tel:` anchor, which is the one call control a web app can
            honestly offer: it hands the number to the device's own dialler
            and nothing here records, rings or logs anything. It is drawn only
            when the read gave a number, so a thread with a block in it, or a
            counterpart who has not given one, simply has one control on the
            right instead of two.
          */}
          {counterpartPhone && (
            <a
              href={`tel:${counterpartPhone}`}
              aria-label={`Call ${counterpartName}`}
              className="nf-icon-btn"
            >
              <UiIcon name="phone" size={ICON.inline} />
            </a>
          )}
          {/* One glass control on the right, the way the render keeps its
              right edge quiet. The property itself opens from the options
              sheet and from the context card, so nothing is lost here. */}
          <Button
            ref={sheetTriggerRef}
            variant="icon"
            aria-label="Conversation options"
            aria-haspopup="dialog"
            aria-expanded={sheetOpen}
            onClick={() => setSheetOpen(true)}
          >
            {/* Upright, as GOVERNING-chat-booking-card.png draws the header's
                options control: the shared three nodes turned a quarter. */}
            <UiIcon name="more" size={ICON.inline} className="rotate-90" />
          </Button>
        </div>
      </header>

      {/* V-23: WHO THIS IS, under the header. On a property thread the header
          names the flat, so the person gets their own slim line: the avatar
          with their one published mark, their name, and only the dated facts
          Vallo holds about them. Nothing that is null is drawn. */}
      {live && (propertyFace || personLine.length > 0 || recordLine.length > 0 || passportLine.length > 0) && (
        <div className="nf-thread__person flex items-center gap-sm px-gutter py-xs" aria-label={personLabel} data-testid="thread-person">
          {propertyFace && <VerifiedAvatar name={counterpartName} tier={counterpartTier} size="sm" />}
          <div className="min-w-0 flex-1">
            {propertyFace && (
              <p className="flex items-center gap-inline-tight nf-body-sm font-semibold text-[var(--nf-content-primary)]">
                <span className="truncate">{counterpartName}</span>
                <TierBadge tier={counterpartTier} size={14} />
              </p>
            )}
            {personLine.length > 0 && (
              <p className="nf-caption text-[var(--nf-content-muted)]">
                {personLine.map((fact) => fact.text).join(" · ")}
              </p>
            )}
            {passportLine.length > 0 && (
              <ul className="mt-3xs grid gap-3xs" aria-label={passportLabel} data-testid="thread-passport">
                {passportLine.map((line) => (
                  <li key={line.key} className="nf-caption text-[var(--nf-content-secondary)]">
                    {line.text}
                  </li>
                ))}
              </ul>
            )}
            {recordLine.length > 0 && (
              <ul className="mt-3xs grid gap-3xs" aria-label={recordLabel} data-testid="thread-record">
                {recordLine.map((line) => (
                  <li
                    key={line.key}
                    className={`nf-caption ${
                      line.key === "stopped" ? "text-[var(--nf-state-error)]" : "text-[var(--nf-content-secondary)]"
                    }`}
                  >
                    {line.text}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <ThreadOptionsSheet
        open={sheetOpen}
        conversationId={conversationId}
        listing={listing}
        counterpartName={counterpartName}
        counterpartId={counterpartId}
        signedIn={live}
        inspected={inspected}
        confirmedLabel={live ? "Inspection confirmed." : "Inspection confirmed on this device"}
        busy={confirmBusy}
        note={confirmNote}
        canShare={live}
        onConfirmInspection={() => void handleConfirmInspection()}
        onClose={closeSheet}
        passportShare={live ? passportShare : null}
        sheetCopy={sheetCopy}
        unsafeAsLister={context?.kind === "listing" && role === "host"}
      />

      {/* ------------------------------------------------- context banner */}
      {context && threadCopy && !(context.kind === "booking" && bookingCardInThread) && (
        <ThreadContextBanner
          context={context}
          inspection={inspection}
          role={role}
          counterpartName={counterpartName}
          listing={listing}
          copy={threadCopy}
          locale={locale}
          onAccepted={() => setCeremony(true)}
          dayKit={dayKitCopy}
          conversationId={live ? conversationId : null}
        />
      )}

      {showMe}
      {availabilitySlot}
      {stageSlot}

      {/* ------------------------------------------------------ chat thread */}
      <div
        ref={scrollerRef}
        className="nf-thread__scroll"
        aria-live="polite"
        aria-label="Conversation"
      >
        <p className="nf-thread__safety">
          <UiIcon name="verified" size={16} />
          Keep every chat and payment inside Vallo
        </p>

        {/*
          * A THREAD NOBODY HAS SPOKEN IN DREW NOTHING AT ALL.
          *
          * `bundles.map` over an empty list renders nothing, so the first
          * conversation anybody opens was the safety strip, a void, and the
          * composer. That is the state every thread starts in: a person taps
          * Message the agent from a listing and lands on a screen that looks
          * broken at the exact moment they are deciding whether to trust us.
          *
          * The body says what this thread is FOR, taken from the context the
          * page already resolved, so it is never the same sentence twice in a
          * row. No action: the composer is directly beneath and a button here
          * would be a second control for the one thing already in reach.
          */}
        {bundles.length === 0 && (
          <EmptyState
            icon="chat-duo"
            title={`Say hello to ${counterpartName}`}
            body={
              context?.kind === "listing"
                ? "Nothing has been said here yet. Ask what you need to know about the property, agree a time to see it, and keep the whole conversation in one place."
                : context?.kind === "booking"
                  ? "Nothing has been said here yet. Ask about your arrival, the room or anything the booking does not answer."
                  : context?.kind === "reservation"
                    ? "Nothing has been said here yet. Confirm the time, the size of the party, and anything the kitchen should know."
                    : "Nothing has been said here yet. Whatever you write stays between the two of you, and the whole conversation is kept here."
            }
            data-testid="thread-empty"
          />
        )}

        {bundles.map(({ lead: m, items: run }, index) => {
          const share = m.card ? null : parseShare(m.body);
          const wide = Boolean(m.card);
          /* A run of messages from one side in one minute shares one name
             row and one avatar, the way the render stacks the hotel's
             greeting over its card. */
          const prev = index > 0 ? bundles[index - 1]!.lead : null;
          const continues =
            prev !== null && prev.mine === m.mine && prev.timeLabel === m.timeLabel && !prev.state && !m.state;
          const photos = run.filter((p) => p.imageUrl !== null);
          const caption = run.length > 1 ? run.find((p) => isCaption(p)) : null;
          const words = run.length === 1 ? m.body : (caption?.body ?? "");
          const last = run[run.length - 1]!;
          /* V-04: the first message in this run from the other side that
             carries an account number gets the receiver's card above it. */
          /* Only where a check can run: a listing thread, read by the renter,
             about a message from the lister (the conversation's agent). */
          const accountMessage =
            live && accountCopy && !m.mine && role === "guest" && context?.kind === "listing"
              ? run.find((p) => isAccountMoment(p.body))
              : undefined;
          /* B12: a message from the other side that asks the reader to pay
             outside Vallo gets the calm shield under it, for the reader only.
             Never on the lister's side, and never twice: the account card
             above already speaks for a message it covers. */
          const shielded =
            scamCopy && !m.mine && role === "guest" && !m.card && !accountMessage
              ? run.map((p) => ({ p, ask: offPlatformAsk(p.body) })).find((x) => x.ask)
              : undefined;
          return (
            <Fragment key={bubbleKey(m)}>
            {dayBreaks.has(index) && m.createdAt && (
              <DayDivider label={dayHeading(m.createdAt, locale, threadWords.day, nowMs)} />
            )}
            {unreadAnchor && unreadAnchor.count > 0 && run.some((r) => r.id === unreadAnchor.firstId) && (
              <UnreadDivider count={unreadAnchor.count} copy={threadWords.unreadDivider} locale={locale} />
            )}
            <div
              data-msg-id={m.id}
              {...(jumpedId === m.id ? { "data-jumped": "" } : {})}
              className={`nf-msg ${m.mine ? "nf-msg--mine" : ""}${arrivalClass(openedWith, m)}${
                wide ? " nf-msg--card" : ""
              }${continues ? " nf-msg--cont" : ""}`}
            >
              {m.mine ? (
                <span className="nf-msg__side" aria-hidden="true">
                  <span className="nf-msg__avatar">
                    <UiIcon name="user" size={20} />
                  </span>
                  {tags && <span>{tags.mine}</span>}
                </span>
              ) : (
                <span className="nf-msg__avatar" aria-hidden="true">
                  {initial(counterpartName)}
                </span>
              )}

              <div className={`nf-msg__stack${wide ? " nf-msg__stack--wide" : ""}`}>
                {!m.mine && !continues && (
                  <p className="nf-msg__meta">
                    <span className="nf-msg__sender">{counterpartName}</span>
                    {tags && <span className="nf-role-tag">{tags.theirs}</span>}
                    <span className="nf-numeric">{m.timeLabel}</span>
                  </p>
                )}

                {accountMessage && accountCopy && (
                  <AccountMomentCard
                    messageId={accountMessage.id}
                    createdAt={accountMessage.createdAt ?? null}
                    initialCheck={accountMoment?.checks[accountMessage.id] ?? null}
                    numberCount={accountNumbersIn(accountMessage.body).length}
                    offer={accountMoment?.offer ?? { kind: "none" }}
                    copy={accountCopy}
                    locale={locale}
                    onBlock={counterpartId ? () => setSheetOpen(true) : undefined}
                  />
                )}

                {m.replyToId ? (
                  <QuotedReply quoted={quotedOf(m.replyToId)} copy={threadWords.quoted} onJump={jumpTo} />
                ) : null}

                {m.card ? (
                  <ChatCard card={m.card} />
                ) : (
                  <div
                    className={`nf-bubble ${
                      m.state === "failed"
                        ? "nf-bubble--failed"
                        : m.mine
                          ? "nf-bubble--mine"
                          : "nf-bubble--theirs"
                    }${m.state === "sending" ? " nf-bubble--sending" : ""}`}
                  >
                    {photos.length > 1 ? (
                      /* The bundle: three thumbnails and the count of the rest. */
                      <div className="nf-photo-bundle" role="group" aria-label={`${photos.length} photos`}>
                        {photos.slice(0, 3).map((p, i) => (
                          <span key={p.id} className="nf-photo-bundle__cell">
                            {/* Signed and object URLs cannot go through the optimiser. */}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={p.imageUrl ?? ""} alt={m.mine ? "Photo you attached" : `Photo from ${counterpartName}`} />
                            {i === 2 && photos.length > 3 && (
                              <span className="nf-photo-bundle__more">+{photos.length - 3}</span>
                            )}
                          </span>
                        ))}
                      </div>
                    ) : (
                      photos[0]?.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={photos[0].imageUrl}
                          alt={m.mine ? "Photo you attached" : `Photo from ${counterpartName}`}
                          className="nf-bubble__photo"
                        />
                      )
                    )}
                    {m.audio ? <VoiceNote note={m.audio} mine={m.mine} copy={threadWords.voice} /> : null}
                    {m.file ? (
                      <AttachmentRow
                        url={m.file.url}
                        name={m.file.name}
                        mime={m.file.mime}
                        bytes={m.file.bytes}
                        copy={threadWords.attachment}
                      />
                    ) : null}
                    {share ? (
                      /* A share whose card did not resolve for this reader:
                         the words and a link that opens the thing. */
                      <p className="nf-bubble__body">
                        {SHARE_LEAD[share.kind]}{" "}
                        <Link href={shareHref(share)} className="font-semibold underline underline-offset-2">
                          Open
                        </Link>
                      </p>
                    ) : (
                      words && <p className="nf-bubble__body">{words}</p>
                    )}
                    <p className="nf-bubble__foot">
                      {/*
                        Delivered is a fact about the system; read is the
                        other side's `read_at`, which the row carries and
                        which costs nobody a new obligation because it is
                        the state the platform already keeps.
                      */}
                      {m.state === "sending" ? (
                        <span>Sending</span>
                      ) : m.state === "waiting" ? (
                        <span data-testid="bubble-waiting">{waitingShort}</span>
                      ) : (
                        <span className="nf-numeric">{m.timeLabel}</span>
                      )}
                      {m.mine && !m.state && <Ticks read={Boolean(last.read)} />}
                    </p>
                  </div>
                )}

                {shielded?.ask && scamCopy && (
                  <ScamShield
                    ask={shielded.ask}
                    messageId={shielded.p.id}
                    canReport={live && !shielded.p.id.startsWith("local-")}
                    copy={scamCopy}
                    quote={shielded.p.body}
                  />
                )}

                {m.state === "failed" && (
                  <p className="mt-inline-tight flex items-center gap-xs nf-caption text-[var(--nf-state-error)]">
                    Not sent.
                    <Button
                      variant="quiet"
                      size="sm"
                      onClick={() => retry(m.id)}
                      aria-label={retryLabel(m)}
                    >
                      Retry
                    </Button>
                  </p>
                )}
              </div>
            </div>
            </Fragment>
          );
        })}

        {/* "Someone is typing": three breathing dots in the same bubble shape
            a reply lands in, driven by the real broadcast above. */}
        {counterpartTyping && (
          <div className="nf-msg nf-msg-in--theirs">
            <span className="nf-msg__avatar" aria-hidden="true">
              {initial(counterpartName)}
            </span>
            <div
              className="nf-bubble nf-bubble--theirs flex items-center gap-inline-tight"
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
        <div role="status" className="nf-panel nf-context-card nf-context-card--calm mb-xs">
          <span className="shrink-0 text-[var(--nf-brand-secondary)]" aria-hidden="true">
            <UiIcon name="verified" size={ICON.inline} />
          </span>
          <p className="min-w-0 flex-1 nf-body-sm leading-relaxed text-[var(--nf-content-secondary)]">
            {SAFETY_EDUCATION_COPY}
          </p>
          <Button
            variant="icon"
            leadingIcon="close"
            aria-label="Dismiss safety note"
            onClick={() => setEducationOpen(false)}
            className="shrink-0"
          />
        </div>
      )}


      {conversationActive ? <PushPrompt moment="conversation_active" /> : null}

      {/* --------------------------------------------------------- composer */}
      {pendingFile && (
        <div className="nf-composer__pending">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={pendingFile.url}
            alt="Photo ready to send"
            className="h-14 w-14 rounded-xl object-cover"
          />
          <p className="min-w-0 flex-1 nf-body-sm text-[var(--nf-content-muted)]">Photo attached</p>
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
      {quickReplies.length > 0 && (
        /* V-72: the tray. A tap adds the sentence to whatever is already typed. */
        <nav aria-label={quickRepliesTitle} className="px-md pb-xs" data-testid="quick-replies">
          <ChipRow bleed={false}>
            {quickReplies.map((reply) => (
              <Chip
                key={reply.key}
                size="sm"
                onSelectedChange={() => onDraftChange(draft.trim() ? `${draft.trimEnd()} ${reply.text}` : reply.text)}
                data-testid={`quick-reply-${reply.key}`}
              >
                {reply.label}
              </Chip>
            ))}
          </ChipRow>
        </nav>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="nf-composer"
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
        <Button
          variant="icon"
          leadingIcon="picture"
          aria-label="Attach a photo"
          onClick={() => fileRef.current?.click()}
        />
        <label htmlFor="thread-input" className="sr-only">
          Message {counterpartName}
        </label>
        <input
          id="thread-input"
          type="text"
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          placeholder="Type a message"
          autoComplete="off"
          enterKeyHint="send"
          className="nf-composer__field"
        />
        <button
          type="submit"
          aria-label="Send message"
          disabled={!draft.trim() && !pendingFile}
          className="nf-composer__send"
        >
          <UiIcon name="arrow-right" size={ICON.inline} className="-rotate-45" />
        </button>
      </form>
    </div>
  );
}
