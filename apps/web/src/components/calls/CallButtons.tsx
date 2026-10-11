"use client";

import { useEffect, useState } from "react";
import "@/app/css/calls.css";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { fill } from "@/lib/calls/screen";
import type { CallKind } from "@/lib/calls/types";
import { registerContext } from "./call-store";
import { placeCall } from "./place-call";
import type { CallsCopy } from "./views";

/**
 * THE THREAD HEADER'S TWO CALL BUTTONS: voice and video, bare solid glyphs in
 * brand blue (D78: action icons are bare), 44px targets.
 *
 * Drawn only when the page found `video_calls` on and the reader is signed
 * in; the database refuses every call while it is off whatever a screen
 * draws. A tap mints its own `tapKey` (`placeCall`), so a double tap is one
 * call. What can come back, and what the reader sees:
 *
 *   ringing             the outgoing screen opens (the call surface)
 *   glare               they were already ringing you: THEIR call opens
 *   busy                "{name} is on another call", under the header
 *   not engaged         "Calls open once they have replied", with the reason
 *   blocked, barred,
 *   rate limited,
 *   switched off        the server's own sentence, under the header
 *
 * It also tells the call store what this thread is about, so the outgoing
 * screen, and an incoming call that arrives while this thread is open, can
 * carry the listing or business line under the name.
 */
export function CallButtons({
  conversationId,
  name,
  contextLine,
  copy,
}: {
  conversationId: string;
  name: string;
  contextLine?: string | null;
  copy: CallsCopy;
}) {
  const [pending, setPending] = useState<CallKind | null>(null);
  const [note, setNote] = useState<{ title?: string; body: string } | null>(null);

  useEffect(() => registerContext(conversationId, { line: contextLine ?? null }), [conversationId, contextLine]);
  useEffect(() => {
    if (!note) return;
    const timer = window.setTimeout(() => setNote(null), 9000);
    return () => window.clearTimeout(timer);
  }, [note]);

  const tap = async (kind: CallKind) => {
    if (pending) return;
    setPending(kind);
    setNote(null);
    const result = await placeCall({ conversationId, kind, context: { line: contextLine ?? null } });
    setPending(null);
    if (!result.ok) {
      setNote(
        result.refusal === "not_engaged"
          ? { title: copy.refusal.notEngagedTitle, body: copy.refusal.notEngagedBody }
          : { body: result.error },
      );
      return;
    }
    if (result.outcome === "busy") setNote({ body: fill(copy.outgoing.busy, { name }) });
  };

  return (
    <span className="nf-call-buttons">
      <button
        type="button"
        className="nf-thread__call"
        aria-label={fill(copy.buttons.voiceWith, { name })}
        aria-busy={pending === "AUDIO" || undefined}
        disabled={pending !== null}
        onClick={() => void tap("AUDIO")}
        data-testid="thread-call-voice"
      >
        <UiIcon name="phone" size={24} filled />
      </button>
      <button
        type="button"
        className="nf-thread__call"
        aria-label={fill(copy.buttons.videoWith, { name })}
        aria-busy={pending === "VIDEO" || undefined}
        disabled={pending !== null}
        onClick={() => void tap("VIDEO")}
        data-testid="thread-call-video"
      >
        <UiIcon name="video" size={24} filled />
      </button>
      {note ? (
        <span className="nf-call-note nf-call-note--pop" role="status" data-testid="thread-call-note">
          <span style={{ minWidth: 0, flex: 1 }}>
            {note.title ? <strong>{note.title}</strong> : null}
            {note.body}
          </span>
          <button type="button" className="nf-call-row__back" onClick={() => setNote(null)} aria-label={copy.refusal.dismiss}>
            <UiIcon name="close" size={16} />
          </button>
        </span>
      ) : null}
    </span>
  );
}
