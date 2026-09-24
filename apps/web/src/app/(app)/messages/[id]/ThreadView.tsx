"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Dictionary, Locale } from "@vallo/i18n";
import { ThreadContextBanner, type ThreadRole } from "@/components/app/threads/ThreadContextBanner";
import { reservationLine } from "@/components/app/threads/ReservationFace";
import type { Inspection } from "@/lib/inspections/types";
import type { ThreadContext } from "@/lib/messages/live";
import { EmptyState, ICON } from "@/components/app/Screen";
import { VerifiedAvatar } from "@/components/messages/VerifiedAvatar";
import { TierBadge } from "@/components/trust/TierBadge";
import type { BadgeTier } from "@/lib/trust/badge-tier";
import { MediaFrame } from "@/components/app/MediaFrame";
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
import {
  ProposeHeldPayment,
  type ThreadAgreement,
} from "@/components/app/messages/ProposeHeldPayment";
import "@/app/css/escrow.css";
import { useBack } from "@/lib/nav/use-back";
import { ThreadOptionsSheet, type SheetListing } from "./ThreadOptionsSheet";
import { Button } from "@/components/ui/Button";
import { Chip, ChipRow } from "@/components/ui/Chip";
import { AccountMomentCard } from "@/components/app/messages/AccountMomentCard";
import { accountNumbersIn, isAccountMoment } from "@/lib/messages/account-moment";
import type { AccountCheckView } from "@/lib/messages/account-check";
import type { ChargeOffer } from "@/lib/messages/charge-offer";

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
  mine: boolean;
  body: string;
  timeLabel: string;
  imageUrl: string | null;
  state?: "sending" | "failed";
  /**
   * True once the other side has opened it. Carried by the row's `read_at`;
   * only ever drawn on my own bubbles, and only as the second tick.
   */
  read?: boolean;
  /** The card a share expands into, resolved by the page. Absent otherwise. */
  card?: ChatCardData;
  /** The row's timestamp, when known. Read by the account card's "checking" window. */
  createdAt?: string;
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
   * THE HELD-PAYMENT COMPOSER, AND WHY IT IS TWO PROPS RATHER THAN ONE.
   *
   * `heldPaymentsOpen` is the kill switch, read on the server per request and
   * failing closed on a missing row, a failed read or no configuration. When
   * it is false this thread renders NOTHING about held payments: not a
   * disabled control, not an explanation, not a "coming soon". A feature that
   * cannot operate is promised to nobody (rule 11), and the switch exists so
   * an operator can make that true in one statement at three in the morning.
   *
   * `agreement` is the open agreement this conversation is carrying, read
   * under the caller's own RLS from the `conversation_id` column the proposal
   * door writes. Null means there is none and the composer offers to make one.
   */
  heldPaymentsOpen?: boolean;
  agreement?: ThreadAgreement | null;
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
  heldPaymentsOpen = false,
  agreement = null,
  availabilitySlot = null,
  stageSlot = null,
  quickReplies = [],
  quickRepliesTitle = "",
  accountMoment = null,
  accountCopy,
  personLine = [],
  personLabel,
  recordLine = [],
  recordLabel,
  passportLine = [],
  passportShare = null,
  passportLabel,
}: ThreadViewProps) {
  const [items, setItems] = useState<ThreadBubble[]>(messages);
  /*
   * THE ACCEPT CEREMONY (pitch 13). When an inspection is accepted in the
   * banner below, the header tints once through the existing
   * `nf-page-header--verified` motion, which is the platform's one "a real
   * state change landed on this page" tint. Nothing new is invented and
   * reduced motion stills it in the stylesheet.
   */
  const [ceremony, setCeremony] = useState(false);
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

  /* The inspection screen's "Add photos" arrives with the picker asked for. */
  useEffect(() => {
    if (openAttach) fileRef.current?.click();
  }, [openAttach]);

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
          createdAt: row.created_at,
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

  /* A conversation's parent is the inbox, declared as `/messages/[id]` ->
     `/messages` in `lib/nav/route-parents.ts`. A thread is the single most
     deep-linked screen in the product - every push notification lands here -
     so it was also the one where `router.back()` most often walked out of the
     product entirely. */
  const back = useBack("/messages");

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

  return (
    <div className="nf-thread mx-auto w-full max-w-3xl px-gutter">
      {/* ------------------------------------------------------- header */}
      <header
        className={`nf-thread__head${inspected || ceremony ? " nf-page-header--verified" : ""}`}
      >
        {/* THE WALKER'S HANDLE; see `components/site/BackButton.tsx`. This
            thread's control calls the same `useBack` as every other one and was
            invisible to the browser walk without it. */}
        <button
          type="button"
          aria-label="Back"
          onClick={back}
          data-nav-back=""
          className="nf-icon-btn"
        >
          <UiIcon name="arrow-left" size={ICON.inline} />
        </button>
        {/*
          The mark in the lit ring. On a stay thread it is the counterpart and
          it carries their verified state, because the person you are talking
          to IS the venue. On a property thread it is the PROPERTY, drawn by
          the one photographic frame the platform has, because the flat is
          what the conversation is about and the person is named on every
          bubble. The mark is only ever about identity; the inspection state
          tints the header row instead.
        */}
        <span className="nf-thread__ring">
          {propertyFace && listing ? (
            <MediaFrame hue={listing.hue} sizes="44px" />
          ) : (
            <VerifiedAvatar name={counterpartName} tier={counterpartTier} size="md" />
          )}
        </span>
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
          {!propertyFace && <p className="nf-thread__context">{contextLine}</p>}
          {place && (
            <p className="nf-thread__place">
              <UiIcon name="location" size={14} className="shrink-0 text-[var(--nf-brand-secondary)]" />
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
          <button
            ref={sheetTriggerRef}
            type="button"
            aria-label="Conversation options"
            aria-haspopup="dialog"
            aria-expanded={sheetOpen}
            onClick={() => setSheetOpen(true)}
            className="nf-icon-btn"
          >
            {/* Upright, as GOVERNING-chat-booking-card.png draws the header's
                options control: the shared three nodes turned a quarter. */}
            <UiIcon name="more" size={ICON.inline} className="rotate-90" />
          </button>
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
        />
      )}

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
          return (
            <div
              key={m.id}
              className={`nf-msg ${m.mine ? "nf-msg--mine nf-msg-in--mine" : "nf-msg-in--theirs"}${
                wide ? " nf-msg--card" : ""
              }${continues ? " nf-msg--cont" : ""}`}
            >
              {m.mine ? (
                <span className="nf-msg__side" aria-hidden="true">
                  <span className="nf-msg__avatar">
                    <UiIcon name="user" size={18} />
                  </span>
                  {tags && <span>{tags.mine}</span>}
                </span>
              ) : (
                <span className="nf-msg__avatar" aria-hidden="true">
                  {counterpartName.charAt(0)}
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
                      ) : (
                        <span className="nf-numeric">{m.timeLabel}</span>
                      )}
                      {m.mine && !m.state && <Ticks read={Boolean(last.read)} />}
                    </p>
                  </div>
                )}

                {m.state === "failed" && (
                  <p className="mt-inline-tight flex items-center gap-xs nf-caption text-[var(--nf-state-error)]">
                    Not sent.
                    <button
                      type="button"
                      onClick={() => retry(m.id)}
                      aria-label={retryLabel(m)}
                      className="font-semibold underline underline-offset-2"
                    >
                      Retry
                    </button>
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {/* "Someone is typing": three breathing dots in the same bubble shape
            a reply lands in, driven by the real broadcast above. */}
        {counterpartTyping && (
          <div className="nf-msg nf-msg-in--theirs">
            <span className="nf-msg__avatar" aria-hidden="true">
              {counterpartName.charAt(0)}
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
          <button
            type="button"
            aria-label="Dismiss safety note"
            onClick={() => setEducationOpen(false)}
            className="nf-icon-btn shrink-0"
          >
            <UiIcon name="close" size={ICON.inline} />
          </button>
        </div>
      )}

      {/* ------------------------------------------- the held-payment entry */}
      {live && heldPaymentsOpen && counterpartId ? (
        <ProposeHeldPayment
          conversationId={conversationId}
          counterpartyId={counterpartId}
          counterpartName={counterpartName}
          agreement={agreement}
        />
      ) : null}

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
        <button
          type="button"
          aria-label="Attach a photo"
          onClick={() => fileRef.current?.click()}
          className="nf-icon-btn"
        >
          <UiIcon name="picture" size={ICON.inline} />
        </button>
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
