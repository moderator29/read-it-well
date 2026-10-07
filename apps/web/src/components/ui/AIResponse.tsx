"use client";

import type { ReactNode } from "react";
import "@/app/css/ported.css";
import { Button } from "@/components/ui/Button";
import { IconPlate } from "@/components/ui/IconPlate";
import type { UiIconName } from "@/design-system/icons/UiIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { cn } from "@/lib/cn";

/**
 * AI RESPONSE: THE SHAPE OF A STREAMED ANSWER.
 *
 * From the library spec (docs/design/COMPONENT_LIBRARY.md, "Batch gesture tray and
 * AI response"; the `ai-response` registry component was not installed, per
 * D39.5, so this is built from the spec in Vallo's tokens). It is the assistant's
 * and the support summariser's answer card.
 *
 * IT DRAWS WHAT IT IS GIVEN AND DECIDES NOTHING. The honesty rules of the
 * assistant hold here too: it never invents a listing, a price or a fact. This
 * component has no copy of its own and no content of its own; the answer is
 * `children`, which the caller renders from what actually came back (a streaming
 * caller re-renders `children` as text arrives). If an answer has a price in it,
 * the caller renders it through `Money`, as everywhere.
 *
 * FIVE STATES, each a real thing and none a spinner:
 *
 *   thinking   waiting for the first words. A shaped skeleton of three lines
 *              softly pulsing, beside `thinkingLabel`. This is the ONE permitted
 *              loop in the product besides the aurora (MOTION_SYSTEM, principle
 *              10): the assistant thinking state. Under reduced motion, Calm and
 *              Off it is a still skeleton.
 *   streaming  the words so far, with a still caret at the end (no blink: a
 *              blinking caret is a second loop, and only thinking is allowed
 *              one). `Stop`, if `onStop` is given.
 *   done       the full answer and the caller's actions (copy, share, report).
 *   stopped    the person stopped it; what arrived stays.
 *   error      `errorMessage`, in words the caller wrote about what actually
 *              failed. Never a generic "something went wrong".
 *
 * TRANSITIONS. The skeleton gives way to the first words with a 160ms crossfade
 * on the standard curve (MOTION_SYSTEM, "Skeleton to content"), which is CSS.
 *
 * ANNOUNCING. Reading every token aloud would make the answer unusable, so the
 * answer region is NOT live while it streams. A separate polite status says
 * `thinkingLabel`, then the state words (`statusLabels`) once, when the state
 * changes. `aria-busy` is set while thinking and streaming.
 *
 * SHAPE. A Card at radius 18 with one hairline; the assistant's mark is a round
 * `bot` plate. Stop and the actions are the product's 44px radius-14 buttons.
 */
export type AIResponseStatus = "thinking" | "streaming" | "done" | "stopped" | "error";

export type AIResponseAction = {
  id: string;
  label: string;
  icon?: UiIconName;
  onSelect: () => void;
};

export function AIResponse({
  status,
  label,
  thinkingLabel,
  statusLabels,
  stopLabel,
  onStop,
  errorMessage,
  actions,
  children,
  className,
  "data-testid": testId,
}: {
  status: AIResponseStatus;
  /** The card's accessible name, e.g. "Assistant". */
  label: string;
  /** Shown with the skeleton while waiting for the first words. */
  thinkingLabel: string;
  /** Said once, politely, when the state becomes done, stopped or error. */
  statusLabels: { done: string; stopped: string; error: string };
  /** The Stop button's name. With `onStop`, shown while thinking and streaming. */
  stopLabel?: string;
  onStop?: () => void;
  /** What failed, in the caller's words. Shown in the `error` state. */
  errorMessage?: string;
  /** Shown once the answer is complete. */
  actions?: readonly AIResponseAction[];
  /** The answer so far. */
  children?: ReactNode;
  className?: string;
  "data-testid"?: string;
}) {
  const working = status === "thinking" || status === "streaming";
  const announce =
    status === "thinking"
      ? thinkingLabel
      : status === "done"
        ? statusLabels.done
        : status === "stopped"
          ? statusLabels.stopped
          : status === "error"
            ? statusLabels.error
            : "";

  return (
    <article
      aria-label={label}
      aria-busy={working || undefined}
      className={cn("nf-ai", className)}
      data-status={status}
      data-testid={testId}
    >
      <header className="nf-ai__head">
        <IconPlate shape="round" size="sm" tone={status === "error" ? "danger" : "brand"}>
          <UiIcon name={status === "error" ? "alert-triangle" : "bot"} size={20} />
        </IconPlate>
        <p className="nf-ai__who">{status === "thinking" ? thinkingLabel : label}</p>
        {working && onStop && stopLabel ? (
          <Button variant="glass" size="sm" onClick={onStop}>
            {stopLabel}
          </Button>
        ) : null}
      </header>

      {status === "thinking" ? (
        <div className="nf-ai__skeleton" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      ) : (
        <div className="nf-ai__body" data-streaming={status === "streaming" || undefined}>
          {children}
          {status === "streaming" ? <span className="nf-ai__caret" aria-hidden="true" /> : null}
        </div>
      )}

      {status === "error" && errorMessage ? (
        <p className="nf-ai__error" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {status === "done" && actions?.length ? (
        <div className="nf-ai__actions">
          {actions.map((action) => (
            <Button key={action.id} variant="quiet" size="sm" leadingIcon={action.icon} onClick={action.onSelect}>
              {action.label}
            </Button>
          ))}
        </div>
      ) : null}

      <p role="status" aria-live="polite" className="sr-only">
        {announce}
      </p>
    </article>
  );
}
