"use client";

import { useCallback, useState } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import "@/app/css/ported.css";
import { cn } from "@/lib/cn";
import { feedback } from "@/lib/ui/feedback";
import { particleDelete, type ParticleDeleteOptions } from "./particle-delete";

/**
 * PARTICLE DELETE: REMOVING A THING SO IT LEAVES WITH A LITTLE CEREMONY.
 *
 * Rebuilt from the founder's `particle-delete.tsx`. The original ships a demo
 * deck of invented "resources" (an edge cluster, a session vault, a cache) with
 * invented counts and latencies; none of that is here. What is kept is the
 * `ParticleDeleteContainer` idea: a wrapper that gives any element the dissolve,
 * with a render-prop handing the content a `remove` function. The dissolve
 * itself is `particle-delete.ts`.
 *
 * WHERE: removing a saved item, a draft listing, an uploaded photo, a dismissed
 * notification. Memorable and light, and the right register for things a person
 * will not miss.
 *
 * NEVER, AND THIS IS THE RULE (COMPONENT_LIBRARY.md, D34): money, a payout
 * method, a transaction record, anything in the ledger, an account. A playful
 * dissolve on a consequential deletion is the wrong emotional register; those
 * get `DragToConfirm` and a plain, serious confirmation. Nothing in this file
 * can enforce that for a caller, so it is enforced by placement: this component
 * is not used in `app/(app)/wallet`, `payments`, `payouts`, `earnings`,
 * `escrow`, or `settings/account`, and a review that finds it there rejects it.
 *
 * THE DISSOLVE IS NEVER A LIE. `remove()` calls `onDelete` FIRST and plays the
 * dissolve only if it succeeded (it did not resolve `false`, and did not throw).
 * A deletion that failed does not animate as though it had worked; the item
 * stays, and the error haptic says so. So `onDelete` is the real deletion, and
 * the item must be taken out of the caller's list in `onGone`, which fires when
 * the dissolve has finished (not in `onDelete`, or there would be nothing left
 * on screen to dissolve).
 *
 * ACCESSIBLE: the dissolve layer is `aria-hidden` and click-through, the action
 * that triggers it is the caller's own real button (the render-prop gives it
 * `remove`), and `aria-busy` is set while it plays. Quiet readers (system reduced
 * motion, Calm, Off) and data saver get a 160ms fade instead of particles.
 * One haptic, "confirm", when the dissolve starts.
 */
export type ParticleDeleteProps = Omit<HTMLAttributes<HTMLDivElement>, "children" | "onError"> & {
  /** The real deletion. Resolve `false`, or throw, if it did not happen. */
  onDelete?: () => void | boolean | Promise<void | boolean>;
  /** Fires once the dissolve has finished: remove the item from the list here. */
  onGone?: () => void;
  options?: ParticleDeleteOptions;
  children: ReactNode | ((args: { isDeleting: boolean; remove: () => void }) => ReactNode);
};

export function ParticleDelete({ onDelete, onGone, options, children, className, ...rest }: ParticleDeleteProps) {
  /* The element is held in state, not a ref, so the handler handed to the
     render-prop reads nothing during render. */
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const [isDeleting, setDeleting] = useState(false);

  const remove = useCallback(async () => {
    if (isDeleting) return;
    setDeleting(true);
    try {
      const result = await onDelete?.();
      if (result === false) throw new Error("not deleted");
    } catch {
      setDeleting(false);
      feedback("error");
      return;
    }
    feedback("confirm");
    if (host) await particleDelete(host, options);
    onGone?.();
  }, [isDeleting, host, onDelete, onGone, options]);

  const start = useCallback(() => {
    void remove();
  }, [remove]);

  return (
    <div ref={setHost} className={cn("nf-particle-host", className)} aria-busy={isDeleting || undefined} {...rest}>
      {typeof children === "function" ? children({ isDeleting, remove: start }) : children}
    </div>
  );
}
