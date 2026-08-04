"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { BackChevron } from "@/components/social/profile/BackChevron";

/**
 * The head of a district feed.
 *
 * The place name is the title and it is also the control: a chevron beside it
 * opens the other places somebody is in, because the question "am I looking at
 * the right district" is asked far more often than any other on this screen,
 * and answering it should not cost a trip back to a directory.
 *
 * The filter sits on the right and opens the chip row's own long form. On a
 * phone the chips are already there under the header, so the control is a
 * shortcut rather than the only way in: a filter that is the sole route to
 * filtering is a filter people never find.
 *
 * Only places the person is actually in are listed. Offering every open place
 * here would make this a directory wearing a header, and the directory already
 * exists at `/around`, which is where the last row goes.
 */
export function DistrictHeader({
  name,
  city,
  places,
  currentSlug,
  onFilter,
  filtersOn,
  trailing,
}: {
  name: string;
  city: string;
  places: { slug: string; name: string; city: string }[];
  currentSlug: string;
  onFilter: () => void;
  /** True when the chip row is on anything other than All. */
  filtersOn: boolean;
  /** Join, supplied by the page. It belongs in this row rather than floating
      above it, where it was the only thing on a line of its own. */
  trailing?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const others = places.filter((place) => place.slug !== currentSlug);

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>("a")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="nf-district__head">
      {/* The back control lives here rather than in a PageHeader above, because
          two headers on one screen is exactly the jam this page had: the place
          name was printed twice, once as a title and once as the switcher. */}
      <BackChevron fallback="/around" />

      <div className="relative min-w-0 flex-1">
        <button
          type="button"
          className="nf-district__place"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="min-w-0">
            <span className="nf-district__name">{name}</span>
            <span className="nf-district__city">{city}</span>
          </span>
          <UiIcon name="chevron-down" size={18} />
        </button>

        {open ? (
          <>
            <button
              type="button"
              aria-label="Close"
              className="fixed inset-0 z-20 cursor-default"
              onClick={() => setOpen(false)}
            />
            <div ref={menuRef} role="menu" className="nf-post__menu nf-district__menu">
              {others.length === 0 ? (
                <p className="nf-district__only">
                  This is the only place you are in so far.
                </p>
              ) : (
                others.map((place) => (
                  <Link
                    key={place.slug}
                    role="menuitem"
                    href={`/around/${place.slug}`}
                    className="nf-post__menu-item"
                    onClick={() => setOpen(false)}
                  >
                    {place.name}, {place.city}
                  </Link>
                ))
              )}
              <Link
                role="menuitem"
                href="/around"
                className="nf-post__menu-item"
                onClick={() => setOpen(false)}
              >
                All places
              </Link>
            </div>
          </>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onFilter}
        aria-pressed={filtersOn}
        className={`nf-district__filter${filtersOn ? " nf-district__filter--on" : ""}`}
        aria-label={filtersOn ? "Filtering. Show everything" : "Filter what you see"}
      >
        <UiIcon name="sliders" size={19} />
      </button>

      {trailing}
    </div>
  );
}

export type DistrictChip = "all" | "apartments" | "stories" | "reviews" | "updates";

const CHIPS: { key: DistrictChip; label: string }[] = [
  { key: "all", label: "All" },
  { key: "apartments", label: "Apartments" },
  { key: "stories", label: "Stories" },
  { key: "reviews", label: "Reviews" },
  { key: "updates", label: "Updates" },
];

/**
 * The chip row.
 *
 * Five kinds of thing, filtered in the browser over what the page already
 * holds, so moving between them costs nothing at all. A chip whose kind has
 * nothing in it is still shown and still selectable: hiding it would make the
 * row change shape as a place fills up, and an empty answer with a sentence is
 * more useful than a chip that was never there.
 */
export function DistrictChips({
  active,
  counts,
  onPick,
}: {
  active: DistrictChip;
  counts: Partial<Record<DistrictChip, number>>;
  onPick: (chip: DistrictChip) => void;
}) {
  return (
    <div className="nf-district__chips" role="tablist" aria-label="What to show">
      {CHIPS.map((chip) => (
        <button
          key={chip.key}
          type="button"
          role="tab"
          aria-selected={chip.key === active}
          className="nf-district__chip"
          onClick={() => onPick(chip.key)}
        >
          {chip.label}
          {counts[chip.key] ? (
            <span className="nf-numeric">{counts[chip.key]}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
