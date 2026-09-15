"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOverlay } from "@/lib/ui/use-overlay";
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
 * mistake this whole product is built to avoid.
 *
 * **Everyone is a destination, and it is the default one.** This used to end at
 * a wall: somebody in no place at all tapped the plus, was told "you are not in
 * any place yet, and what you write belongs to a place", and was sent to a
 * directory. That was never true of the database, where `posts.area_id` is
 * nullable and `posts_insert_self` allows a null area outright. It was a rule
 * this file invented, and it made joining a room the price of saying anything,
 * on the very first tap of the very first session. A post with no place is
 * addressed to the whole platform and appears in every feed that is not one
 * place's own, so the picker now opens with that as its first row and lands
 * there when nothing else is chosen.
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
  /* Opened from inside a place, that place is the destination. Anywhere else,
     the destination is everybody, which is a real answer rather than a prompt
     to go and join something. */
  const opening = currentAreaId;
  const [areaId, setAreaId] = useState<string | undefined>(opening);
  /* Never opens on the picker. The composer is what somebody tapped the plus
     for, and where it lands is written under the box and changeable in one tap
     from there. */
  const [picking, setPicking] = useState(false);
  /* Which kind the ring asked for. The composer opens straight onto it, so
     "Question" never lands somebody on a form that says "Say something". */
  const [composeKind, setComposeKind] = useState<"GIST" | "ASK">("GIST");
  const buttonRef = useRef<HTMLButtonElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);

  /* The composer opens from the ring, which opens from the fab, so this is
     three overlays deep at its worst and the counted lock is what keeps the
     page still the whole way down. Tab was never trapped here either, which
     on a half-written post means the keyboard leaves the draft behind. */
  const closeComposer = useCallback(() => setComposing(false), []);
  useOverlay({ open: composing, onClose: closeComposer, panelRef: composerRef });

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
          setPicking(false);
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
          <div ref={composerRef} className="nf-social-sheet__panel">
            <header className="mb-5 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="nf-h3 text-[1.15rem]">
                  {composeKind === "ASK" ? "Ask a question" : "Say something"}
                </h2>
                <p className="mt-1 text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
                  {picking
                    ? "Choose where this belongs"
                    : chosen
                      ? `Around ${chosen.name}, ${chosen.city}`
                      : "Everyone on Vallo"}
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

            {picking ? (
              <ul className="flex flex-col gap-2">
                {/* Everybody, first and always present. It is the destination
                    that needs no membership and no setup, so it is the one a
                    person can always get back to. */}
                <li>
                  <button
                    type="button"
                    className="nf-fab__place"
                    onClick={() => {
                      setAreaId(undefined);
                      setPicking(false);
                    }}
                    data-testid="post-to-everyone"
                  >
                    <span className="nf-fab__place-name">Everyone on Vallo</span>
                    <span className="nf-fab__place-city">Seen in every feed</span>
                  </button>
                </li>
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
                {areas.length === 0 ? (
                  /* An offer rather than a wall. Somebody in no place can post
                     right now, and joining one is a thing they may also want to
                     do, in that order. */
                  <li>
                    <Link
                      href="/around/settings"
                      className="nf-fab__place"
                      onClick={() => setComposing(false)}
                    >
                      <span className="nf-fab__place-name">Find a place to join</span>
                      <span className="nf-fab__place-city">
                        Then you can post there too
                      </span>
                    </Link>
                  </li>
                ) : null}
              </ul>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setPicking(true)}
                  className="mb-3 text-[0.8125rem] font-semibold text-[var(--nf-brand-secondary)]"
                >
                  {chosen ? "Post somewhere else" : "Post in a place instead"}
                </button>

                <Composer
                  areaId={chosen?.id}
                  areaName={chosen?.name}
                  signedIn={signedIn}
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
