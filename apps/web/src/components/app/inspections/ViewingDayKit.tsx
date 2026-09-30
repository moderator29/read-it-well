"use client";

import { useState } from "react";
import type { Dictionary } from "@vallo/i18n/core";
import { Button } from "@/components/ui/Button";
import { sendMessage } from "@/lib/messages/actions";
import { sendOrKeep } from "@/lib/offline/send-or-keep";
import {
  dayOfViewing,
  icsFileName,
  LATE_OPTIONS,
  lateMessage,
  viewingAhead,
  viewingIcs,
  type LateMinutes,
} from "@/lib/viewings/day-kit";

/**
 * B5: THE VIEWING DAY KIT, on a CONFIRMED inspection.
 *
 *   Add to calendar   an .ics made on this device (area and state only, a
 *                     link back, a 90 minute alarm). Nothing is sent anywhere.
 *   On the day        "On my way" and "Running late" (15, 30 or 60 minutes)
 *                     send a fixed, prewritten message into the inspection's
 *                     own conversation through the outbox (`sendOrKeep`), so a
 *                     tap on an okada with one bar still leaves: with no
 *                     signal the message is kept and sends itself later.
 *
 * Reminders are server side (the pending reminders migration); this is the
 * part a person taps. The requester and the lister both get it: running late
 * is a thing either side can be.
 */
export function ViewingDayKit({
  inspectionId,
  slotAt,
  area,
  place,
  conversationId,
  copy,
  now = Date.now(),
}: {
  inspectionId: string;
  slotAt: string | null;
  /** The area alone, for the calendar title. */
  area: string;
  /** Area and state (or city), for the calendar location. Never a street. */
  place: string;
  conversationId: string | null;
  copy: Dictionary["memberKit"]["dayKit"];
  /** The render's clock, so a test can pin the day. */
  now?: number;
}) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  if (!viewingAhead(slotAt, now)) return null;
  const today = dayOfViewing(slotAt, now);

  function addToCalendar() {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const ics = viewingIcs({
      inspectionId,
      slotAt: slotAt!,
      title: copy.calendarTitle.replace("{area}", area),
      location: place,
      url: `${origin}/bookings?kind=inspection#ix-${inspectionId}`,
      alarm: copy.calendarAlarm,
    });
    if (!ics) return;
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = icsFileName(area);
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  async function send(body: string) {
    if (!conversationId) {
      setNote(copy.noThread);
      return;
    }
    setBusy(true);
    setNote(null);
    try {
      const done = await sendOrKeep("send_message", { conversationId, body }, (tapKey) =>
        sendMessage({ conversationId, body, tapKey }),
      );
      if (done.state === "kept") setNote(copy.kept);
      else if (done.state === "sent" && done.result.ok) setNote(copy.sent);
      else setNote(copy.failed);
    } catch {
      setNote(copy.failed);
    } finally {
      setBusy(false);
      setAsking(false);
    }
  }

  return (
    <section className="nf-day-kit" aria-label={copy.label} data-testid="viewing-day-kit">
      <div className="nf-day-kit__row">
        {today && <span className="nf-day-kit__today">{copy.dayOf}</span>}
        <Button variant="quiet" size="sm" leadingIcon="calendar-booking" onClick={addToCalendar} data-testid="day-kit-calendar">
          {copy.addToCalendar}
        </Button>
        {today && !asking && (
          <>
            <Button variant="quiet" size="sm" disabled={busy} onClick={() => void send(copy.onMyWayMessage)} data-testid="day-kit-on-my-way">
              {copy.onMyWay}
            </Button>
            <Button variant="quiet" size="sm" disabled={busy} onClick={() => setAsking(true)} data-testid="day-kit-late">
              {copy.runningLate}
            </Button>
          </>
        )}
      </div>
      {today && asking && (
        <div className="nf-day-kit__row" role="group" aria-label={copy.lateAsk}>
          <span className="nf-day-kit__ask">{copy.lateAsk}</span>
          {LATE_OPTIONS.map((m: LateMinutes) => (
            <Button
              key={m}
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={() => void send(lateMessage(m, copy.lateMessage))}
              data-testid={`day-kit-late-${m}`}
            >
              {copy.lateChoice.replace("{minutes}", String(m))}
            </Button>
          ))}
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => setAsking(false)}>
            {copy.cancel}
          </Button>
        </div>
      )}
      {note && (
        <p role="status" className="nf-day-kit__note">
          {note}
        </p>
      )}
    </section>
  );
}
