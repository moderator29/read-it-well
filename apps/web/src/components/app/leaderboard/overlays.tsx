"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { UiIcon } from "@/design-system/icons/UiIcon";
import {
  BOARD_LABEL,
  CLIMB_STEPS,
  EXPLAINER_DONE,
  EXPLAINER_TITLE,
  SHARE_ACTION,
  SHARE_COPIED,
  SHARE_TITLE,
  earnedBody,
  earnedTitle,
  shareText,
  unitFor,
} from "@/lib/leaderboard/copy";
import { TIER_THRESHOLDS, nextTier, toNextRank, type Board, type LeaderRow, type Period } from "@/lib/leaderboard/model";
import { feedback } from "@/lib/ui/feedback";
import { shareOrCopy } from "@/lib/ui/clipboard";

/*
 * THE THREE MOMENTS AROUND THE BOARD (D76):
 *   ClimbExplainer  the Plasma explainer (ONE-PRODUCT-DECISIONS rec. 3): a
 *                   device frame with a real fragment breaking out (your own
 *                   count and what the next rank needs), three steps, the
 *                   tier ladder from the real thresholds, one capsule
 *   ShareRank       the share card for your own rank, on platinum (one
 *                   platinum object on the sheet)
 *   EarnedMoment    entering the top three: the medal with rays
 *                   (streak-earned-badge.jpg), gold, the one payoff that may
 *                   pop (MOTION_SYSTEM principle 5)
 */

const BOARD_OBJECT: Record<Board, string> = {
  referrals: "/brand/glass/people-ring.png",
  property: "/brand/glass/keys-handover.png",
  hotels: "/brand/glass/hotel-star.png",
  restaurants: "/brand/glass/concierge-bell.png",
};

export function boardObject(board: Board): string {
  return BOARD_OBJECT[board];
}

export function ClimbExplainer({
  open,
  onOpenChange,
  board,
  me,
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
  board: Board;
  me: LeaderRow | null;
}) {
  const steps = CLIMB_STEPS[board];
  const next = me ? toNextRank(me) : null;
  const tier = me ? nextTier(board, me.score) : null;
  const t = TIER_THRESHOLDS[board];
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={EXPLAINER_TITLE} testId="lb-explainer">
      <div className="nf-lb-device" aria-hidden="true">
        <div className="nf-lb-device__podium">
          <span data-place="2">2</span>
          <span data-place="1">1</span>
          <span data-place="3">3</span>
        </div>
        <div className="nf-lb-device__card">
          <div>
            <div className="nf-lb-device__label">Your count</div>
            <div className="nf-lb-device__value">{me ? me.score : 0}</div>
          </div>
          <span className="nf-lb-device__rule" />
          <div>
            <div className="nf-lb-device__label">{me ? "Your rank" : "Rank"}</div>
            <div className="nf-lb-device__value">{me ? `#${me.rank}` : "None yet"}</div>
          </div>
        </div>
      </div>
      {me && (next !== null || tier) ? (
        <p className="nf-lb-progress" data-testid="lb-progress">
          {next !== null
            ? `${next} more ${unitFor(board, next)} to move up`
            : `${tier!.needed} more to ${tier!.word}`}
          <UiIcon name="chevron-right" size={12} />
        </p>
      ) : null}
      <ol className="nf-lb-steps nf-lb-steps-wrap">
        {steps.map((s, i) => (
          <li key={s.title}>
            <span className="nf-lb-steps__n">{i + 1}</span>
            <div>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="nf-lb-ladder" aria-label="Tier words and what each needs">
        <span>Rising {t[0]}+</span>
        <span>Trusted {t[1]}+</span>
        <span>Platinum {t[2]}+</span>
        <span>Gold {t[3]}+</span>
      </div>
      <div className="nf-lb-explainer-actions">
        <Button variant="primary" shape="pill" full className="nf-lb__capsule" onClick={() => onOpenChange(false)}>
          {EXPLAINER_DONE}
        </Button>
      </div>
    </Sheet>
  );
}

export function ShareRank({
  open,
  onOpenChange,
  me,
  board,
  place,
  period,
  periodLabel,
  url,
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
  me: LeaderRow | null;
  board: Board;
  place: string;
  period: Period;
  periodLabel: string;
  url: string;
}) {
  const [said, setSaid] = useState<string | null>(null);
  if (!me) return null;
  const share = async () => {
    const outcome = await shareOrCopy({ url, title: "Vallo leaderboard", text: shareText(me.rank, board, place, period) });
    if (outcome === "copied") setSaid(SHARE_COPIED);
  };
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={SHARE_TITLE} testId="lb-share">
      <div className="nf-lb-share" data-testid="lb-share-card">
        <div className="nf-lb-share__label">
          {BOARD_LABEL[board]}, {place}, {periodLabel}
        </div>
        <div className="nf-lb-share__rank">
          <small>#</small>
          {me.rank}
        </div>
        <div className="nf-lb-share__line">{me.name}</div>
        <div className="nf-lb-share__label">
          {me.score.toLocaleString("en-NG")} {unitFor(board, me.score)} on Vallo
        </div>
      </div>
      <div className="nf-lb-share-actions">
        <Button variant="primary" shape="pill" full onClick={share}>
          <UiIcon name="share" size={16} /> {SHARE_ACTION}
        </Button>
        {said ? (
          <p role="status" className="nf-caption">
            {said}
          </p>
        ) : null}
      </div>
    </Sheet>
  );
}

/** A five-sided medal with a ribbon, the rank on its face. */
function Medal({ rank }: { rank: number }) {
  return (
    <svg viewBox="0 0 120 140" role="img" aria-label={`Medal, number ${rank}`}>
      <defs>
        <linearGradient id="nf-lb-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" className="nf-lb-medal__stop-hi" />
          <stop offset="0.55" className="nf-lb-medal__stop-mid" />
          <stop offset="1" className="nf-lb-medal__stop-low" />
        </linearGradient>
      </defs>
      <path className="nf-lb-medal__ribbon-a" d="M44 92 L36 138 L50 128 L58 138 L60 96 Z" />
      <path className="nf-lb-medal__ribbon-b" d="M76 92 L84 138 L70 128 L62 138 L60 96 Z" />
      <path className="nf-lb-medal__face" d="M60 6 L112 44 L92 104 L28 104 L8 44 Z" />
      <path className="nf-lb-medal__inner" d="M60 22 L96 48 L82 92 L38 92 L24 48 Z" />
      <text className="nf-lb-medal__numeral" x="60" y="76" textAnchor="middle">
        {rank}
      </text>
    </svg>
  );
}

export function EarnedMoment({
  open,
  onClose,
  onShare,
  me,
  board,
  place,
}: {
  open: boolean;
  onClose(): void;
  onShare(): void;
  me: LeaderRow | null;
  board: Board;
  place: string;
}) {
  const layerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    /* One haptic on the payoff, only after the person has touched the page
       (a browser refuses vibration before that, and says so in the console). */
    const active = typeof navigator !== "undefined" && "userActivation" in navigator ? navigator.userActivation.hasBeenActive : true;
    if (active) feedback("success");
    layerRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open || !me) return null;
  return (
    <div
      ref={layerRef}
      tabIndex={-1}
      className="nf-lb-layer"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lb-earned-title"
      data-testid="lb-earned"
    >
      <div className="nf-lb-earned">
        <div className="nf-lb-medal">
          <div className="nf-lb-rays" aria-hidden="true" />
          <Medal rank={me.rank} />
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="nf-lb-spark" data-spark={i} aria-hidden="true">
              <UiIcon name="sparkle" size={16} />
            </span>
          ))}
        </div>
        <div className="nf-lb-earned__copy">
          <h2 id="lb-earned-title">{earnedTitle(me.rank, place)}</h2>
          <p className="nf-lb-earned__body">{earnedBody(me.rank, board)}</p>
        </div>
        <div className="nf-lb-earned__actions">
          <Button variant="primary" shape="pill" full className="nf-lb__capsule" onClick={onShare}>
            <UiIcon name="share" size={16} /> Share your rank
          </Button>
          <button type="button" className="nf-lb-earned__back" onClick={onClose}>
            Back to the board
          </button>
        </div>
      </div>
    </div>
  );
}

export function BoardObject({ board }: { board: Board }) {
  return <Image className="nf-lb__object" src={BOARD_OBJECT[board]} alt="" width={88} height={88} aria-hidden="true" />;
}
