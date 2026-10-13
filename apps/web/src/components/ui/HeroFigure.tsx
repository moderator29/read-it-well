import type { CSSProperties, ReactNode } from "react";
import { CountUp } from "@/components/motion/CountUp";

/**
 * THE CENTRED HERO FIGURE (founder references 44 and 45, 30 September 2026;
 * `docs/design/CLEAN_UNIFIED_DIRECTION.md` section 17): a screen's one
 * headline figure (a total, a score, a balance) sits centred and large,
 * with a muted caption above it and one quiet sub-line under it.
 *
 *   caption   the muted line above ("Paid through Vallo")
 *   children  the figure itself; `CountedText` makes a printed figure count
 *   sub       the quiet line under it (what the figure means)
 *   id        put on the caption, for a section's `aria-labelledby`
 *
 * The material is `.nf-hero-figure` in `app/css/clean-17.css`. It sits on
 * the page (the soft top) or inside a `HeroBand`, whose night palette it
 * takes. Server-safe.
 */
export function HeroFigure({
  caption,
  sub,
  id,
  size = "lg",
  ems,
  className,
  children,
}: {
  caption?: ReactNode;
  sub?: ReactNode;
  id?: string;
  /** `lg` is the 44px figure; `md` the 34px one for a long money figure. */
  size?: "lg" | "md";
  /**
   * The figure's width in ems, when the caller knows it (a money total does):
   * the figure never grows past the size at which it fills its column, so
   * under text zoom a long figure holds the column instead of running off it.
   * Unset is six, ample for a count.
   */
  ems?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={["nf-hero-figure", className ?? ""].filter(Boolean).join(" ")}>
      {caption != null ? (
        <p id={id} className="nf-hero-figure__caption">
          {caption}
        </p>
      ) : null}
      <p
        className={`nf-hero-figure__value nf-numeric${size === "md" ? " nf-hero-figure__value--md" : ""}`}
        style={ems ? ({ "--nf-figure-ems": ems.toFixed(2) } as CSSProperties) : undefined}
      >
        {children}
      </p>
      {sub != null ? <p className="nf-hero-figure__sub">{sub}</p> : null}
    </div>
  );
}

/**
 * Where the whole number sits inside an already formatted figure, so it can
 * count up without the page formatting money twice. Returns null when the
 * printed text does not hold `value` as `Intl.NumberFormat(tag)` writes it
 * (a decimal score, a compact "2.8m", a negative), and the caller prints the
 * text as it is. Exported for its test.
 */
export function splitCounted(
  text: string,
  value: number,
  tag: string,
): { prefix: string; suffix: string } | null {
  if (!Number.isSafeInteger(value) || value < 0) return null;
  const digits = new Intl.NumberFormat(tag).format(value);
  const at = text.indexOf(digits);
  if (at < 0) return null;
  /* The match must be the whole number, not the tail of a longer one. */
  const before = text.slice(0, at);
  const after = text.slice(at + digits.length);
  if (/[\d.,]$/.test(before) || /^[\d]/.test(after) || /^[.,]\d/.test(after)) return null;
  return { prefix: before, suffix: after };
}

/**
 * A printed figure that counts from 0 to its value once (CountUp: ~600ms,
 * off under reduced motion, Calm and Off). The final frame is exactly
 * `text`; when the text cannot be split safely it is printed unchanged.
 */
export function CountedText({ text, value, tag }: { text: string; value: number; tag: string }) {
  const parts = splitCounted(text, value, tag);
  if (!parts) return <>{text}</>;
  return <CountUp value={value} tag={tag} prefix={parts.prefix} suffix={parts.suffix} eager />;
}
