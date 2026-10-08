"use client";

import "@/app/css/calls.css";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { durationWords } from "@/lib/calls/lifecycle";
import { fill, type CallMarkerView } from "@/lib/calls/screen";
import type { CallsCopy } from "./views";

/**
 * A FINISHED CALL IN THE THREAD: a compact system row, not a bubble.
 *
 * The row is drawn from the call itself when the page read it
 * (`call_history`, per viewer) and from the marker's plain words otherwise,
 * through `callMarkerView`. A call this reader missed is the one red row;
 * everything else is the calm blue glyph. The call-back control is drawn
 * only where calls are open (the page passes `onCallBack`), and calls back
 * with the same kind.
 */
export function callRowWords(view: CallMarkerView, copy: CallsCopy): { title: string; detail: string } {
  const h = copy.history;
  const kindWord = view.kind === "VIDEO" ? h.video : h.voice;
  if (view.missed) return { title: view.kind === "VIDEO" ? h.missedVideo : h.missedVoice, detail: "" };
  switch (view.outcome) {
    case "talked":
      return { title: kindWord, detail: [view.outgoing ? h.outgoing : h.incoming, durationWords(view.seconds)].filter(Boolean).join(", ") };
    case "missed":
      return { title: kindWord, detail: h.noAnswer };
    case "declined":
      return { title: kindWord, detail: view.outgoing ? h.declined : h.youDeclined };
    case "cancelled":
      return { title: kindWord, detail: h.cancelled };
    case "busy":
      return { title: kindWord, detail: h.busy };
    case "failed":
      return { title: kindWord, detail: h.failed };
    case "expired":
      return { title: kindWord, detail: h.expired };
    default:
      return { title: kindWord, detail: h.ended };
  }
}

export function CallHistoryRow({
  view,
  timeLabel,
  copy,
  onCallBack,
  busy,
}: {
  view: CallMarkerView;
  timeLabel: string;
  copy: CallsCopy;
  onCallBack?: () => void;
  busy?: boolean;
}) {
  const { title, detail } = callRowWords(view, copy);
  const glyph: UiIconName = view.missed
    ? "phone-missed"
    : view.outcome === "talked"
      ? view.kind === "VIDEO"
        ? "video"
        : "phone"
      : view.outgoing
        ? "phone-outgoing"
        : "phone-incoming";
  const kindWord = view.kind === "VIDEO" ? copy.history.video : copy.history.voice;
  return (
    <div
      className="nf-call-row"
      role="group"
      aria-label={[title, detail, timeLabel].filter(Boolean).join(", ")}
      data-testid="call-history-row"
      {...(view.missed ? { "data-missed": "" } : {})}
    >
      <span className="nf-call-row__glyph" aria-hidden="true">
        <UiIcon name={glyph} size={20} filled />
      </span>
      <span className="nf-call-row__text">
        <span className="nf-call-row__title">{title}</span>
        <span className="nf-call-row__meta">{[detail, timeLabel].filter(Boolean).join(" · ")}</span>
      </span>
      {onCallBack ? (
        <button
          type="button"
          className="nf-call-row__back"
          onClick={onCallBack}
          disabled={busy}
          aria-label={fill(copy.history.callBack, { kind: kindWord.toLowerCase() })}
          data-testid="call-history-callback"
        >
          <UiIcon name={view.kind === "VIDEO" ? "video" : "phone"} size={20} filled />
        </button>
      ) : null}
    </div>
  );
}
