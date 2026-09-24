import type { ReactNode } from "react";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { EmptyActions } from "@/components/app/EmptyActions";
import { IconPlate } from "@/components/ui/IconPlate";
import { SkeletonText } from "@/components/ui/Skeleton";
import { STATE_TONE, stateRole, type StateKind } from "@/lib/design/voice";

/**
 * ONE STATE KIT (V-97): loading, empty, offline, error and done, in one anatomy.
 *
 * The product grew six families for this: `EmptyState`, `EmptyPanel`,
 * `EmptyActions`, `SystemMoment`, `ResultScreen` and `ResultSheet`, plus the
 * route skeletons. A designer looking for "the empty state" found six. This is
 * the one, and the old names become thin wrappers over it, then go.
 *
 * THE ANATOMY, fixed:
 *   1. a glyph: the commissioned object (`icon`, a BrandIcon) where the state
 *      has one, or the kind's plate (a line glyph on the tone's fill)
 *   2. one title, under 40 characters
 *   3. one sentence of body, under 180 characters
 *   4. at most one primary and one secondary action, stacked and full width,
 *      each naming where it goes
 *
 * The words follow `docs/design/VOICE.md`, and `lib/design/voice.ts` holds the
 * rules a machine can check. `scripts/design/state-sweep.mjs` walks the call
 * sites and fails on a long title, a long body, a banned phrase or a state
 * that leaves somebody stuck without a way onward.
 *
 * LOADING has no glyph and no actions: three lines of skeleton and the title
 * as its screen-reader label. An ERROR is announced (`role="alert"`); loading
 * and done report politely (`role="status"`).
 *
 * Server-safe: no hooks, no client boundary.
 */

/* The type roles, as `TYPE.sectionTitle` and `TYPE.body` in
   `components/app/Screen.tsx` spell them. Written out rather than imported,
   because Screen's EmptyState renders this kit and a two-way import is a cycle;
   `lib/design/voice.test.ts` holds them equal. */
export const STATE_TITLE_CLASS = "nf-h3 text-[var(--nf-content-primary)]";
export const STATE_BODY_CLASS = "nf-body text-[var(--nf-content-secondary)]";

const KIND_GLYPH: Record<Exclude<StateKind, "loading">, UiIconName> = {
  empty: "search",
  offline: "info",
  error: "shield-stop",
  done: "verified",
};

export type StateAction = { href: string; label: string };

export type StateProps = {
  kind: StateKind;
  title: string;
  /** One sentence, true of the state the reader is actually in. Unused by loading. */
  body?: string;
  /** The commissioned object. Without one the kind's plate is drawn. */
  icon?: BrandIconName;
  /** The single next thing to do, naming where it goes. */
  primary?: StateAction;
  /** A quiet second way onward. Only drawn beside a primary. */
  secondary?: StateAction;
  /**
   * An action that is not a link (a retry button, a form). The escape hatch the
   * older families need while they are migrated; prefer `primary`.
   */
  action?: ReactNode;
  /** A quiet line under the action, where a link will not do. */
  footnote?: ReactNode;
  /**
   * Loading only: the route's own skeleton, in the shape of the page that is
   * coming, drawn in place of the three default lines.
   */
  children?: ReactNode;
  className?: string;
  "data-testid"?: string;
};

export function State({
  kind,
  title,
  body,
  icon,
  primary,
  secondary,
  action,
  footnote,
  className,
  children,
  "data-testid": testId,
}: StateProps) {
  const role = stateRole(kind);

  if (kind === "loading") {
    /* The title is read out, not shown: a live region announces its text, and
       an aria-label on a status region is not reliably spoken. A route that
       draws its own skeleton (the shape of the page that is coming) passes it
       as children; without one, three lines stand in. */
    return (
      <div
        data-testid={testId}
        data-state-kind="loading"
        role={role}
        aria-busy="true"
        aria-live="polite"
        className={children ? className : `flex flex-col px-lg py-section ${className ?? ""}`}
      >
        <span className="sr-only">{title}</span>
        {children ?? <SkeletonText lines={3} />}
      </div>
    );
  }

  return (
    <div
      data-testid={testId}
      data-state-kind={kind}
      role={role}
      className={`flex flex-col items-center px-lg py-section text-center ${className ?? ""}`}
    >
      {icon ? (
        /* 80px: an empty state is a sentence with a picture beside it, not a
           poster (the size EmptyState settled on). */
        <span className="block h-20 w-20">
          <BrandIcon name={icon} fill />
        </span>
      ) : (
        <IconPlate size="lg" tone={STATE_TONE[kind]}>
          <UiIcon name={KIND_GLYPH[kind]} size={24} />
        </IconPlate>
      )}
      {/* `balance` stops a centred two-line title leaving a one-word orphan. */}
      <p className={`mt-block ${STATE_TITLE_CLASS} [text-wrap:balance]`}>{title}</p>
      {body && <p className={`mt-inline max-w-[42ch] ${STATE_BODY_CLASS}`}>{body}</p>}
      {primary ? (
        <div className="mt-block flex w-full justify-center">
          <EmptyActions primary={primary} {...(secondary ? { secondary } : {})} />
        </div>
      ) : (
        action && <div className="mt-block">{action}</div>
      )}
      {footnote && <div className="mt-group">{footnote}</div>}
    </div>
  );
}
