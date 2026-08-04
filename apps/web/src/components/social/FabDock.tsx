"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { PostGlyph } from "./feed/PostGlyph";
import { Composer } from "./feed/Composer";

/**
 * The dock, and the sheet behind it.
 *
 * The button is a single control at the thumb's corner on a phone and at the
 * same corner on a desktop, where the rail already owns the other side. It
 * opens two choices and no more: **Drop gist**, which is writing, and **Ask
 * RentMe AI**, which is the assistant this platform already has. Neither is a
 * new destination invented for a menu.
 *
 * Drop gist opens a full page rather than a half sheet, which is the house rule
 * and is also right here: choosing a place and writing into it is a task, not a
 * confirmation, and a task pushed into the bottom third of a phone screen ends
 * up with the keyboard on top of it.
 *
 * The place picker exists because the dock travels. On an area page the place
 * is already known and the picker collapses to a line naming it, with a way to
 * change it. Somewhere else, it is the first decision, because posting into the
 * wrong place is the mistake this whole product is built to avoid.
 */

export type FabArea = { id: string; name: string; city: string };

export function FabDock({
  signedIn,
  areas,
  currentAreaId,
}: {
  signedIn: boolean;
  areas: FabArea[];
  currentAreaId?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [composing, setComposing] = useState(false);
  /* The only place somebody is in is not a choice, so it is not offered as one.
     A picker with one row in it is a screen that exists to be dismissed. */
  const only = areas.length === 1 ? areas[0]?.id : undefined;
  const opening = currentAreaId ?? only;
  const [areaId, setAreaId] = useState<string | undefined>(opening);
  const [picking, setPicking] = useState(!opening);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!composing) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setComposing(false);
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [composing]);

  const startWriting = () => {
    setOpen(false);
    if (!signedIn) {
      router.push("/sign-in");
      return;
    }
    setAreaId(opening);
    setPicking(!opening);
    setComposing(true);
  };

  const chosen = areas.find((area) => area.id === areaId) ?? null;

  return (
    <>
      <div className="nf-fab">
        {open ? (
          <>
            <button
              type="button"
              aria-label="Close menu"
              className="fixed inset-0 z-[-1] cursor-default"
              onClick={() => setOpen(false)}
            />
            <div ref={menuRef} role="menu" aria-label="Write or ask" className="nf-fab__menu">
              <button
                type="button"
                role="menuitem"
                className="nf-fab__item"
                onClick={startWriting}
              >
                <BrandIcon name="chat" size={30} />
                <span>
                  <span className="nf-fab__item-title">Drop gist</span>
                  <span className="nf-fab__item-note">
                    Say something around a place you are in
                  </span>
                </span>
              </button>

              <Link
                role="menuitem"
                href="/assistant"
                className="nf-fab__item"
                onClick={() => setOpen(false)}
              >
                <BrandIcon name="bot" size={30} />
                <span>
                  <span className="nf-fab__item-title">Ask RentMe AI</span>
                  <span className="nf-fab__item-note">
                    Stays, places and how any of this works
                  </span>
                </span>
              </Link>
            </div>
          </>
        ) : null}

        <button
          ref={buttonRef}
          type="button"
          className="nf-fab__button"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={open ? "Close the write menu" : "Write something, or ask RentMe AI"}
          onClick={() => setOpen((value) => !value)}
        >
          <PostGlyph name={open ? "close" : "compose"} size={24} />
        </button>
      </div>

      {composing ? (
        <div
          className="nf-social-sheet"
          role="dialog"
          aria-modal="true"
          aria-label="Drop gist"
        >
          <div className="nf-social-sheet__panel">
            <header className="mb-5 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="nf-h3 text-[1.15rem]">Drop gist</h2>
                <p className="mt-1 text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
                  {chosen && !picking
                    ? `Around ${chosen.name}, ${chosen.city}`
                    : "Choose where this belongs"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setComposing(false)}
                aria-label="Close"
                className="nf-post__act shrink-0"
              >
                <PostGlyph name="close" size={20} />
              </button>
            </header>

            {areas.length === 0 ? (
              /* Not an error and not a spinner: a real answer with the one
                 thing that fixes it. Posting needs a place, and being in a
                 place is a deliberate act. */
              <>
                <p className="text-[0.9375rem] leading-relaxed text-[var(--nf-content-secondary)]">
                  You are not in any place yet, and a gist belongs to a place.
                  Join one and you can write in it straight away.
                </p>
                <Link
                  href="/around"
                  className="nf-btn nf-btn--primary mt-5 w-full"
                  onClick={() => setComposing(false)}
                >
                  Find a place
                </Link>
              </>
            ) : picking || !chosen ? (
              <ul className="flex flex-col gap-2">
                {areas.map((area) => (
                  <li key={area.id}>
                    <button
                      type="button"
                      className="nf-fab__place"
                      onClick={() => {
                        setAreaId(area.id);
                        setPicking(false);
                      }}
                    >
                      <span className="nf-fab__place-name">Around {area.name}</span>
                      <span className="nf-fab__place-city">{area.city}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <>
                {areas.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => setPicking(true)}
                    className="mb-3 text-[0.8125rem] font-semibold text-[var(--nf-brand-secondary)]"
                  >
                    Post somewhere else
                  </button>
                ) : null}

                <Composer
                  areaId={chosen.id}
                  areaName={chosen.name}
                  signedIn={signedIn}
                  isMember
                  autoFocus
                  onDone={() => {
                    setComposing(false);
                    router.refresh();
                  }}
                />
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
