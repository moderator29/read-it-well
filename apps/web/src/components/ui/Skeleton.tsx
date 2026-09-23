import type { CSSProperties } from "react";
import { panelClass } from "@/components/ui/Panel";

/**
 * Skeletons.
 *
 * `.nf-skeleton` is fully written in globals.css - the inset slab, the sweeping
 * highlight, the reduced-motion stop - and is used exactly ZERO times. Meanwhile
 * several routes block navigation on an await, so a tap produces nothing at all
 * until the data lands and the whole screen appears at once. The material was
 * never the missing piece; the SHAPES were. Nobody is going to hand-assemble a
 * card's worth of slabs at a call site, so nobody did.
 *
 * These are the shapes. The shimmer stays where it already lives: this file adds
 * no animation of its own, so there is one skeleton material on the platform and
 * the reduced-motion stop is inherited rather than re-implemented and forgotten.
 *
 * Everything here is `aria-hidden`. A skeleton is a picture of content that does
 * not exist yet, and announcing its structure tells a screen reader user about
 * boxes rather than about waiting. The live region belongs to the caller, who is
 * the only one who knows what is loading and what to say when it arrives.
 */

/** The radius scale, by token. A slab with an arbitrary radius reads as a
 *  different component to the one it is standing in for. */
export type SkeletonRadius = "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "pill" | "none";

const RADIUS: Record<SkeletonRadius, string> = {
  /* `xs` ARRIVED WITH THE FOURTEEN HAND-ASSEMBLED LOADING SCREENS. Every one
     of them drew its text lines at `--nf-radius-xs`, which is the right rung
     for a 12px bar and was the one rung this map did not carry, so a faithful
     conversion was impossible without it. A skeleton is the shape it stands in
     for, and rounding a 12px line to 10px instead of 6px changes that shape. */
  xs: "var(--nf-radius-xs)",
  sm: "var(--nf-radius-sm)",
  md: "var(--nf-radius-md)",
  lg: "var(--nf-radius-lg)",
  xl: "var(--nf-radius-xl)",
  "2xl": "var(--nf-radius-2xl)",
  pill: "var(--nf-radius-pill)",
  none: "0",
};

export type SkeletonProps = {
  /** Any CSS length or percentage. Defaults to filling its container. */
  width?: number | string;
  height?: number | string;
  radius?: SkeletonRadius;
  /** Avatars and icon slots. Forces a 1:1 box and a pill radius. */
  circle?: boolean;
  /**
   * The register's shimmer on glass: a glass plate with the hairline rather
   * than the inset trough, for a loading state standing in for a glass card
   * on the dark canvas. Same sweep, same reduced-motion stop.
   */
  glass?: boolean;
  className?: string;
  style?: CSSProperties;
};

export function Skeleton({
  width,
  height,
  radius = "md",
  circle = false,
  glass = false,
  className,
  style,
}: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={["block nf-skeleton", glass ? "nf-skeleton--glass" : "", className ?? ""]
        .filter(Boolean)
        .join(" ")}
      style={{
        width: circle ? (width ?? height) : (width ?? "100%"),
        height: circle ? (height ?? width) : height,
        aspectRatio: circle ? "1 / 1" : undefined,
        borderRadius: circle ? RADIUS.pill : RADIUS[radius],
        ...style,
      }}
    />
  );
}

export type SkeletonTextProps = {
  lines?: number;
  /**
   * The last line is short on purpose. A paragraph of equal-length bars reads as
   * a table or a list; real prose ends mid-measure, and that single ragged edge
   * is what makes the block read as text about to arrive.
   */
  lastLineWidth?: string;
  /** Matches the line-height of the copy being stood in for. */
  lineHeight?: number | string;
  gap?: string;
  className?: string;
};

export function SkeletonText({
  lines = 3,
  lastLineWidth = "62%",
  lineHeight = "0.75rem",
  gap = "0.55rem",
  className,
}: SkeletonTextProps) {
  const count = Math.max(1, Math.trunc(lines));
  return (
    <span
      aria-hidden="true"
      className={["flex flex-col", className ?? ""].filter(Boolean).join(" ")}
      style={{ gap }}
    >
      {Array.from({ length: count }, (_, i) => (
        <Skeleton
          key={i}
          height={lineHeight}
          radius="sm"
          width={i === count - 1 && count > 1 ? lastLineWidth : "100%"}
        />
      ))}
    </span>
  );
}

/**
 * The listing card, before it exists.
 *
 * The boxes deliberately mirror `ListingCard`'s real geometry - the panel card
 * shell, the 4:3 media, the `p-4` body, the 15px title line, the 12px meta row
 * at `mt-2.5` and the 19px price at `mt-3.5`. A skeleton whose proportions are
 * merely approximate causes a layout shift at the exact moment the real content
 * arrives, which is more disruptive than showing nothing: the user has begun
 * reading, and the page moves under them.
 */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      /* The shared panel card by name (SW-O1): `.nf-card` already drew this
         material, so only the name moved. `block p-0` keep the card's own
         layout, which the panel would otherwise make a padded column. */
      className={panelClass({ variant: "card", className: ["block overflow-hidden p-0", className ?? ""].filter(Boolean).join(" ") })}
    >
      <Skeleton radius="none" className="aspect-[4/3] w-full" />
      <div className="p-card-sm">
        <div className="flex items-start justify-between gap-group">
          <Skeleton width="68%" height="0.9375rem" radius="sm" />
          <Skeleton width="2.5rem" height="0.8125rem" radius="sm" />
        </div>
        <div className="mt-xs flex items-center gap-sm">
          <Skeleton width="3.25rem" height="0.75rem" radius="sm" />
          <Skeleton width="3.25rem" height="0.75rem" radius="sm" />
          <Skeleton width="4rem" height="0.75rem" radius="sm" />
        </div>
        <Skeleton className="mt-sm" width="45%" height="1.1875rem" radius="sm" />
      </div>
    </div>
  );
}
