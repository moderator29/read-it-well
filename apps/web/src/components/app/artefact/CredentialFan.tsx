"use client";

import "./artefact.css";
import { useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { feedback } from "@/lib/ui/feedback";
import { Credential, type CredentialFace } from "./Credential";
import { fanPose } from "./fan-pose";

/**
 * THE FAN, AND THE FAN IS THE SELECTOR (north star 14.4, reference 38 and
 * 7053, MOTION_SYSTEM "Pro and premium areas").
 *
 * The credentials overlap with the chosen one forward and the others receding
 * in scale and opacity to either side. Tapping one, swiping the stack, or the
 * arrow keys brings one forward on the spring at 380ms (`--nf-ease-spring`,
 * `--nf-duration-slow`). There is no separate list: the stack IS the control,
 * which is why it is a radio group with each credential a radio (roving
 * focus, arrows move, Home and End jump), and why the chosen one's
 * explanation is announced politely beneath it.
 *
 * Where it is used, and where it is not (14.4): wherever there is a real
 * tier to hold or choose. A fan of one is decoration, so a single item
 * renders flat with no selector at all.
 *
 * MOTION is a known track (pose to pose), so CSS transitions on transform and
 * opacity, not framer-motion (D39.3). The swipe is read from pointer events:
 * past 40px it steps one; short of that, a tap on a receding credential
 * brings it forward. Quiet readers (reduced motion, Calm, Off) see the new
 * pose at once (artefact.css). One light "select" haptic per change, the
 * chip and tab weight; a payoff pop is not this component's to give.
 */
export type FanItem = CredentialFace & { id: string };

export function CredentialFan({
  items,
  initialId,
  label,
  positionLabel,
  onChange,
  detail,
  className,
}: {
  items: readonly FanItem[];
  /** The credential forward on arrival: the member's own tier, usually. */
  initialId?: string;
  /** The group's accessible name: "Your verification tiers". */
  label: string;
  /** "{n} of {total}", for each credential's accessible description. */
  positionLabel: string;
  onChange?: (id: string) => void;
  /** What the chosen credential means, drawn beneath the fan and announced. */
  detail?: (item: FanItem) => ReactNode;
  className?: string;
}) {
  const start = Math.max(
    0,
    items.findIndex((item) => item.id === initialId),
  );
  const [at, setAt] = useState(start);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const swipe = useRef<{ x0: number; id: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const chosen = items[at] ?? items[0];

  const choose = (index: number, focus = false) => {
    const to = Math.max(0, Math.min(items.length - 1, index));
    if (focus) refs.current[to]?.focus();
    if (to === at) return;
    setAt(to);
    feedback("select");
    const item = items[to];
    if (item) onChange?.(item.id);
  };

  if (!chosen) return null;

  /* One credential is not a choice: draw it flat, no selector. */
  if (items.length === 1) {
    return (
      <div className={["nf-fan nf-fan--single", className ?? ""].filter(Boolean).join(" ")}>
        <div className="nf-fan__stage">
          <Credential face={chosen} className="nf-fan__card" />
        </div>
        {detail ? <div className="nf-fan__detail">{detail(chosen)}</div> : null}
      </div>
    );
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const keys: Record<string, number> = {
      ArrowRight: at + 1,
      ArrowDown: at + 1,
      ArrowLeft: at - 1,
      ArrowUp: at - 1,
      Home: 0,
      End: items.length - 1,
    };
    const to = keys[e.key];
    if (to === undefined) return;
    e.preventDefault();
    choose(to, true);
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    swipe.current = { x0: e.clientX, id: e.pointerId, moved: false };
  };
  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.x0;
    if (Math.abs(dx) < 40) return;
    suppressClick.current = true;
    choose(dx < 0 ? at + 1 : at - 1);
  };

  return (
    <div className={["nf-fan", className ?? ""].filter(Boolean).join(" ")}>
      <div
        className="nf-fan__stage"
        role="radiogroup"
        aria-label={label}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          swipe.current = null;
        }}
      >
        {items.map((item, index) => {
          const pose = fanPose(index - at);
          return (
            <button
              key={item.id}
              ref={(el) => {
                refs.current[index] = el;
              }}
              type="button"
              role="radio"
              aria-checked={index === at}
              aria-label={`${item.title}, ${positionLabel
                .replace("{n}", String(index + 1))
                .replace("{total}", String(items.length))}`}
              tabIndex={index === at ? 0 : -1}
              className="nf-fan__slot"
              data-forward={index === at ? "" : undefined}
              style={
                {
                  "--nf-fan-x": `${pose.x}%`,
                  "--nf-fan-y": `${pose.y}%`,
                  "--nf-fan-scale": pose.scale,
                  "--nf-fan-turn": `${pose.turn}deg`,
                  "--nf-fan-dim": pose.opacity,
                  zIndex: pose.z,
                } as CSSProperties
              }
              onClick={() => {
                if (suppressClick.current) {
                  suppressClick.current = false;
                  return;
                }
                choose(index);
              }}
            >
              <Credential face={item} className="nf-fan__card" aria-hidden />
            </button>
          );
        })}
      </div>
      {detail ? (
        <div className="nf-fan__detail" aria-live="polite">
          {detail(chosen)}
        </div>
      ) : null}
    </div>
  );
}
