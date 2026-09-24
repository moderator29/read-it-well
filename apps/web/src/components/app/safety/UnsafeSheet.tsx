"use client";

import { useState, useTransition } from "react";
import type { Dictionary } from "@vallo/i18n";
import { Sheet } from "@/components/ui/Sheet";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { feelUnsafe } from "@/lib/safety/unsafe-actions";
import { responseTimeFor } from "@/lib/trust/standards";

/**
 * "I FEEL UNSAFE" (V-63): one control in every thread and on every
 * inspection, for the moment somebody does not want to choose a report
 * category. One sheet, the actions in the order a frightened person needs
 * them:
 *
 *   Call 112          a `tel:` link, the one exit the product allows for danger.
 *   Leave and block   blocks, tells Vallo, pauses their inspections.
 *   Tell Vallo        tells Vallo on the four-hour clock, pauses their
 *                     inspections, and changes nothing else.
 *
 * "Tell someone" (the trusted-contact check-in, V-62) is not drawn: it does
 * not exist on this branch, and a row that does nothing is worse than none.
 *
 * The promise is read from `lib/trust/standards.ts`, the same number the
 * standards page prints and the moderation desk counts down, so the sheet
 * cannot promise a time nobody is keeping.
 */
export function UnsafeSheet({
  copy,
  conversationId,
  inspectionId,
  trigger,
  onOpen,
  afterLeave,
}: {
  copy: Dictionary["trustVisible"]["unsafe"];
  conversationId?: string;
  inspectionId?: string;
  /** "row" inside a sheet that is already open; "button" on an inspection card. */
  trigger: "row" | "button";
  onOpen?: () => void;
  /** Where to go once they have left and blocked, e.g. the inbox. */
  afterLeave?: string;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const clock = responseTimeFor("unsafe").phrase;

  function file(block: boolean) {
    setNote(null);
    startTransition(async () => {
      const result = await feelUnsafe({
        ...(conversationId ? { conversationId } : { inspectionId }),
        block,
      });
      if (!result.ok) {
        setNote({ ok: false, text: result.error });
        return;
      }
      setNote({ ok: true, text: (block ? copy.left : copy.told).replace("{clock}", clock) });
      if (block && afterLeave) window.setTimeout(() => window.location.assign(afterLeave), 2500);
    });
  }

  const opener =
    trigger === "row" ? (
      <button
        type="button"
        onClick={() => {
          onOpen?.();
          setOpen(true);
        }}
        data-testid="unsafe-opener"
        className="nf-share-row mt-md w-full text-left"
      >
        <span className="h-11 w-11 shrink-0" aria-hidden="true">
          <BrandIcon name="shield-lock" fill />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block nf-body font-semibold text-[var(--nf-content-primary)]">{copy.opener}</span>
          <span className="block nf-caption text-[var(--nf-content-muted)]">{copy.openerHint}</span>
        </span>
        <UiIcon name="chevron-right" size={16} className="shrink-0 text-[var(--nf-content-muted)]" />
      </button>
    ) : (
      <button
        type="button"
        onClick={() => {
          onOpen?.();
          setOpen(true);
        }}
        data-testid="unsafe-opener"
        className="nf-btn nf-btn--ghost nf-btn--sm min-h-[44px]"
      >
        <UiIcon name="shield-stop" size={16} className="shrink-0" />
        {copy.opener}
      </button>
    );

  return (
    <>
      {opener}
      <Sheet open={open} onOpenChange={setOpen} title={copy.title} closeLabel={copy.close}>
        <div className="grid gap-sm pb-lg" data-testid="unsafe-sheet">
          <p className="nf-body text-[var(--nf-content-secondary)]">{copy.lede}</p>

          <a href="tel:112" className="nf-btn nf-btn--danger w-full min-h-[44px]" data-testid="unsafe-call">
            <UiIcon name="phone" size={18} className="shrink-0" />
            {copy.call}
          </a>
          <p className="nf-caption text-[var(--nf-content-muted)]">{copy.callHint}</p>

          {note?.ok ? (
            <p role="status" className="nf-panel nf-panel--card p-card nf-body text-[var(--nf-content-primary)]" data-testid="unsafe-done">
              {note.text}
            </p>
          ) : (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={() => file(true)}
                className="nf-btn nf-btn--secondary w-full min-h-[44px]"
                data-testid="unsafe-leave"
              >
                {pending ? copy.working : copy.leave}
              </button>
              <p className="nf-caption text-[var(--nf-content-muted)]">{copy.leaveHint}</p>

              <button
                type="button"
                disabled={pending}
                onClick={() => file(false)}
                className="nf-btn nf-btn--secondary w-full min-h-[44px]"
                data-testid="unsafe-tell"
              >
                {pending ? copy.working : copy.tell}
              </button>
              <p className="nf-caption text-[var(--nf-content-muted)]">{copy.tellHint.replace("{clock}", clock)}</p>
            </>
          )}

          {note && !note.ok && (
            <p role="alert" className="nf-body-sm text-[var(--nf-state-error)]">
              {note.text}
            </p>
          )}
        </div>
      </Sheet>
    </>
  );
}
