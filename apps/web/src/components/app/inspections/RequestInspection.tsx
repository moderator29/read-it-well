"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDate, type Locale } from "@naijafinds/i18n";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { AuthGate } from "@/components/auth/AuthGate";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { TYPE } from "@/components/app/Screen";
import { requestInspection } from "@/lib/inspections/actions";
import type { Inspection } from "@/lib/inspections/types";

/**
 * ASKING TO SEE A PROPERTY, AS A THING RATHER THAN A SENTENCE.
 *
 * The rental panel has always said "inspect the property" as step two of three
 * and offered exactly one control: message the agent. So the inspection - the
 * step that decides every rental in this market - happened as prose in a chat
 * thread, tracked by both sides by scrolling, and represented nowhere.
 *
 * This files a real request with a real time on it. The agent gets a row in a
 * queue on their own home screen, the person who asked gets a row with a state
 * on it, and both are reading the same record.
 *
 * MESSAGING IS NOT REPLACED. It sits beside this, and it should: a viewing
 * needs a conversation around it. What has changed is that the conversation is
 * no longer the only place the arrangement exists.
 *
 * ALREADY ASKED IS ITS OWN STATE. A second identical request against the same
 * property is how an agent's queue becomes useless, so when one is already
 * open this states where it stands instead of offering to file another.
 */
export function RequestInspection({
  listingId,
  existing,
  locale,
}: {
  listingId: string;
  /** An open request this person already has against this property, if any. */
  existing: Inspection | null;
  locale: Locale;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [when, setWhen] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (existing) {
    const shown = existing.slotAt ?? existing.requestedAt;
    const date = new Date(shown);
    const stamp = Number.isNaN(date.getTime())
      ? ""
      : formatDate(date, locale, { weekday: "short", day: "numeric", month: "short" });

    return (
      <p className={`flex items-start gap-2 ${TYPE.rowMeta}`} data-testid="inspection-existing">
        <UiIcon name="calendar-booking" size={20} className="mt-0.5 shrink-0" />
        <span>
          {existing.state === "CONFIRMED"
            ? `${CONFIRMED_FOR} ${stamp}. ${TRACK_IT}`
            : existing.state === "PROPOSED"
              ? `${OFFERED_ANOTHER} ${stamp}. ${TRACK_IT}`
              : `${ASKED_FOR} ${stamp}. ${TRACK_IT}`}
        </span>
      </p>
    );
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await requestInspection({
        listingId,
        when: new Date(when).toISOString(),
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      setWhen("");
      setNote("");
      router.refresh();
    });
  }

  return (
    <>
      {/* Requesting an inspection is one of the gated actions, so a guest gets
          the door carrying the screen they were standing on. */}
      <AuthGate action="inspect">
        <Button
          full
          variant="secondary"
          onClick={() => setOpen(true)}
          data-testid="request-inspection"
        >
          <UiIcon name="calendar-booking" size={16} />
          {ASK}
        </Button>
      </AuthGate>

      <Sheet open={open} onOpenChange={setOpen} title={SHEET_TITLE} detents={[0.6]}>
        <div className="px-1 pb-2">
          <p className={TYPE.body}>{SHEET_SUB}</p>

          <label className="mt-4 block">
            <span className="nf-label">{WHEN_LABEL}</span>
            <input
              type="datetime-local"
              value={when}
              onChange={(event) => setWhen(event.target.value)}
              className="nf-field mt-1 w-full"
              data-testid="inspection-when"
            />
          </label>

          <label className="mt-4 block">
            <span className="nf-label">{NOTE_LABEL}</span>
            <input
              type="text"
              value={note}
              maxLength={400}
              onChange={(event) => setNote(event.target.value)}
              placeholder={NOTE_PLACEHOLDER}
              className="nf-field mt-1 w-full"
            />
          </label>

          {error && (
            <p role="alert" className={`mt-3 ${TYPE.rowMeta} text-[var(--nf-state-error)]`}>
              {error}
            </p>
          )}

          <p className={`mt-4 ${TYPE.rowMeta}`}>{SAFETY}</p>

          <Button
            full
            size="lg"
            variant="primary"
            className="mt-5"
            disabled={pending || when.length === 0}
            onClick={submit}
          >
            {SEND}
          </Button>
        </div>
      </Sheet>
    </>
  );
}

/* --------------------------------------------------------------- the copy */
const ASK = "Request an inspection";
const SHEET_TITLE = "Request an inspection";
const SHEET_SUB =
  "Pick a time that suits you. Whoever listed this can confirm it, offer another time, or say no, and you will see which on your own screen.";
const WHEN_LABEL = "When you would like to see it";
const NOTE_LABEL = "Anything they should know";
const NOTE_PLACEHOLDER = "Coming from Yaba, so late morning is easier";
const SAFETY =
  "Inspect before you pay anything. Keep the chat and the payment inside Vallo; a deal made outside it is not protected by us.";
const SEND = "Send the request";
const ASKED_FOR = "You asked to see this on";
const CONFIRMED_FOR = "Your inspection is confirmed for";
const OFFERED_ANOTHER = "They have offered";
const TRACK_IT = "It is on your bookings screen.";
