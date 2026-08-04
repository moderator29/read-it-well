"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import { PostGlyph } from "./feed/PostGlyph";

/**
 * What do you want to create today?
 *
 * A ring rather than a list, because the six things somebody can make here are
 * siblings and a vertical menu quietly ranks them. Arranged around a glowing
 * centre, they read as one decision with several answers.
 *
 * **The ring is a layout, not the interaction.** Each option is an ordinary
 * button in the document, in reading order, reachable by tab, and the circle is
 * a transform applied afterwards. A radial menu built out of absolute
 * positioning and mouse angles is a menu nobody using a keyboard or a screen
 * reader can operate, and this one has to work for everybody.
 *
 * Under `prefers-reduced-motion` the petals do not fly out: they are simply
 * there. The token durations already collapse, so nothing is left mid-flight.
 *
 * The centre glows in electric blue. The reference glows violet; the brand
 * carries no violet, and translating the hue is the whole instruction.
 */

export type CreateKind = "apartment" | "review" | "update" | "question" | "story";

type Option = {
  kind: CreateKind;
  label: string;
  note: string;
  icon: BrandIconName;
  /** A destination, or nothing when the option opens something in place. */
  href?: string;
};

/*
 * Five, not six.
 *
 * The board asks for Event as well. There is no events table, no host, no
 * cancellation, no attendee list and no moderation answer for a meetup between
 * strangers, and `docs/SOCIAL_DESIGN.md` section 9 defers meetups deliberately
 * as the highest-liability feature in the plan. A sixth petal that opened
 * nothing would be a dead end in the one menu whose entire job is to promise
 * that something will happen. It is raised in the handover rather than shipped
 * hollow.
 */
const OPTIONS: Option[] = [
  {
    kind: "apartment",
    label: "Apartment",
    note: "List a place",
    icon: "homes-sparkle",
    href: "/agent/list",
  },
  {
    kind: "story",
    label: "Story",
    note: "Picture and headline",
    icon: "camera",
    href: "/stories/new",
  },
  {
    kind: "update",
    label: "Update",
    note: "Happening now",
    icon: "chat",
  },
  {
    kind: "question",
    label: "Question",
    note: "Ask the area",
    icon: "chat-duo",
  },
  {
    kind: "review",
    label: "Review",
    note: "A stay you had",
    icon: "reviews",
    href: "/bookings",
  },
];

export function CreateRing({
  open,
  onClose,
  onCompose,
}: {
  open: boolean;
  onClose: () => void;
  /** Update and Question open the composer in place, on the kind chosen. */
  onCompose: (kind: "GIST" | "ASK") => void;
}) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!open) {
      setShown(false);
      return;
    }
    /* One frame later, so the petals have a state to travel from. */
    const raf = window.requestAnimationFrame(() => setShown(true));
    panelRef.current?.querySelector<HTMLElement>("button, a")?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  const choose = (option: Option) => {
    onClose();
    if (option.href) {
      router.push(option.href);
      return;
    }
    onCompose(option.kind === "question" ? "ASK" : "GIST");
  };

  return (
    <div
      className="nf-ring"
      role="dialog"
      aria-modal="true"
      aria-label="What do you want to create today?"
    >
      <button
        type="button"
        aria-label="Close"
        className="nf-ring__scrim"
        onClick={onClose}
      />

      <div ref={panelRef} className="nf-ring__panel">
        <p className="nf-ring__ask">What do you want to create today?</p>

        <div className={`nf-ring__wheel${shown ? " nf-ring__wheel--in" : ""}`}>
          <span className="nf-ring__core" aria-hidden="true" />

          {OPTIONS.map((option, index) => {
            /* Evenly spaced, starting at the top and going clockwise, so the
               first option in reading order is also the first one the eye
               lands on. */
            const angle = -90 + (360 / OPTIONS.length) * index;
            const style = {
              "--nf-ring-angle": `${angle}deg`,
              "--nf-ring-delay": `${index * 40}ms`,
            } as React.CSSProperties;

            const inner = (
              <>
                <span className="nf-ring__tile">
                  <BrandIcon name={option.icon} size={30} />
                </span>
                <span className="nf-ring__label">{option.label}</span>
                <span className="nf-ring__note">{option.note}</span>
              </>
            );

            return option.href ? (
              <Link
                key={option.kind}
                href={option.href}
                style={style}
                className="nf-ring__petal"
                onClick={onClose}
              >
                {inner}
              </Link>
            ) : (
              <button
                key={option.kind}
                type="button"
                style={style}
                className="nf-ring__petal"
                onClick={() => choose(option)}
              >
                {inner}
              </button>
            );
          })}
        </div>

        <button type="button" onClick={onClose} className="nf-ring__close" aria-label="Close">
          <PostGlyph name="close" size={22} />
        </button>
      </div>
    </div>
  );
}
