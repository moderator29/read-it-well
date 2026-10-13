"use client";

import "@/app/css/calls.css";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { fill, type CallMarkerView } from "@/lib/calls/screen";
import { callNouns, callPillSentence, type CallPillWords } from "./call-pill-words";

/**
 * A FINISHED CALL IN THE THREAD: a compact, centred system pill, the way
 * WhatsApp and Telegram draw one. It is not a bubble and not a card.
 *
 * Left to right: a small glyph that says the direction (a call you placed, a
 * call that came in) or the one status that matters (a missed call, in red),
 * one plain line that says who and what ("Missed video call from Nora",
 * "You called Nora, cancelled", "Video call with Nora, 12 min"), the time, and
 * a small call-back button. The button is drawn only where calls are open (the
 * page passes `onCallBack`) and starts the same kind of call, through the
 * existing calls feature (`placeCall`), never a second path.
 *
 * The line is built by `callPillSentence` from the call's own recorded facts:
 * a length is only said when the call recorded one.
 */
export function CallHistoryRow({
  view,
  name,
  timeLabel,
  words,
  onCallBack,
  busy,
}: {
  view: CallMarkerView;
  /** The other person, as the thread names them. */
  name: string;
  timeLabel: string;
  words: CallPillWords;
  onCallBack?: () => void;
  busy?: boolean;
}) {
  const sentence = callPillSentence(view, name, words);
  const nouns = callNouns(view, words);
  const glyph: UiIconName = view.missed ? "phone-missed" : view.outgoing ? "phone-outgoing" : "phone-incoming";
  return (
    <div className="nf-call-event-row" data-testid="call-pill-row">
      <div
        className="nf-call-event"
        role="group"
        aria-label={[nouns.Call, sentence, timeLabel].filter(Boolean).join(". ")}
        data-testid="call-history-row"
        data-kind={view.kind === "VIDEO" ? "video" : "voice"}
        {...(view.missed ? { "data-missed": "" } : {})}
      >
        <span className="nf-call-event__glyph" aria-hidden="true">
          <UiIcon name={glyph} size={16} filled />
        </span>
        <span className="nf-call-event__text">
          <span className="nf-call-event__line">{sentence}</span>
          {timeLabel ? <span className="nf-call-event__time">{timeLabel}</span> : null}
        </span>
        {onCallBack ? (
          <button
            type="button"
            className="nf-call-event__back"
            onClick={onCallBack}
            disabled={busy}
            aria-label={fill(words.callBack, { name, call: nouns.call })}
            data-testid="call-history-callback"
          >
            <span className="nf-call-event__go" aria-hidden="true">
              <UiIcon name={view.kind === "VIDEO" ? "video" : "phone"} size={16} filled />
            </span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
