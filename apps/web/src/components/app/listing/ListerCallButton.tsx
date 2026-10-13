"use client";

import { useEffect, useState } from "react";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { iconPlateClass } from "@/components/ui/IconPlate";
import { placeCall } from "@/components/calls/place-call";
import { fill } from "@/lib/calls/screen";

/**
 * THE "LISTED BY" CARD'S CALL BUTTON, WHEN A CALL CAN ACTUALLY BE PLACED.
 *
 * Drawn by the page only when the `video_calls` switch is on, the reader is
 * signed in and a conversation about this listing already exists between
 * them: calls in Vallo belong to a conversation (VC1), so the listing's own
 * thread is the one this rings on. Everywhere else the card draws the plain
 * link to that conversation instead, which is the existing way to reach a
 * lister.
 *
 * The tap is the calls feature's own `placeCall`, one `tapKey` per tap, voice
 * only (a video call is one tap away inside the call). The database decides
 * whether the lister can be called; what it refuses comes back as its own
 * sentence under the card, with the calm "Calls open once they have replied"
 * when they have not written back yet.
 */
export type ListerCallCopy = {
  /** "Voice call {name}" (`calls.buttons.voiceWith`). */
  label: string;
  /** `calls.refusal.notEngagedTitle` and `notEngagedBody`. */
  notEngagedTitle: string;
  notEngagedBody: string;
  /** "{name} is on another call" (`calls.outgoing.busy`). */
  busy: string;
  /** "OK" (`calls.refusal.dismiss`). */
  dismiss: string;
};

export function ListerCallButton({
  conversationId,
  name,
  contextLine,
  copy,
}: {
  conversationId: string;
  /** The lister's name as the card shows it, for the label and the busy line. */
  name: string;
  /** The listing's title, carried to the call screen under the name. */
  contextLine: string;
  copy: ListerCallCopy;
}) {
  const [pending, setPending] = useState(false);
  const [note, setNote] = useState<{ title?: string; body: string } | null>(null);

  useEffect(() => {
    if (!note) return;
    const timer = window.setTimeout(() => setNote(null), 9000);
    return () => window.clearTimeout(timer);
  }, [note]);

  const tap = async () => {
    if (pending) return;
    setPending(true);
    setNote(null);
    const result = await placeCall({ conversationId, kind: "AUDIO", context: { line: contextLine } });
    setPending(false);
    if (!result.ok) {
      setNote(
        result.refusal === "not_engaged"
          ? { title: copy.notEngagedTitle, body: copy.notEngagedBody }
          : { body: result.error },
      );
      return;
    }
    if (result.outcome === "busy") setNote({ body: fill(copy.busy, { name }) });
  };

  return (
    <>
      <button
        type="button"
        className={iconPlateClass({ size: "md", tone: "solid", shape: "round", className: "nf-lister-act" })}
        aria-label={fill(copy.label, { name })}
        aria-busy={pending || undefined}
        disabled={pending}
        onClick={() => void tap()}
        data-testid="lister-call"
        data-call="live"
      >
        <UiIcon name="phone" size={20} />
      </button>
      {note ? (
        <span className="nf-lister-note" role="status" data-testid="lister-call-note">
          <span className="min-w-0 flex-1">
            {note.title ? <strong className="block">{note.title}</strong> : null}
            {note.body}
          </span>
          <button type="button" className="nf-tap nf-caption font-semibold" onClick={() => setNote(null)}>
            {copy.dismiss}
          </button>
        </span>
      ) : null}
    </>
  );
}
