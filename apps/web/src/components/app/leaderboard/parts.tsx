"use client";

import Link from "next/link";
import { animate } from "framer-motion";
import { useLayoutEffect, useRef, type CSSProperties, type ReactNode, type RefObject } from "react";
import { RemoteImage } from "@/components/ui/RemoteImage";
import { EASE_LAND } from "@/components/ui/ported-motion";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { KIND_LABEL, SCOPE_LABEL, movementWords, unitFor } from "@/lib/leaderboard/copy";
import {
  confettiPieces,
  hrefFor,
  monogram,
  movement,
  rowKey,
  tierFor,
  type Board,
  type LeaderRow,
  type Period,
  type Scope,
} from "@/lib/leaderboard/model";

/*
 * THE LEADERBOARD'S PARTS (D76).
 *
 * The entrance is CSS (leaderboard.css): the beams sweep once, the plinths
 * rise 2, 3, 1 sixty milliseconds apart, the portraits drop onto them, the
 * confetti falls for first only, the You pill rises last. The re-rank when
 * City and Global flip is a FLIP driven by framer-motion's `animate()` on
 * the rows themselves (D39, D49.1: hooks and animate(), no motion
 * components), so each row travels from its old place to its new one.
 * Everything settles at once under reduced motion, Calm, Off and save-data:
 * the CSS is gated on the root's motion attributes and `quiet` skips the FLIP.
 */

/** What an empty plinth says; first carries the board's own invitation. */
const EMPTY_PLACE: Partial<Record<1 | 2 | 3, string>> = { 2: "Open", 3: "Open" };

/** Delay of the rise, by place: 2 first, then 3, then 1 (60ms apart, MOTION_SYSTEM 3). */
export const RISE_DELAY_MS: Record<1 | 2 | 3, number> = { 2: 0, 3: 60, 1: 120 };

function delay(ms: number): CSSProperties {
  return { "--lb-delay": `${ms}ms` } as CSSProperties;
}

function Opens({ href, className, children, label }: { href: string | null; className: string; children: ReactNode; label: string }) {
  if (!href) return <div className={className}>{children}</div>;
  return (
    <Link href={href} className={className} aria-label={label}>
      {children}
    </Link>
  );
}

export function Face({ row, size, className }: { row: Pick<LeaderRow, "name" | "avatarUrl">; size: number; className: string }) {
  return (
    <span className={className} aria-hidden="true">
      {row.avatarUrl ? <RemoteImage src={row.avatarUrl} alt="" width={size} height={size} sizes={`${size}px`} /> : monogram(row.name)}
    </span>
  );
}

export function Beams() {
  return (
    <div className="nf-lb__beams" aria-hidden="true">
      <div className="nf-lb__beam-wrap" data-beam="l">
        <div className="nf-lb__beam" />
      </div>
      <div className="nf-lb__beam-wrap" data-beam="c">
        <div className="nf-lb__beam" />
      </div>
      <div className="nf-lb__beam-wrap" data-beam="r">
        <div className="nf-lb__beam" />
      </div>
    </div>
  );
}

function Confetti() {
  return (
    <div className="nf-lb__confetti" aria-hidden="true">
      {confettiPieces(28).map((b, i) => (
        <span
          key={i}
          className="nf-lb__bit"
          data-tone={b.tone}
          style={
            {
              left: `${b.x}%`,
              "--lb-drift": `${b.drift}px`,
              "--lb-turn": `${b.turn}deg`,
              "--lb-delay": `${b.delay}ms`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

export function Podium({
  rows,
  board,
  emptyLabel,
}: {
  rows: [LeaderRow | null, LeaderRow | null, LeaderRow | null];
  board: Board;
  emptyLabel: string;
}) {
  const places = [2, 1, 3] as const;
  return (
    <div className="nf-lb__podium" data-testid="lb-podium">
      {rows[1] ? <Confetti /> : null}
      {places.map((place, i) => {
        const row = rows[i] ?? null;
        const ms = RISE_DELAY_MS[place];
        return (
          <div key={place} className="nf-lb__place" data-place={place} data-empty={row ? undefined : ""} style={delay(ms)}>
            {row ? (
              /* Keyed by who stands here, so a new person drops in when the board re-ranks. */
              <div key={rowKey(row)} className="nf-lb__drop">
                <Opens href={hrefFor(row)} className="nf-lb__who" label={`${place}. ${row.name}, ${row.score} ${unitFor(board, row.score)}`}>
                  <span className="nf-lb__frame">
                    {place === 1 ? <span className="nf-lb__glow" aria-hidden="true" /> : null}
                    {place === 1 ? (
                      <span className="nf-lb__crown" aria-hidden="true">
                        <UiIcon name="star" size={16} filled />
                      </span>
                    ) : null}
                    <Face row={row} size={place === 1 ? 88 : 72} className="nf-lb__portrait" />
                  </span>
                  <span className="nf-lb__name">{row.name}</span>
                  <span className="nf-lb__figure">
                    {row.score.toLocaleString("en-NG")}
                    <span className="nf-lb__unit">{unitFor(board, row.score)}</span>
                  </span>
                </Opens>
              </div>
            ) : (
              <div className="nf-lb__drop nf-lb__who">
                <span className="nf-lb__portrait" aria-hidden="true">
                  <UiIcon name="plus" size={20} />
                </span>
                <span className="nf-lb__name">{EMPTY_PLACE[place] ?? emptyLabel}</span>
              </div>
            )}
            <div className="nf-lb__plinth">
              <span className="nf-lb__numeral" aria-hidden="true">
                {place}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** The City / Global pill: a platinum thumb that slides, and a glyph that flips. */
export function ScopeToggle({ scope, onChange, placeName }: { scope: Scope; onChange(next: Scope): void; placeName: string }) {
  const options: { value: Scope; label: string; icon: "building-apartment" | "globe" }[] = [
    { value: "city", label: placeName.length <= 12 ? placeName : SCOPE_LABEL.city, icon: "building-apartment" },
    { value: "global", label: SCOPE_LABEL.global, icon: "globe" },
  ];
  return (
    <div className="nf-lb__scope">
      <div className="nf-lb__toggle" role="radiogroup" aria-label="City or Global" data-scope={scope}>
        <span className="nf-lb__thumb" aria-hidden="true" />
        {options.map((o) => {
          const on = o.value === scope;
          return (
            <button key={o.value} type="button" role="radio" aria-checked={on} onClick={() => onChange(o.value)} data-testid={`lb-scope-${o.value}`}>
              {/* Keyed by state, so the glyph turns over each time the pill flips. */}
              <span key={`${o.value}-${on}`} className="nf-lb__glyph" aria-hidden="true">
                <UiIcon name={o.icon} size={16} />
              </span>
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function MovementMark({ row, period }: { row: LeaderRow; period: Period }) {
  const m = movement(row);
  const words = movementWords(m, period);
  return (
    <span className="nf-lb__move" data-dir={m.direction} title={words}>
      <span className="sr-only">{words}</span>
      {m.direction === "new" ? (
        <span aria-hidden="true">New</span>
      ) : m.direction === "same" ? (
        <UiIcon name="minus" size={12} />
      ) : (
        <>
          <UiIcon name={m.direction === "up" ? "arrow-up" : "arrow-down"} size={12} />
          <span aria-hidden="true">{m.by}</span>
        </>
      )}
    </span>
  );
}

/**
 * FLIP: after each render, every keyed child that moved is drawn back at its
 * old offset and animated to its new one. Offsets are read relative to the
 * list, so scrolling between renders does not count as movement.
 */
export function useFlip(listRef: RefObject<HTMLElement | null>, deps: unknown, quiet: boolean) {
  const last = useRef(new Map<string, number>());
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const next = new Map<string, number>();
    const items = Array.from(list.querySelectorAll<HTMLElement>("[data-flip]"));
    for (const el of items) {
      const key = el.dataset.flip!;
      const top = el.offsetTop;
      next.set(key, top);
      const before = last.current.get(key);
      if (!quiet && before !== undefined && before !== top) {
        animate(el, { transform: [`translateY(${before - top}px)`, "translateY(0px)"] }, { duration: 0.56, ease: EASE_LAND });
      }
    }
    last.current = next;
  }, [listRef, deps, quiet]);
}

export function RankRows({
  rows,
  board,
  period,
  quiet,
  onShareMine,
}: {
  rows: LeaderRow[];
  board: Board;
  period: Period;
  quiet: boolean;
  onShareMine(): void;
}) {
  const listRef = useRef<HTMLOListElement | null>(null);
  useFlip(listRef, rows, quiet);
  return (
    <ol className="nf-lb__rows" data-testid="lb-rows" ref={listRef}>
      {rows.map((row, i) => {
        const tier = tierFor(board, row.score);
        const href = hrefFor(row);
        /* "Member" says nothing on a board of members; a business or a role says what it is. */
        const sub = [row.kind === "member" ? null : KIND_LABEL[row.kind], row.placeName].filter(Boolean).join(", ");
        const body = (
          <>
            <span className="nf-lb__hex" aria-label={`Rank ${row.rank}`}>
              <span>{row.rank}</span>
            </span>
            <Face row={row} size={40} className="nf-lb__avatar" />
            <span className="nf-lb__row-main">
              <span className="nf-lb__row-name">
                <span className="nf-lb__row-name-text">{row.name}</span>
                {row.isMe ? <span className="nf-lb__unit">(you)</span> : null}
              </span>
              <span className="nf-lb__row-sub">
                {tier ? (
                  <span className="nf-lb__tier" data-tier={tier}>
                    {tier}
                  </span>
                ) : null}
                {tier && sub ? " · " : ""}
                {sub}
              </span>
            </span>
            <span className="nf-lb__row-end">
              <span className="nf-lb__figure">
                {row.score.toLocaleString("en-NG")}
                <span className="nf-lb__unit">{unitFor(board, row.score)}</span>
              </span>
              <MovementMark row={row} period={period} />
            </span>
          </>
        );
        return (
          <li key={rowKey(row)} data-flip={rowKey(row)} className="nf-lb__li" style={delay(Math.min(i, 5) * 60)} id={row.isMe ? "lb-me" : undefined}>
            {row.isMe ? (
              <button type="button" className="nf-lb__row" data-me="" data-testid="lb-me-row" onClick={onShareMine} aria-label={`${row.name}, rank ${row.rank}. Share your rank`}>
                {body}
              </button>
            ) : href ? (
              <Link href={href} className="nf-lb__row">
                {body}
              </Link>
            ) : (
              <div className="nf-lb__row">{body}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
