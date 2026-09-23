"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { UiIcon } from "@/design-system/icons/UiIcon";

export type LocationChipCopy = {
  /** The accessible name of the control: which place the feed is read from. */
  label: string;
  allPlaces: string;
  changePlace: string;
  pickPlaces: string;
  signIn: string;
};

/**
 * The location chip at the head of the feed.
 *
 * The governing image opens on a glass field: a pin, "Lekki, Lagos", a chevron.
 * The words are the person's own place from their profile (local government,
 * state), never a guess, and signed out or unset the field says the honest
 * thing, that the feed is reading everywhere.
 *
 * The chevron opens the real choices. The places this person has joined are
 * the feed's own filter (`?place=`), exactly the read `/around/[slug]` makes;
 * "Change where you are" is the profile's place picker at `/settings/place`;
 * and the directory is where a new place is joined. Nothing here is a second
 * copy of any of those screens, it is the door to each.
 */
export function LocationChip({
  place,
  places,
  currentSlug,
  signedIn,
  copy,
}: {
  /** The profile's place, already worded, or the everywhere sentence. */
  place: string;
  places: { slug: string; name: string; city: string }[];
  currentSlug: string | null;
  signedIn: boolean;
  copy: LocationChipCopy;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>("a")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const current = places.find((entry) => entry.slug === currentSlug) ?? null;
  const shown = current ? `${current.name}, ${current.city}` : place;

  return (
    <div className="relative" data-testid="feed-location">
      <button
        ref={buttonRef}
        type="button"
        className="nf-feed-chip"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${copy.label}: ${shown}`}
        onClick={() => setOpen((value) => !value)}
      >
        <UiIcon name="location" size={20} className="nf-feed-chip__pin" />
        <span className="nf-feed-chip__label">{shown}</span>
        <UiIcon name="chevron-down" size={24} className="nf-feed-chip__chev" />
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Close"
            className="fixed inset-0 z-20 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div ref={menuRef} role="menu" className="nf-post__menu nf-feed-chip__menu">
            <Link
              role="menuitem"
              href="/around"
              className="nf-post__menu-item"
              aria-current={current ? undefined : "true"}
              onClick={() => setOpen(false)}
            >
              {copy.allPlaces}
            </Link>
            {places.map((entry) => (
              <Link
                key={entry.slug}
                role="menuitem"
                href={`/around?place=${entry.slug}`}
                className="nf-post__menu-item"
                aria-current={entry.slug === currentSlug ? "true" : undefined}
                onClick={() => setOpen(false)}
              >
                {entry.name}, {entry.city}
              </Link>
            ))}
            {signedIn ? (
              <Link
                role="menuitem"
                href="/settings/place"
                className="nf-post__menu-item"
                onClick={() => setOpen(false)}
              >
                {copy.changePlace}
              </Link>
            ) : null}
            <Link
              role="menuitem"
              href="/around/settings"
              className="nf-post__menu-item"
              onClick={() => setOpen(false)}
            >
              {copy.pickPlaces}
            </Link>
            {!signedIn ? (
              <Link
                role="menuitem"
                href="/sign-in"
                className="nf-post__menu-item"
                onClick={() => setOpen(false)}
              >
                {copy.signIn}
              </Link>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
