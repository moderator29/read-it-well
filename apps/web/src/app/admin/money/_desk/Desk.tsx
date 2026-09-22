import Link from "next/link";
import type { ReactNode } from "react";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { pagerItems } from "./derive";

/**
 * The money desks' furniture, shared by money, escrow, supply, bookings and
 * payments. Area-local on purpose: the console's shared primitives are
 * admin-shell's (`app/admin/_components`), and these are the pieces the three
 * money renders draw that the shared set does not.
 */

export function DeskHead({ title, lede, aside }: { title: string; lede: string; aside?: ReactNode }) {
  return (
    <header className="nf-md-head">
      <div className="min-w-0">
        <h1 className="nf-md-head__title">{title}</h1>
        <p className="nf-md-head__lede">{lede}</p>
      </div>
      {aside ? <div className="nf-md-head__aside">{aside}</div> : null}
    </header>
  );
}

export function Panel({
  title,
  hint,
  aside,
  foot,
  className,
  children,
  labelledBy,
}: {
  title: string;
  hint?: string;
  aside?: ReactNode;
  foot?: ReactNode;
  className?: string;
  children: ReactNode;
  labelledBy?: string;
}) {
  const id = labelledBy ?? `panel-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <section className={`nf-md-card nf-md-panel ${className ?? ""}`} aria-labelledby={id}>
      <div className="nf-md-panel__head">
        <h2 id={id} className="nf-md-panel__title">
          {title}
        </h2>
        {aside ?? (hint ? <span className="nf-md-panel__hint">{hint}</span> : null)}
      </div>
      {children}
      {foot ? <p className="nf-md-panel__foot">{foot}</p> : null}
    </section>
  );
}

/**
 * THE NOT-WIRED STATE. Says what the panel will show, in words for an
 * operator, and that its figures are not connected yet. No request number in
 * the copy: that lives in the ledger and the handbook, where the people who
 * can act on it read.
 */
export function Waiting({ title, body }: { title: string; body: string }) {
  return (
    <div className="nf-md-wait" role="note">
      <UiIcon name="info" size={18} className="mt-3xs shrink-0 text-[var(--nf-brand-quiet)]" />
      <div className="min-w-0">
        <p className="nf-md-wait__title">{title}</p>
        <p className="nf-md-wait__body">{body}</p>
      </div>
    </div>
  );
}

export type Delta = {
  /** Whole percentage, or null when there is no real earlier period. */
  percent: number | null;
  /** What it is compared with, e.g. "vs the 7 days before". */
  against: string;
  /** For money leaving (failed charges), an increase is bad. */
  upIsGood?: boolean;
};

function DeltaLine({ delta, fallback }: { delta: Delta | null; fallback?: string }) {
  if (!delta || delta.percent === null) {
    return fallback ? <p className="nf-md-delta">{fallback}</p> : null;
  }
  const { percent, against, upIsGood = true } = delta;
  const direction = percent > 0 ? "up" : percent < 0 ? "down" : "flat";
  const good = direction === "flat" ? null : (direction === "up") === upIsGood;
  const tone = good === null ? "flat" : good ? "up" : "down";
  return (
    <p className="nf-md-delta">
      <span className={`nf-md-delta__figure nf-md-delta__figure--${tone}`}>
        {direction !== "flat" && (
          <UiIcon name={direction === "up" ? "arrow-up" : "arrow-down"} size={14} />
        )}
        {Math.abs(percent)}%
        <span className="sr-only">{direction === "up" ? " up" : direction === "down" ? " down" : " unchanged"}</span>
      </span>
      <span>{against}</span>
    </p>
  );
}

export function Kpi({
  label,
  value,
  delta = null,
  note,
  href,
  current,
}: {
  label: string;
  /** Null draws the quiet not-wired figure. */
  value: string | null;
  delta?: Delta | null;
  /** Said under the figure when there is no delta to draw. */
  note?: string;
  href?: string;
  current?: boolean;
}) {
  const body = (
    <>
      <span className="nf-md-kpi__label">{label}</span>
      {value === null ? (
        <span className="nf-md-kpi__value nf-md-kpi__value--quiet">Not connected yet</span>
      ) : (
        <span className="nf-md-kpi__value nf-numeric">{value}</span>
      )}
      <DeltaLine delta={delta} fallback={note} />
    </>
  );
  if (href) {
    return (
      <Link href={href} className="nf-md-card nf-md-kpi" aria-current={current ? "true" : undefined}>
        {body}
      </Link>
    );
  }
  return <div className="nf-md-card nf-md-kpi">{body}</div>;
}

/**
 * The renders' numbered pager: previous, 1 2 3 4 5 ... 12, next.
 *
 * Every link is a real URL built from the page's own search params, so a
 * page is shareable and the back button works. With a single page it draws
 * only the count, because a pager of one is furniture.
 */
export function NumberedPager({
  base,
  params,
  page,
  total,
  pageSize,
  noun,
  param = "page",
}: {
  base: string;
  params: Record<string, string | undefined>;
  page: number;
  total: number;
  pageSize: number;
  noun: string;
  param?: string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const href = (p: number) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v && k !== param) next.set(k, v);
    if (p > 1) next.set(param, String(p));
    const qs = next.toString();
    return qs ? `${base}?${qs}` : base;
  };
  const items = pagerItems(page, pages);
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(total, page * pageSize);

  return (
    <nav className="nf-md-pager" aria-label={`${noun} pages`}>
      {items.length > 0 && (
        <>
          {page > 1 ? (
            <Link href={href(page - 1)} className="nf-md-pager__item" aria-label="Previous page">
              <UiIcon name="arrow-left" size={16} />
            </Link>
          ) : (
            <span className="nf-md-pager__item" aria-disabled="true">
              <UiIcon name="arrow-left" size={16} />
            </span>
          )}
          {items.map((item) =>
            item.kind === "gap" ? (
              <span key={item.key} className="nf-md-pager__gap" aria-hidden="true">
                ...
              </span>
            ) : (
              <Link
                key={item.page}
                href={href(item.page)}
                className="nf-md-pager__item"
                aria-current={item.page === page ? "page" : undefined}
                aria-label={`Page ${item.page}`}
              >
                {item.page}
              </Link>
            ),
          )}
          {page < pages ? (
            <Link href={href(page + 1)} className="nf-md-pager__item" aria-label="Next page">
              <UiIcon name="arrow-right" size={16} />
            </Link>
          ) : (
            <span className="nf-md-pager__item" aria-disabled="true">
              <UiIcon name="arrow-right" size={16} />
            </span>
          )}
        </>
      )}
      <span className="nf-md-pager__count">
        {total === 0 ? `No ${noun}` : `${first} to ${last} of ${total} ${noun}`}
      </span>
    </nav>
  );
}

/** Flattens Next's search params into single strings, for building links. */
export function flatParams(
  params: Record<string, string | string[] | undefined>,
): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(params)) out[k] = Array.isArray(v) ? v[0] : v;
  return out;
}
