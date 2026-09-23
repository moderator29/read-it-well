import type { ReactNode } from "react";
import "@/app/css/orphans.css";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";

/**
 * A FIELD DRAWN THE WAY THE GOVERNING IMAGES DRAW ONE.
 *
 * `GOVERNING-03`, `04` and `05` all draw the same object: a glass container
 * with the field's name small and quiet INSIDE it along the top, the value in
 * an inset well beneath that name, and anything the field has to say about
 * itself under the well and still inside the container. What shipped until now
 * was a label on the page above a bare input, which is an ordinary form and is
 * not the form in the images. The previous worker named this gap himself and
 * this is it closed.
 *
 * WHY A WRAPPER AND NOT A NEW FIELD PRIMITIVE. `components/ui/Field.tsx`
 * already owns the part that is hard to get right and easy to get wrong: the
 * label to control pairing, `aria-describedby` across hint AND error,
 * `aria-invalid`, `aria-required`, the 16px floor that stops mobile Safari
 * zooming, and the invalid paint that has to replace a gradient's own
 * border-box layer. A second primitive would be a second copy of all of it,
 * drifting from the day it was written. So the container wraps whatever that
 * primitive renders, and `.nf-regfield`'s rules place the label and the
 * control it already produces. It works the same way around `ChoicePicker`,
 * which also renders an `.nf-label` over an `.nf-field`, without that
 * component knowing anything about this one.
 *
 * ONE PANEL, SINCE SW-O3 (23 September). The container is no longer drawn per
 * field: `.nf-regfield` has no material of its own, and every `RegField` sits
 * inside a `RegFieldGroup`, the shared panel card, which is what the images
 * draw once for a screen's questions. The value's well is the shared
 * `.nf-field`. A lone field is a group of one.
 *
 * "OPTIONAL" IS A RECTANGLE IN THE CORNER. `GOVERNING-05` draws it as a
 * capsule at the container's top right. The corner is the target and the
 * capsule is not, so it ships at 6px on a 24px box, which is 0.250 and a
 * rectangle by the only test that counts. It is a real element in reading
 * order rather than a decoration, so it is read out with the field it belongs
 * to; callers therefore stop passing `optionalText` down to the primitive,
 * because the word would otherwise be drawn twice.
 */
export function RegField({
  optional,
  note,
  noteIcon = "info",
  children,
}: {
  /** The localised word for "optional". Omit it and no tag is drawn. */
  optional?: string;
  /** The line with the small round glyph under the well. */
  note?: string;
  noteIcon?: UiIconName;
  children: ReactNode;
}) {
  return (
    <div className="nf-regfield" {...(optional ? { "data-tagged": "true" } : {})}>
      {optional ? <span className="nf-regfield__tag">{optional}</span> : null}
      {children}
      {note ? (
        <p className="nf-fieldnote">
          <span className="nf-fieldnote__glyph" aria-hidden="true">
            <UiIcon name={noteIcon} size={12} />
          </span>
          <span className="min-w-0 flex-1 text-[var(--nf-content-muted)]">{note}</span>
        </p>
      ) : null}
    </div>
  );
}

/**
 * ONE GLASS PANEL AROUND SEVERAL FIELDS.
 *
 * `GOVERNING-04` draws its first screen and its fee screen this way: the
 * questions share a single card and each keeps its own name over its own well.
 * The member fields drop their own container and keep everything else, so the
 * two anatomies in the set are one anatomy with a wrapper rather than two sets
 * of rules that can disagree.
 */
export function RegFieldGroup({ children }: { children: ReactNode }) {
  /* The shared panel card since the orphans sweep: the 10px container corner,
     the lit edge and the catchlight come from the panel; `nf-orph-fieldgroup`
     (app/css/orphans.css) keeps only the grid. The member fields draw no box
     of their own (SW-O3). */
  return <div className="nf-panel nf-panel--card nf-orph-fieldgroup p-card">{children}</div>;
}
