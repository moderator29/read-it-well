import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * THE GROUPED LIST (the clean unified sweep, 29 September 2026;
 * `docs/design/CLEAN_UNIFIED_DIRECTION.md` section 5, reference 31's
 * "Chase first"). One white card (a flat night card after dark) holds the
 * whole group; rows sit inside it with hairlines inset to the text column.
 * The material is `app/css/list-group.css`.
 *
 *   <ListGroup label="Chase first" action={<Link ...>See all 8</Link>}>
 *     <ListRow leading={<IconPlate ... />} title="..." sub="..."
 *              value="N42,800" status={<StatusBadge kind="status" ... />}
 *              href="/..." chevron />
 *   </ListGroup>
 *
 * ListGroup
 *   label   the section label above the card (sentence case; the class sets
 *           it in caps)
 *   action  a quiet action at the label's right ("See all 8")
 *   bare    no card: dividers only (a list inside a sheet or a band)
 *
 * ListRow
 *   leading   a 36px `IconPlate`, `InitialsTile` or round avatar
 *   title     15/500;  sub  13/400 muted
 *   value     15/600 tabular, top right;  status  under the value
 *             (a `StatusBadge kind="status"` or `kind="badge"`)
 *   trailing  a switch, a count, a button; never with `chevron`
 *   chevron   the 16px muted chevron of a row that opens something
 *   href      the row is a link;  onClick  the row is a button;
 *             neither  the row is static
 *
 * Server-safe unless a caller passes `onClick`, which only a client parent
 * can do.
 */
export function ListGroup({
  label,
  action,
  bare = false,
  className,
  children,
  ...rest
}: {
  label?: ReactNode;
  action?: ReactNode;
  bare?: boolean;
  className?: string;
  children: ReactNode;
} & Omit<ComponentPropsWithoutRef<"section">, "children" | "className">) {
  const list = <ul className={["nf-list-group", bare ? "nf-list-group--bare" : ""].filter(Boolean).join(" ")}>{children}</ul>;
  if (label == null && action == null) {
    return (
      <section {...rest} className={["nf-list-section", className ?? ""].filter(Boolean).join(" ")}>
        {list}
      </section>
    );
  }
  return (
    <section {...rest} className={["nf-list-section", className ?? ""].filter(Boolean).join(" ")}>
      <div className="nf-list-section__head">
        {label != null ? <h3 className="nf-section-label">{label}</h3> : <span />}
        {action != null ? <span className="nf-list-section__action">{action}</span> : null}
      </div>
      {list}
    </section>
  );
}

type ListRowProps = {
  leading?: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  value?: ReactNode;
  status?: ReactNode;
  trailing?: ReactNode;
  chevron?: boolean;
  href?: string;
  onClick?: () => void;
  /** Links only: prefetch as next/link would. */
  prefetch?: boolean;
  className?: string;
  "aria-label"?: string;
  "data-testid"?: string;
};

export function ListRow({
  leading,
  title,
  sub,
  value,
  status,
  trailing,
  chevron = false,
  href,
  onClick,
  prefetch,
  className,
  "aria-label": ariaLabel,
  "data-testid": testId,
}: ListRowProps) {
  const cls = ["nf-list-row", sub != null ? "nf-list-row--two" : "", className ?? ""].filter(Boolean).join(" ");
  const inner = (
    <>
      {leading != null ? <span className="nf-list-row__lead">{leading}</span> : null}
      <span className="nf-list-row__text">
        <span className="nf-list-row__title">{title}</span>
        {sub != null ? <span className="nf-list-row__sub">{sub}</span> : null}
      </span>
      {value != null || status != null ? (
        <span className="nf-list-row__end">
          {value != null ? <span className="nf-list-row__value">{value}</span> : null}
          {status}
        </span>
      ) : null}
      {trailing != null ? <span className="nf-list-row__trail">{trailing}</span> : null}
      {chevron && trailing == null ? (
        <UiIcon name="chevron-right" size={16} className="nf-list-row__chevron" />
      ) : null}
    </>
  );
  return (
    <li className="nf-list-item">
      {href ? (
        <Link href={href} prefetch={prefetch} className={cls} aria-label={ariaLabel} data-testid={testId}>
          {inner}
        </Link>
      ) : onClick ? (
        <button type="button" onClick={onClick} className={cls} aria-label={ariaLabel} data-testid={testId}>
          {inner}
        </button>
      ) : (
        <div className={cls} aria-label={ariaLabel} data-testid={testId}>
          {inner}
        </div>
      )}
    </li>
  );
}
