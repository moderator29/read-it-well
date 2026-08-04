"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PostGlyph } from "./feed/PostGlyph";
import { Composer } from "./feed/Composer";
import { CreateRing } from "./CreateRing";

/**
 * The dock, and the composer behind it.
 *
 * One control at the thumb's corner on a phone and at the same corner on a
 * desktop, where the rail already owns the other side. It opens the create
 * ring, which is where the six things somebody can make actually live.
 *
 * Two of those, Update and Question, are written here rather than on a page of
 * their own, because both are a paragraph into a place somebody is already in
 * and a page load to say one line is a page load too many. The ring hands back
 * which kind was chosen, so Question never lands on a form headed "Say
 * something".
 *
 * The place picker exists because the dock travels. On an area page the place
 * is already known and the picker collapses to a line naming it. Somewhere
 * else it is the first decision, because posting into the wrong place is the
 * mistake this whole product is built to avoid. Where somebody is in exactly
 * one place, there is no choice to make and the picker does not appear.
 *
 * A full page rather than a half sheet, which is the house rule and is also
 * right here: a task pushed into the bottom third of a phone ends up with the
 * keyboard on top of it.
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
  /* Which kind the ring asked for. The composer opens straight onto it, so
     "Question" never lands somebody on a form that says "Say something". */
  const [composeKind, setComposeKind] = useState<"GIST" | "ASK">("GIST");
  const buttonRef = useRef<HTMLButtonElement>(null);

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

  const chosen = areas.find((area) => area.id === areaId) ?? null;

  return (
    <>
      <div className="nf-fab">
        <button
          ref={buttonRef}
          type="button"
          className="nf-fab__button"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label="Create something"
          onClick={() => setOpen((value) => !value)}
        >
          <PostGlyph name={open ? "close" : "compose"} size={24} />
        </button>
      </div>

      <CreateRing
        open={open}
        onClose={() => {
          setOpen(false);
          buttonRef.current?.focus();
        }}
        onCompose={(kind) => {
          if (!signedIn) {
            router.push("/sign-in");
            return;
          }
          setComposeKind(kind);
          setAreaId(opening);
          setPicking(!opening);
          setComposing(true);
        }}
      />

      {composing ? (
        <div
          className="nf-social-sheet"
          role="dialog"
          aria-modal="true"
          aria-label={composeKind === "ASK" ? "Ask a question" : "Say something"}
        >
          <div className="nf-social-sheet__panel">
            <header className="mb-5 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="nf-h3 text-[1.15rem]">
                  {composeKind === "ASK" ? "Ask a question" : "Say something"}
                </h2>
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
                  You are not in any place yet, and what you write belongs to a
                  place. Join one and you can write in it straight away.
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
                  initialKind={composeKind}
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
