import type { ReactNode } from "react";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { ICON, TYPE } from "./Screen";

/**
 * The inline disclosure: a native `<details>` on the one disclosure motion in
 * `app/css/list-group.css` (`.nf-disclosure`, plan item 30). The panel grows
 * and fades in over 240ms while the chevron turns; instant under reduced
 * motion, Calm and Off. It opens with scripts off and a keyboard gets it for
 * free.
 *
 * It is `Disclosure`'s `inline` form, split out with no client code so a
 * server page (the landing FAQ) can use it without shipping the sheet that
 * `Disclosure` also carries. `Disclosure inline` renders exactly this.
 */
export function DisclosureInline({
  title,
  hint,
  children,
  footer,
  defaultOpen = false,
  className,
  titleClassName = TYPE.rowTitle,
  "data-testid": testId,
}: {
  /** The row's label: what is behind it, or the question it answers. */
  title: ReactNode;
  /** How much of it there is, or one clarifying word. Optional and quiet. */
  hint?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Start open. */
  defaultOpen?: boolean;
  className?: string;
  /** The label's type; a row title by default. */
  titleClassName?: string;
  "data-testid"?: string;
}) {
  return (
    <details
      className={["nf-disclosure", className ?? ""].filter(Boolean).join(" ")}
      open={defaultOpen || undefined}
      data-testid={testId}
    >
      <summary>
        <span className="nf-disclosure__label">
          <span className={`block ${titleClassName}`}>{title}</span>
          {hint ? <span className="nf-disclosure__hint">{hint}</span> : null}
        </span>
        <UiIcon name="chevron-down" size={ICON.row} className="nf-disclosure__chevron" aria-hidden />
      </summary>
      <div className="nf-disclosure__panel">
        {children}
        {footer}
      </div>
    </details>
  );
}
