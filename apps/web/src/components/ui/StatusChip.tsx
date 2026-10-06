"use client";

import { useState, type ReactNode } from "react";
import { StatusPill, type StatusTone } from "./StatusPill";

/**
 * THE STATUS CHIP: A STATE, SAID THREE WAYS (Session 3, 6 October 2026; north
 * star sections 3 and 7, motion 20).
 *
 * Vallo's palette is one hue, so colour may never be the only signal: every
 * state here carries a WORD (the caller's, from the locale files), a SHAPE
 * (the mark, different per state and legible in greyscale at 8px) and a
 * COLOUR. It is not a third status component. It is the semantic front door
 * of the one that exists: it names the money and trust states a member meets
 * and renders `StatusPill`, whose material is the shared badge
 * (`.nf-badge`, chips.css, through `StatusBadge`'s tone classes).
 *
 *   state       colour            shape            what it means
 *   success     emerald           filled circle    finished, good: paid, released
 *   pending     cyan (attention)  hollow circle    waiting on somebody
 *   failed      rose              filled square    it did not happen; the only red
 *   protected   brand blue        hollow square    held safe: money in escrow
 *   disputed    cyan (attention)  diamond          raised and being looked at;
 *                                                  not an error, so never red
 *   neutral     grey              bar              no state at all
 *
 * WHEN THE STATE CHANGES, label, colour and shape change together on one
 * 240ms `glide` crossfade (`.nf-status-swap`), never one before the others,
 * so a chip is never briefly a green "Failed". On first render it is simply
 * there. Under reduced motion, Calm and Off the change is instant.
 *
 * It presents a state; it never decides one. The caller passes what the
 * server says is true.
 */
export type ChipState = "success" | "pending" | "failed" | "protected" | "disputed" | "neutral";

const STATE: Record<ChipState, { tone: StatusTone; shape: StatusTone }> = {
  success: { tone: "success", shape: "success" },
  pending: { tone: "warning", shape: "warning" },
  failed: { tone: "danger", shape: "danger" },
  protected: { tone: "brand", shape: "brand" },
  disputed: { tone: "warning", shape: "info" },
  neutral: { tone: "neutral", shape: "neutral" },
};

/** The colour and the mark a state is drawn with. Exported for its test. */
export function chipLook(state: ChipState): { tone: StatusTone; shape: StatusTone } {
  return STATE[state];
}

export function StatusChip({
  state,
  size = "sm",
  live = false,
  className,
  children,
}: {
  state: ChipState;
  size?: "xs" | "sm" | "md";
  /** Announce a change in place (a payment settling while you watch). */
  live?: boolean;
  className?: string;
  /** The word. Required: a chip with no label is colour alone. */
  children: ReactNode;
}) {
  /* A turn counter, moved during render when the state moves, so the swap
     class (and a fresh element to play it on) appears only on a change. */
  const [seen, setSeen] = useState({ state, turn: 0 });
  if (seen.state !== state) setSeen({ state, turn: seen.turn + 1 });
  const look = STATE[state];
  return (
    <StatusPill
      key={seen.turn}
      tone={look.tone}
      markShape={look.shape}
      size={size}
      live={live}
      className={[seen.turn > 0 ? "nf-status-swap" : "", className ?? ""].filter(Boolean).join(" ")}
    >
      {children}
    </StatusPill>
  );
}
