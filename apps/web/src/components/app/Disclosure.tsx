"use client";

import { useState, type ReactNode } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { ICON, TYPE } from "./Screen";
import { DisclosureInline } from "./DisclosureInline";

/**
 * Progressive disclosure: the mechanism by which nothing gets deleted.
 *
 * The instruction is explicit and it is the one to hold onto hardest: every
 * feature stays. When a screen is overloaded the answer is never to remove a
 * capability, it is to move it. This is the move.
 *
 * A `Disclosure` is a quiet, full-width trigger row that says what is behind it
 * and how much of it there is, and opens that content in a bottom sheet. The
 * content is still in the product, still one tap away, still reachable by
 * keyboard and still announced to a screen reader. What changed is that it is
 * no longer competing for the first screenful with the thing the reader
 * actually came for.
 *
 * WHERE IT IS THE RIGHT ANSWER
 *
 *   - A breakdown behind a total. The reference platform's balance surface
 *     shows one number and one action, with the full breakdown behind a
 *     "details" sheet. Ours does the same with the move-in cost: the figure a
 *     Nigerian renter shops on leads, and the six fees that compose it are
 *     behind this.
 *   - A policy, a schedule, a long-form explanation. Real, occasionally
 *     essential, and not what the screen is about.
 *   - Anything the audit called a "further bordered block below".
 *
 * WHERE IT IS THE WRONG ANSWER
 *
 *   - The primary action. Never behind a tap.
 *   - Anything a person needs in order to decide whether to act at all. Price,
 *     status, bed and bath, and whether the light works stay on the page.
 *
 * THE TRIGGER IS A ROW, NOT A BUTTON. It carries no card, no border box and no
 * plate behind its chevron: a hairline above and below where it sits in a run,
 * the label at row-title size, an optional count in the muted tone, and a
 * chevron. It is a full-width target well past 44px tall.
 *
 * INLINE (plan item 30, 29 September 2026): `inline` opens the content in
 * place instead of in a sheet, for settings sub-sections, the host wizard's
 * sections and anything short enough to read where it sits. It is a native
 * `<details>` with the one disclosure motion in `app/css/list-group.css`
 * (`.nf-disclosure`): the panel grows and fades in over 240ms while the
 * chevron turns, and it is instant under reduced motion, Calm and Off. The
 * landing FAQ takes the same classes.
 */
export function Disclosure({
  label,
  hint,
  title,
  children,
  footer,
  detents,
  inline = false,
  defaultOpen = false,
  "data-testid": testId,
}: {
  /** What is behind this. A noun phrase, e.g. "The full move-in breakdown". */
  label: string;
  /** How much of it there is, or one clarifying word. Optional and quiet. */
  hint?: string;
  /** The sheet's own title. Defaults to `label`. */
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  detents?: number[];
  /** Open in place (a `<details>`) rather than in a sheet. */
  inline?: boolean;
  /** Inline only: start open. */
  defaultOpen?: boolean;
  "data-testid"?: string;
}) {
  const [open, setOpen] = useState(false);

  if (inline) {
    return (
      <DisclosureInline title={title ?? label} hint={hint} footer={footer} defaultOpen={defaultOpen} data-testid={testId}>
        {children}
      </DisclosureInline>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        data-testid={testId}
        className="group flex w-full items-center gap-md py-md text-left transition-colors hover:bg-[var(--nf-glass-fill)]"
      >
        <span className="min-w-0 flex-1">
          <span className={`block ${TYPE.rowTitle}`}>{label}</span>
          {hint && <span className={`mt-3xs block ${TYPE.rowMeta}`}>{hint}</span>}
        </span>
        <UiIcon
          name="chevron-right"
          size={ICON.row}
          className="shrink-0 text-[var(--nf-content-muted)] transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
        />
      </button>

      <Sheet
        open={open}
        onOpenChange={setOpen}
        title={title ?? label}
        detents={detents}
        footer={footer}
      >
        {children}
      </Sheet>
    </>
  );
}
