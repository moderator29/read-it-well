import { createElement } from "react";
import type { ReactNode } from "react";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";

/**
 * The tag (reference 55, kind 7): a soft pill with a glyph and a word, on the
 * surface hairline (navy at night). A LABEL, not a control: it names what a
 * thing is (a checked identity, a featured listing, an open date), so it has
 * no hover and no press. A filter that toggles is a `Chip`; a state in a
 * row's trailing slot is a `StatusBadge`.
 *
 * Tones: `brand` (blue), `spark` (the warm orange, only where
 * CLEAN_UNIFIED_DIRECTION.md section 18 allows it: the Featured tag),
 * `success` (green), `neutral`, `danger`. The word must be true: the claims
 * rules still decide whether a listing may be called anything.
 */
export type TagTone = "brand" | "spark" | "success" | "neutral" | "danger";

export function tagClass(tone: TagTone = "brand", className?: string): string {
  return ["nf-tag", tone === "brand" ? "" : `nf-tag--${tone}`, className ?? ""].filter(Boolean).join(" ");
}

export function Tag({
  tone = "brand",
  icon,
  className,
  children,
}: {
  tone?: TagTone;
  icon?: UiIconName;
  className?: string;
  children: ReactNode;
}) {
  /* `createElement` for the outer span, as StatusBadge does, so the unit
     suite can render it on the server entry. */
  return createElement(
    "span",
    { className: tagClass(tone, className) },
    icon ? (
      <span className="nf-tag__glyph" aria-hidden="true">
        <UiIcon name={icon} size={16} filled />
      </span>
    ) : null,
    children,
  );
}
