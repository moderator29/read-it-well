import Link from "next/link";
import type { ReactNode } from "react";
import { UiIcon } from "@/design-system/icons/UiIcon";
import "@/app/css/premium-moments.css";

/**
 * THE ONE SUCCESS MOMENT (ONE-PRODUCT-DECISIONS, "Recommendations to unify
 * the platform"; D72 and D74; references 4 and 7, the Plasma success screen,
 * `docs/design/references/2026-10-07/streak-earned-badge.jpg`).
 *
 *   Moment         the head of any status or payoff: a dot, a title, one
 *                  line. Done is the scalloped badge; waiting a ring that
 *                  breathes (only while something is genuinely moving); a
 *                  problem a red mark.
 *   SuccessMoment  the whole payoff: the badge (or the gold medal for an
 *                  earned milestone), one sentence of what happened and when
 *                  it lands, the primary capsule and a quiet second action.
 *
 * Server-safe and presentational: it says what its caller read and nothing
 * else. Every motion (the pop, the sparkles) has a still frame under reduced
 * motion, Calm, Off and save-data (`premium-moments.css`).
 */
export type MomentTone = "done" | "waiting" | "problem" | "neutral";

/* A scalloped seal, twelve soft lobes on a circle. Computed once, in a 48 unit box. */
const SCALLOP = (() => {
  const pts: string[] = [];
  for (let i = 0; i <= 120; i++) {
    const a = (i / 120) * Math.PI * 2;
    const r = 21 + 2.2 * Math.cos(12 * a);
    pts.push(`${(24 + r * Math.cos(a)).toFixed(2)},${(24 + r * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join(" L")} Z`;
})();

/**
 * The payoff badge: a scalloped seal with a check and four sparkles that open
 * out once, over soft rays. `medal` is the gold variant for a milestone the
 * member earned (a real one: never an invented streak).
 */
export function SuccessBadge({ medal = false }: { medal?: boolean }) {
  return (
    <span className="nf-mbadge" data-medal={medal ? "true" : undefined} aria-hidden="true">
      <svg viewBox="0 0 48 48" className="nf-mbadge__seal">
        <path d={SCALLOP} />
      </svg>
      <UiIcon name={medal ? "star" : "check"} size={26} className="nf-mbadge__check" />
      <span className="nf-mbadge__spark" data-at="1" />
      <span className="nf-mbadge__spark" data-at="2" />
      <span className="nf-mbadge__spark" data-at="3" />
      <span className="nf-mbadge__spark" data-at="4" />
    </span>
  );
}

/** The dot alone: a green check, a breathing ring, a red mark, a quiet ring. Large and done, it is the badge. */
export function MomentDot({ tone, live = false, size = "md" }: { tone: MomentTone; live?: boolean; size?: "sm" | "md" | "lg" }) {
  if (tone === "done" && size === "lg") return <SuccessBadge />;
  return (
    <span className={`nf-mdot nf-mdot--${size}`} data-tone={tone} data-live={live ? "true" : undefined} aria-hidden="true">
      {tone === "done" ? <UiIcon name="check" size={size === "md" ? 18 : 12} /> : null}
      {tone === "problem" ? <UiIcon name="close" size={size === "lg" ? 24 : size === "md" ? 16 : 11} /> : null}
      {tone === "waiting" ? <span className="nf-mdot__core" /> : null}
    </span>
  );
}

/** The head of a payoff or a status screen: the dot, the title, one line. */
export function Moment({
  tone,
  title,
  line,
  live = false,
  medal = false,
  align = "center",
  as: Heading = "h2",
  id,
  children,
  testId,
}: {
  tone: MomentTone;
  title: ReactNode;
  line?: ReactNode;
  /** True only while the thing it describes is genuinely still moving. */
  live?: boolean;
  /** Done as the gold medal, for an earned milestone. */
  medal?: boolean;
  align?: "center" | "start";
  as?: "h1" | "h2" | "h3";
  id?: string;
  children?: ReactNode;
  testId?: string;
}) {
  return (
    <div className="nf-moment" data-align={align} data-tone={tone} data-testid={testId}>
      {tone === "done" && medal ? <SuccessBadge medal /> : <MomentDot tone={tone} live={live} size="lg" />}
      <Heading id={id} className="nf-moment__title">
        {title}
      </Heading>
      {line ? <p className="nf-moment__line">{line}</p> : null}
      {children}
    </div>
  );
}

export type MomentAction = { label: string; href: string };

/**
 * The whole payoff, for any screen: sent, withdrawn, booked, paid, earned.
 * `line` is one plain sentence of what happened and when it lands. The
 * primary action is the reflecting capsule; the second is quiet.
 */
export function SuccessMoment({
  title,
  line,
  primary,
  secondary,
  medal = false,
  as,
  testId,
}: {
  title: ReactNode;
  line: ReactNode;
  primary?: MomentAction;
  secondary?: MomentAction;
  medal?: boolean;
  as?: "h1" | "h2" | "h3";
  testId?: string;
}) {
  return (
    <Moment tone="done" title={title} line={line} medal={medal} as={as} testId={testId}>
      {primary || secondary ? (
        <div className="nf-moment__actions">
          {primary ? (
            <Link href={primary.href} className="nf-capsule">
              {primary.label}
            </Link>
          ) : null}
          {secondary ? (
            <Link href={secondary.href} className="nf-moment__quiet nf-tap">
              {secondary.label}
            </Link>
          ) : null}
        </div>
      ) : null}
    </Moment>
  );
}
