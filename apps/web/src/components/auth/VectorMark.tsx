import type { CSSProperties } from "react";
import {
  MARK_ASPECT,
  MARK_PATHS,
  MARK_VIEWBOX,
  WORDMARK_ASPECT,
  WORDMARK_PATHS,
  WORDMARK_VIEWBOX,
} from "./vector-mark";

/**
 * Vallo's mark and wordmark as inline vectors, in one ink (`vector-mark.ts`
 * says how they were drawn and why).
 *
 * Inline rather than an <img> of the file, because `currentColor` only reaches
 * into an SVG that is part of the document: the surface sets `color` to a
 * `--nf-*` token and the mark follows it, in either theme, with no artwork
 * swap and no raster to go soft when the startup sequence scales and turns it.
 *
 * `size` is the mark's WIDTH in CSS pixels (the wordmark's height), matching
 * how `LogoMark` is sized, so a call site can move from one to the other
 * without a layout change. Both are decorative by default (the surface names
 * Vallo in text); pass `label` where the mark is the only name on screen.
 */
export function VectorMark({
  size = 32,
  label,
  className,
  style,
}: {
  size?: number;
  label?: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox={MARK_VIEWBOX}
      width={size}
      height={Math.round(size / MARK_ASPECT)}
      fill="currentColor"
      className={className ? `nf-vmark ${className}` : "nf-vmark"}
      style={style}
      focusable="false"
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      {MARK_PATHS.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

export function VectorWordmark({
  height = 16,
  label,
  className,
}: {
  height?: number;
  label?: string;
  className?: string;
}) {
  return (
    <svg
      viewBox={WORDMARK_VIEWBOX}
      width={Math.round(height * WORDMARK_ASPECT)}
      height={height}
      fill="currentColor"
      className={className ? `nf-vwordmark ${className}` : "nf-vwordmark"}
      focusable="false"
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      {WORDMARK_PATHS.map((d) => (
        <path key={d} d={d} fillRule={d.includes("Zm") ? "evenodd" : undefined} />
      ))}
    </svg>
  );
}
