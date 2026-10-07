import type { ReactNode } from "react";
import { StatusChip, type ChipState } from "@/components/ui/StatusChip";
import { StatusPill, type StatusTone } from "@/components/ui/StatusPill";

/**
 * THE CONSOLE'S STATUS, SAID THREE WAYS (reference 7071: a state is a word, a
 * shape and a colour, never a colour alone).
 *
 * The console's tables carry their statuses as `StatusPill` tones, chosen from
 * the machine value by `toneForStatus`. `StatusChip` is the semantic front
 * door to that same pill (label, shape and colour move together on a status
 * change, so a chip is never briefly a green "Failed"), so the console's
 * statuses go through it wherever the tone names one of its six states.
 *
 * ONE TONE IS LEFT ON THE PILL. `info` (a review in progress, a payment
 * processing) has no ChipState: the chip's `disputed` is cyan with a diamond
 * and means "raised and being looked at", and calling a booking that is merely
 * processing "disputed" would be a claim. So `info` keeps its blue diamond
 * pill, which already carries its word, and nothing about its look changes.
 *
 * This decides no state. It maps the tone a caller already chose.
 */
const STATE_FOR_TONE: Partial<Record<StatusTone, ChipState>> = {
  success: "success",
  warning: "pending",
  danger: "failed",
  brand: "protected",
  neutral: "neutral",
};

export function chipStateForTone(tone: StatusTone): ChipState | null {
  return STATE_FOR_TONE[tone] ?? null;
}

export function ConsoleStatus({
  tone,
  size = "sm",
  className,
  children,
}: {
  tone: StatusTone;
  size?: "xs" | "sm" | "md";
  className?: string;
  /** The word. Required: a status with no word is colour alone. */
  children: ReactNode;
}) {
  const state = chipStateForTone(tone);
  if (state) {
    return (
      <StatusChip state={state} size={size} className={className}>
        {children}
      </StatusChip>
    );
  }
  return (
    <StatusPill tone={tone} size={size} className={className}>
      {children}
    </StatusPill>
  );
}
