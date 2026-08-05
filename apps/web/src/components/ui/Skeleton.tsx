import type { CSSProperties } from "react";

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
export type SkeletonRadius = "sm" | "md" | "lg" | "xl" | "2xl" | "pill" | "none";

const RADIUS: Record<SkeletonRadius, string> = {
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
  className?: string;
  style?: CSSProperties;
};

export function Skeleton({
  width,
  height,
  radius = "md",
  circle = false,
  className,
  style,
}: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={["block nf-skeleton", className ?? ""].filter(Boolean).join(" ")}
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
 * The boxes deliberately mirror `ListingCard`'s real geometry - the `nf-card`
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
      className={["nf-card overflow-hidden", className ?? ""].filter(Boolean).join(" ")}
    >
      <Skeleton radius="none" className="aspect-[4/3] w-full" />
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <Skeleton width="68%" height="0.9375rem" radius="sm" />
          <Skeleton width="2.5rem" height="0.8125rem" radius="sm" />
        </div>
        <div className="mt-2.5 flex items-center gap-3.5">
          <Skeleton width="3.25rem" height="0.75rem" radius="sm" />
          <Skeleton width="3.25rem" height="0.75rem" radius="sm" />
          <Skeleton width="4rem" height="0.75rem" radius="sm" />
        </div>
        <Skeleton className="mt-3.5" width="45%" height="1.1875rem" radius="sm" />
      </div>
    </div>
  );
}
