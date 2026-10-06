"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import type { Dictionary, Locale } from "@vallo/i18n/core";
import { UiIcon } from "@/design-system/icons/UiIcon";
import type { ListingFacts } from "@/lib/listings/filter";
import type { Anchor } from "@/lib/listings/commute";
import { shelfActiveCount, type ShelfQuery } from "@/components/app/search/shelf-query";
import { ICON } from "@/components/app/Screen";
import { useLazySheet } from "@/lib/ui/lazy-sheet";
import { PendingRing } from "@/components/ui/PendingRing";
import "@/app/css/catalogue.css";

/**
 * The filter sheet's TRIGGER: the sliders square on the shelf, with the count
 * of filters in force. The sheet itself (`FilterDrawerPanel`: the pool logic,
 * the controls, the live count on Apply) is its own chunk, fetched when the
 * pointer or focus reaches this button and drawn once it has arrived, so the
 * first load of /search carries none of it. See `lib/ui/lazy-sheet.ts` for why
 * the open, the animation and the focus round trip are unchanged.
 */
export type FilterDrawerProps = {
  query: ShelfQuery;
  facts: ListingFacts[];
  locale: Locale;
  copy: Dictionary["catalogue"]["filters"];
  /* The Track H vocabulary, scoped the same way `copy` is: this control now
     chooses between two different money columns and has to name the one in
     force. */
  costCopy: Dictionary["moveIn"];
  /** V-28: the compound's words, for its two filters. */
  compoundCopy: Dictionary["shape"]["compound"];
  /** The sort names, from the dictionary rather than `SORTS[].label`. */
  sortCopy: Dictionary["shape"]["sorts"];
  /** V-68: the service charge's words, for its two filters. */
  serviceCopy: Dictionary["shape"]["service"];
  /** V-65: on the Rent market the budget is the cash at the door. */
  cashCopy: Dictionary["shape"]["cash"];
  /** V-66: the unit shapes' words, for the shape chips. */
  unitCopy: Dictionary["shape"]["unit"];
  /** V-43: the anchors a renter can pick, and the words for the group. */
  anchors?: Anchor[];
  commuteCopy: Dictionary["shape"]["commute"];
  /** V-41: the "No flooding reported" switch's words. */
  noFloodLabel?: { label: string; hint: string };
  /** V-12: the sentence under the "Lowest fees on top of rent" order. */
  feesBasis?: string;
};

/* The body and its prefetch name the same module, so the bundler makes one
   chunk and the second `import()` is answered from the module cache. */
const loadPanel = () => import("./FilterDrawerPanel");
const FilterDrawerPanel = dynamic(() => import("./FilterDrawerPanel").then((m) => m.FilterDrawerPanel), {
  ssr: false,
});

export function FilterDrawer({
  openOnMount = false,
  ...props
}: FilterDrawerProps & { openOnMount?: boolean }) {
  const { query, copy } = props;
  const [open, setOpen] = useState(openOnMount);
  /* Once the body has been drawn it stays drawn while closed, so a draft the
     reader has not applied is still there when the sheet opens again. */
  const [wanted, setWanted] = useState(openOnMount);
  const close = useCallback(() => setOpen(false), []);
  const sheet = useLazySheet(loadPanel, { eager: openOnMount, onEagerFail: close });

  const activeCount = shelfActiveCount(query);
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
      <button
        type="button"
        data-testid="filters-open"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-busy={pending || undefined}
        aria-label={activeCount === 0 ? copy.title : `${copy.title}, ${activeCount}`}
        onClick={openSheet}
        {...sheet.warmProps}
        className="nf-shelf-square relative"
      >
        {pending ? (
          <PendingRing size={ICON.inline} data-testid="filters-pending" />
        ) : (
          <UiIcon name="sliders" size={ICON.inline} />
        )}
        {activeCount > 0 && (
          <span
            data-testid="filters-count"
            aria-hidden="true"
            className="nf-badge-overlap nf-numeric nf-caption top-[-0.4rem] right-[-0.4rem] min-w-5 justify-center px-2xs py-3xs"
          >
            {activeCount}
          </span>
        )}
      </button>
      {wanted && sheet.ready && <FilterDrawerPanel {...props} open={open} onClose={close} />}
    </>
  );
}
