"use client";

import { useCallback, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { REPORT_TARGET_NOUN, type ReportTarget } from "@/lib/reports/categories";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { useLazySheet } from "@/lib/ui/lazy-sheet";
import { IconPlate } from "@/components/ui/IconPlate";
import { PendingRing } from "@/components/ui/PendingRing";

/* The body and its prefetch name the same module, so the bundler makes one
   chunk and the second `import()` is answered from the module cache. */
const loadPanel = () => import("./ReportSheetPanel");
const ReportSheetPanel = dynamic(() => import("./ReportSheetPanel").then((m) => m.ReportSheetPanel), {
  ssr: false,
});

/**
 * Report this.
 *
 * The platform's `Sheet` at its near-full height, because a half sheet over a
 * listing photo is not the frame for telling us somebody asked you to send
 * money to a personal account. The sheet is a real dialog: Escape and Back
 * close it, it drags and flicks down to close, the body stops scrolling
 * behind it, and focus returns to the opener on the way out. It used to be a
 * hand-built full-page panel with none of the gestures.
 *
 * THE TRIGGER IS ALL THAT LOADS WITH THE PAGE. The sheet itself (the form,
 * the categories, the success sheet) is `ReportSheetPanel`, its own chunk,
 * fetched when the pointer or focus reaches the trigger and drawn once it has
 * arrived; `lib/ui/lazy-sheet.ts` says why the open, the animation and the
 * focus round trip are unchanged. The noun comes from the zod-free
 * `lib/reports/categories.ts`: the validator in `lib/reports/schema.ts` put
 * zod in the first load of every page with this link.
 *
 * Signed out is a designed state rather than a hidden control: the reason is
 * stated (a report has to belong to somebody) and the way in is offered.
 *
 * THE NOUN IS NOT BAKED IN ANY MORE. This sheet said "listing" in three
 * places, which was true while a listing was the only thing anybody could
 * report and became a lie the moment a conversation could be. The noun comes
 * from `REPORT_TARGET_NOUN`, so the heading, the opener and the way back all
 * name the same thing and cannot drift apart.
 *
 * `trigger` decides what opens it. "link" is the underlined line the listing
 * page draws under the fold. "row" is a full-width row for a sheet that is
 * already open, which is how a conversation offers it: the options sheet has
 * rows and a small underlined link inside one would read as a footnote rather
 * than as the safety control it is.
 */
export function ReportSheet({
  targetType,
  targetId,
  targetLabel,
  signedIn,
  trigger = "link",
  onOpen,
}: {
  targetType: ReportTarget;
  targetId: string;
  /** What is being reported, in the heading, e.g. the listing title. */
  targetLabel: string;
  signedIn: boolean;
  /** How the control is drawn. See the note above. */
  trigger?: "link" | "row";
  /** Called when the sheet opens, so a host sheet can stand aside. */
  onOpen?: () => void;
}) {
  const noun = REPORT_TARGET_NOUN[targetType];
  const [open, setOpen] = useState(false);
  /* Once the body has been drawn it stays drawn while closed: a filed report
     is still "we have it" when the sheet is opened again. */
  const [wanted, setWanted] = useState(false);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const sheet = useLazySheet(loadPanel);
  const pending = open && !sheet.ready;

  const close = useCallback(() => {
    setOpen(false);
    openerRef.current?.focus();
  }, []);

  function openSheet() {
    /* A second tap while the body is still on its way is the same request:
       the host is not told twice and nothing is fetched or opened again. */
    if (open) return;
    onOpen?.();
    setOpen(true);
    setWanted(true);
    /* A chunk that cannot load leaves the sheet shut and the link live. */
    void sheet.warm().then((ok) => {
      if (!ok) setOpen(false);
    });
  }

  return (
    <>
      {trigger === "row" ? (
        <button
          ref={openerRef}
          type="button"
          onClick={openSheet}
          {...sheet.warmProps}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-busy={pending || undefined}
          data-testid="report-opener"
          className="nf-share-row mt-md w-full text-left"
        >
          <IconPlate size="sm" className="shrink-0">
            <UiIcon name="shield-lock" size={20} />
          </IconPlate>
          <span className="min-w-0 flex-1">
            <span className="block nf-body font-semibold text-[var(--nf-content-primary)]">
              Report this {noun}
            </span>
            <span className="block nf-caption text-[var(--nf-content-muted)]">
              A person reads every report. Nobody is told who sent it.
            </span>
          </span>
          {pending ? (
            <PendingRing size={16} className="text-[var(--nf-content-muted)]" data-testid="report-pending" />
          ) : (
            <UiIcon name="chevron-right" size={16} className="shrink-0 text-[var(--nf-content-muted)]" />
          )}
        </button>
      ) : (
        <button
          ref={openerRef}
          type="button"
          onClick={openSheet}
          {...sheet.warmProps}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-busy={pending || undefined}
          data-testid="report-opener"
          className="nf-tap inline-flex items-center gap-2xs text-[length:var(--nf-text-caption)] font-semibold text-[var(--nf-content-muted)] underline underline-offset-4 transition-colors hover:text-[var(--nf-content-secondary)]"
        >
          {pending ? (
            <PendingRing size={16} data-testid="report-pending" />
          ) : (
            <UiIcon name="bell" size={16} className="shrink-0" />
          )}
          Report this {noun}
        </button>
      )}

      {wanted && sheet.ready && (
        <ReportSheetPanel
          targetType={targetType}
          targetId={targetId}
          targetLabel={targetLabel}
          signedIn={signedIn}
          open={open}
          onClose={close}
        />
      )}
    </>
  );
}
