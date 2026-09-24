"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_LOCALE, getDictionary } from "@vallo/i18n";
import { ResultSheet } from "@/components/app/ResultSheet";
import { deviceSavesChanged } from "@/components/app/SaveControl";
import { announceSent, due, forget, isCreate, readOutbox, reschedule, type OutboxEntry } from "@/lib/offline/outbox";
import type { ActionResult } from "@/lib/actions/envelope";
import { sendMessage } from "@/lib/messages/actions";
import { requestInspection } from "@/lib/inspections/actions";
import { submitReview } from "@/lib/reviews/actions";
import { dropPost } from "@/lib/social/posts-actions";
import { clearInflight, listInflight } from "@/lib/offline/inflight";
import { paymentState } from "@/lib/payments/payment-state";
import { toggleSave } from "@/lib/saved/actions";
import { addLocalSave, removeLocalSave } from "@/lib/saved/local";
import { saveRestaurant, saveStay, unsaveRestaurant, unsaveStay } from "@/lib/saved/places-actions";

/**
 * THE TRAY UNDER THE APP. V-40.
 *
 * Renders nothing until it has news. On every app start and every `online`
 * event it does two things:
 *
 *   1. Replays the outbox (`lib/offline/outbox.ts`), oldest tap first, each
 *      as the state wanted, so a replay after a half-delivered request lands
 *      where the first one would have. A network failure keeps the entry and
 *      backs off; a refusal that will not change (the listing was withdrawn)
 *      drops it and says so, naming what it was.
 *   2. Asks about every payment that started and lost its connection
 *      (`lib/offline/inflight.ts`), through `paymentState`, and says the
 *      answer: it went through, it did not, or Paystack has not told us yet
 *      and we keep checking every minute, so do not pay again.
 *
 * Money is never replayed: the second half only READS.
 */

type Copy = ReturnType<typeof getDictionary>["platform"];

type News =
  | { kind: "paid" | "failed" | "pending"; reference: string }
  | { kind: "outbox_failed"; reasons: { what: WhatKey; reason: string }[] }
  | null;

type WhatKey = keyof Copy["outbox"]["what"];
const WHAT: Record<OutboxEntry["kind"], WhatKey> = {
  save_listing: "save",
  save_place: "save",
  send_message: "message",
  request_inspection: "inspection",
  submit_review: "review",
  drop_post: "post",
};

type Outcome = "sent" | "retry" | { refused: string };

/** A create, sent under the UUID it was tapped with, so a replay cannot make a second one. */
async function replayCreate(entry: OutboxEntry & { payload: Record<string, string> }): Promise<Outcome> {
  const p = entry.payload;
  const tapKey = entry.target;
  let result: ActionResult<unknown>;
  if (entry.kind === "send_message") {
    result = await sendMessage({ conversationId: p.conversationId!, body: p.body!, tapKey });
  } else if (entry.kind === "request_inspection") {
    result = await requestInspection({ listingId: p.listingId, when: p.when, ...(p.note ? { note: p.note } : {}), tapKey });
  } else if (entry.kind === "submit_review") {
    const form = new FormData();
    for (const [key, value] of Object.entries(p)) form.set(key, value);
    form.set("tapKey", tapKey);
    result = await submitReview(null, form);
  } else {
    result = await dropPost({ kind: p.kind === "ASK" ? "ASK" : "GIST", body: p.body!, ...(p.areaId ? { areaId: p.areaId } : {}), tapKey });
  }
  if (result.ok) {
    announceSent({ key: entry.key, kind: entry.kind, data: result.data });
    return "sent";
  }
  /* The first attempt is still running on the server: ask again later. */
  if (result.fieldErrors?.idempotency === "in_flight") return "retry";
  return { refused: result.error };
}

async function replayOne(entry: OutboxEntry): Promise<Outcome> {
  try {
    if (isCreate(entry)) return await replayCreate(entry);
    if (entry.kind === "save_listing") {
      const result = await toggleSave({ listingId: entry.target, want: entry.want });
      const deviceOwns = (result.ok && result.data.mode === "local") || (!result.ok && result.error.startsWith("Sign in"));
      if (deviceOwns) {
        if (entry.want) addLocalSave(entry.target);
        else removeLocalSave(entry.target);
        return "sent";
      }
      return result.ok ? "sent" : { refused: result.error };
    }
    const [placeKind, id] = entry.target.split(":");
    const result =
      placeKind === "accommodation"
        ? entry.want
          ? await saveStay({ accommodationId: id! })
          : await unsaveStay({ accommodationId: id! })
        : entry.want
          ? await saveRestaurant({ restaurantId: id! })
          : await unsaveRestaurant({ restaurantId: id! });
    return result.ok ? "sent" : { refused: result.error };
  } catch {
    return "retry";
  }
}

export function OfflineTray() {
  const copy: Copy = getDictionary(DEFAULT_LOCALE).platform;
  const [news, setNews] = useState<News>(null);
  const running = useRef(false);
  const toldPending = useRef(new Set<string>());

  const run = useCallback(async () => {
    if (running.current || (typeof navigator !== "undefined" && navigator.onLine === false)) return;
    running.current = true;
    try {
      /* 1. The outbox. */
      const refused: { what: WhatKey; reason: string }[] = [];
      let sentAny = false;
      for (const entry of due(await readOutbox(), Date.now())) {
        const outcome = await replayOne(entry);
        if (outcome === "sent") {
          sentAny = true;
          await forget(entry.key);
        } else if (outcome === "retry") {
          await reschedule(entry, Date.now());
          break;
        } else {
          refused.push({ what: WHAT[entry.kind], reason: outcome.refused });
          await forget(entry.key);
        }
      }
      if (sentAny) deviceSavesChanged();
      if (refused.length > 0) {
        setNews({ kind: "outbox_failed", reasons: refused });
        return;
      }

      /* 2. Payments that lost their connection. Read only. */
      for (const item of listInflight()) {
        const state = await paymentState(item.reference).catch(() => null);
        if (!state || !state.ok) continue;
        if (state.data === "paid" || state.data === "failed") {
          clearInflight(item.reference);
          setNews({ kind: state.data, reference: item.reference });
          return;
        }
        if (!toldPending.current.has(item.reference)) {
          toldPending.current.add(item.reference);
          setNews({ kind: "pending", reference: item.reference });
          return;
        }
      }
    } finally {
      running.current = false;
    }
  }, []);

  useEffect(() => {
    const kick = () => void run();
    /* After first paint, and then on every return of the connection. */
    const first = window.setTimeout(kick, 1_500);
    window.addEventListener("online", kick);
    /* While a payment is unresolved, ask again every minute. */
    const minute = window.setInterval(() => {
      if (listInflight().length > 0) kick();
    }, 60_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(minute);
      window.removeEventListener("online", kick);
    };
  }, [run]);

  if (!news) return null;
  const close = () => setNews(null);

  if (news.kind === "outbox_failed") {
    return (
      <ResultSheet
        open
        onOpenChange={(open) => !open && close()}
        state="failed"
        verdict={copy.outbox.failedTitle}
        consequence={news.reasons
          .map((r) => copy.outbox.failedItem.replace("{what}", copy.outbox.what[r.what]).replace("{reason}", r.reason))
          .join(" ")}
        actions={[{ label: copy.outbox.close, onClick: close, tone: "quiet" }]}
      />
    );
  }

  const inflight = copy.inflight;
  if (news.kind === "paid") {
    return (
      <ResultSheet
        open
        onOpenChange={(open) => !open && close()}
        state="sent"
        verdict={inflight.paidVerdict}
        consequence={inflight.paidBody.replace("{reference}", news.reference)}
        actions={[
          { label: inflight.history, href: "/wallet/transactions", tone: "primary" },
          { label: inflight.close, onClick: close, tone: "quiet" },
        ]}
      />
    );
  }
  return (
    <ResultSheet
      open
      onOpenChange={(open) => !open && close()}
      state={news.kind === "failed" ? "failed" : "pending"}
      verdict={news.kind === "failed" ? inflight.failedVerdict : inflight.pendingVerdict}
      consequence={(news.kind === "failed" ? inflight.failedBody : inflight.pendingBody).replace("{reference}", news.reference)}
      actions={[{ label: inflight.close, onClick: close, tone: "quiet" }]}
    />
  );
}
