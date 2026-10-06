"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import type { Dictionary, Locale } from "@vallo/i18n/core";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { activeFilterCount, type StaysQuery } from "@/lib/stays/query";
import { ICON } from "@/components/app/Screen";
import { useLazySheet } from "@/lib/ui/lazy-sheet";
import { PendingRing } from "@/components/ui/PendingRing";

/**
 * The stays filter sheet's TRIGGER: the sliders square with the count of
 * filters in force. The sheet itself (`StayFilterSheetPanel`) is its own
 * chunk, fetched when the pointer or focus reaches this button and drawn once
 * it has arrived, so the first load of /stays/search carries none of it. See
 * `lib/ui/lazy-sheet.ts` for why the open, the animation and the focus round
 * trip are unchanged.
 *
 * `activeFilterCount` comes from `lib/stays/query`, the zod-free half of the
 * stays contract; `lib/stays/filters` (the parser) put zod in this page.
 */
export type StayFilterSheetProps = {
  query: StaysQuery;
  locale: Locale;
  t: Dictionary;
  basePath?: string;
  /** Parameters outside the twelve (the category tile's `type`) to carry. */
  extra?: Record<string, string | undefined>;
  today: string;
};

/* The body and its prefetch name the same module, so the bundler makes one
   chunk and the second `import()` is answered from the module cache. */
const loadPanel = () => import("./StayFilterSheetPanel");
const StayFilterSheetPanel = dynamic(
  () => import("./StayFilterSheetPanel").then((m) => m.StayFilterSheetPanel),
  { ssr: false },
);

export function StayFilterSheet({
  openOnMount = false,
  ...props
}: StayFilterSheetProps & { openOnMount?: boolean }) {
  const copy = props.t.catalogue;
  const [open, setOpen] = useState(openOnMount);
  /* Once the body has been drawn it stays drawn while closed, so a draft the
     reader has not applied is still there when the sheet opens again. */
  const [wanted, setWanted] = useState(openOnMount);
  const close = useCallback(() => setOpen(false), []);
  const sheet = useLazySheet(loadPanel, { eager: openOnMount, onEagerFail: close });

  const activeCount = activeFilterCount(props.query);
  const pending = open && !sheet.ready;

  function openSheet() {
    /* A second tap while the body is still on its way changes nothing. */
    if (open) return;
    setOpen(true);
    setWanted(true);
    /* A chunk that cannot load leaves the sheet shut and the button live. */
    void sheet.warm().then((ok) => {
      if (!ok) setOpen(false);
    });
  }

  return (
    <>
      <button type="button" data-testid="stay-filters-open" aria-expanded={open} aria-haspopup="dialog"
        aria-busy={pending || undefined}
        aria-label={activeCount === 0 ? copy.filters.title : `${copy.filters.title}, ${activeCount}`}
        onClick={openSheet} {...sheet.warmProps} className="nf-shelf-square relative">
        {pending ? (
          <PendingRing size={ICON.inline} data-testid="stay-filters-pending" />
        ) : (
          <UiIcon name="sliders" size={ICON.inline} />
        )}
        {activeCount > 0 && (
          <span aria-hidden="true" className="nf-badge-overlap nf-numeric nf-caption top-[-0.4rem] right-[-0.4rem] min-w-5 justify-center px-2xs py-3xs">
            {activeCount}
          </span>
        )}
      </button>
      {wanted && sheet.ready && <StayFilterSheetPanel {...props} open={open} onClose={close} />}
    </>
  );
}
