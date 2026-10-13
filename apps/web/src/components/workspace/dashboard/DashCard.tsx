import Link from "next/link";
import type { ReactNode } from "react";
import "./dashboard.css";

/**
 * The one card both workspace dashboards use: a quiet title on the left, an
 * optional "View all" door on the right, then the content. A card that has
 * nothing to show draws `EmptyNote` inside itself, so the grid never has a
 * hole and a chart is never drawn from nothing.
 */
export function DashCard({
  title,
  action,
  area,
  testId,
  children,
}: {
  title: string;
  action?: { href: string; label: string };
  /** The desk grid area (`lease`, `rent`, ...). The phone ignores it. */
  area?: string;
  testId?: string;
  children: ReactNode;
}) {
  return (
    <section className={["wsd-card", area ? `wsd-area-${area}` : ""].filter(Boolean).join(" ")} data-testid={testId} aria-label={title}>
      <div className="wsd-card__head">
        <h2 className="wsd-card__title">{title}</h2>
        {action ? (
          <Link href={action.href} className="wsd-card__action nf-tap">
            {action.label}
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/** A real empty state: what is missing and what puts something here. */
export function EmptyNote({
  title,
  body,
  cta,
}: {
  title: string;
  body?: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="wsd-empty">
      <p className="wsd-empty__title">{title}</p>
      {body ? <p className="wsd-empty__body">{body}</p> : null}
      {cta ? (
        <Link href={cta.href} className="nf-btn nf-btn--glass nf-btn--sm">
          {cta.label}
        </Link>
      ) : null}
    </div>
  );
}

/** A read that failed. It says so; it never shows a zero. */
export function Unavailable({ text }: { text: string }) {
  return (
    <p className="wsd-note" role="status">
      {text}
    </p>
  );
}
