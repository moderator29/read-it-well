import Image from "next/image";
import type { ReactNode } from "react";
import type { BrandIconName } from "@/design-system/icons/BrandIcon";
import { photo, type PhotoName } from "@/lib/site/photos";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { lineGlyphFor } from "@/design-system/icons/glass-to-line";

/**
 * The plate head every public content page opens on.
 *
 * From 64rem, one of the photography plates behind the chip, the title and
 * the lede, with the canvas growing out of its foot: the landing hero's
 * register at a third of its height, so about, help, the legal pages and
 * the rest read as the same site as the front door. Under 64rem the copy
 * sits on the canvas and the plate is a fitted rounded band beneath it,
 * never a backdrop behind text (the founder's phone ruling, and the same
 * rule the landing hero follows). The plate is decorative (`alt=""`,
 * `aria-hidden`), sized through `next/image` at the width it is shown.
 *
 * `heading` lets a layout render the head above pages that carry their own
 * h1 (the docs chapters); everywhere else it is the page's one h1.
 */
export function SiteHead({
  plate,
  icon,
  chip,
  title,
  lede,
  heading = "h1",
  align = "center",
  children,
}: {
  plate: PhotoName;
  icon: BrandIconName;
  chip: string;
  title: string;
  lede?: string;
  heading?: "h1" | "p";
  align?: "center" | "start";
  children?: ReactNode;
}) {
  const Title = heading;
  return (
    <section className={`nf-site-head ${align === "start" ? "nf-site-head--start" : ""}`}>
      <div className="nf-aurora nf-site-head-aurora" aria-hidden="true" />
      <div className="nf-shell">
        <div className="nf-site-head-body mx-auto max-w-3xl">
          <span className="nf-chip nf-rise">
            <UiIcon name={lineGlyphFor(icon)} size={16} />
            {chip}
          </span>
          <Title className="nf-site-head-title nf-rise nf-rise-2 max-w-measure-display">{title}</Title>
          {lede && <p className="nf-site-head-lede nf-rise nf-rise-3 max-w-measure-lede">{lede}</p>}
          {children}
        </div>
        <div className="nf-site-head-plate" aria-hidden="true">
          <Image src={photo(plate)} alt="" fill priority sizes="(max-width: 64rem) 100vw, 100vw" />
        </div>
      </div>
    </section>
  );
}
