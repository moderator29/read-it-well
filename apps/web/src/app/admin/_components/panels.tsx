import type { ReactNode } from "react";
import Link from "next/link";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Sparkline, type SparkTone } from "@/components/agent/charts/Sparkline";
import { NavIcon, type AdminIcon } from "./AdminGlyph";
import type { Delta } from "./metrics";

/**
 * The console's shared furniture, drawn from the four admin renders: the lit
 * glass panel, the page head with its blue sub-line, the KPI strip and the
 * KPI card with a sparkline, the icon plate, the status badge, the tab row,
 * the data table, and the two honest states every panel can be in when it has
 * nothing true to draw (empty, or not wired yet).
 *
 * Every desk imports these rather than drawing its own, so the console reads
 * as one object. Server-safe: nothing here holds state.
 */

export function PageHead({ title, lede, action }: { title: string; lede: string; action?: ReactNode }) {
  return (
    <header className="nf-admin-page-head">
      <div className="min-w-0">
        <h1 className="nf-admin-page-head__title">{title}</h1>
        <p className="nf-admin-page-head__lede">{lede}</p>
      </div>
      {action}
    </header>
  );
}

export function Panel({
  title,
  action,
  children,
  className,
  id,
  flush = false,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
  /** No inner padding under the head, for a table that runs edge to edge. */
  flush?: boolean;
}) {
  return (
    <section
      className={`nf-admin-panel${flush ? " nf-admin-panel--flush" : ""}${className ? ` ${className}` : ""}`}
      aria-labelledby={title && id ? `${id}-title` : undefined}
      id={id}
    >
      {(title || action) && (
        <div className="nf-admin-panel__head">
          {title && (
            <h2 className="nf-admin-panel__title" id={id ? `${id}-title` : undefined}>
              {title}
            </h2>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** "View all ->", the renders' quiet panel link. */
export function PanelLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="nf-admin-panel__link">
      {children}
      <UiIcon name="arrow-right" size={16} />
    </Link>
  );
}

export function IconPlate({ icon, tone = "brand", size = "md" }: { icon: AdminIcon; tone?: BadgeTone | "brand"; size?: "sm" | "md" }) {
  return (
    <span className={`nf-admin-plate nf-admin-plate--${tone} nf-admin-plate--${size}`} aria-hidden="true">
      <NavIcon icon={icon} size={size === "sm" ? 16 : 24} />
    </span>
  );
}

export type BadgeTone = "success" | "pending" | "error" | "info";

/** A status badge: a rounded rectangle carrying its word, per the shape law. */
export function Badge({ tone, solid = false, children }: { tone: BadgeTone; solid?: boolean; children: ReactNode }) {
  return <span className={`nf-admin-badge nf-admin-badge--${tone}${solid ? " nf-admin-badge--solid" : ""}`}>{children}</span>;
}

/** The change against the previous period, with its arrow and its words. */
export function DeltaLine({ delta, caption }: { delta: Delta | null; caption?: string }) {
  if (!delta) return caption ? <span className="nf-admin-kpi__caption">{caption}</span> : null;
  const tone = delta.direction === "flat" ? "flat" : delta.good ? "good" : "bad";
  return (
    <span className="nf-admin-kpi__delta-wrap">
      <span className={`nf-admin-delta nf-admin-delta--${tone}`}>
        {delta.direction !== "flat" && (
          <svg viewBox="0 0 10 10" width="10" height="10" aria-hidden="true">
            <path d={delta.direction === "up" ? "M5 1.5 9 8.5H1Z" : "M5 8.5 1 1.5h8Z"} fill="currentColor" />
          </svg>
        )}
        {delta.text}
      </span>
      {caption && <span className="nf-admin-kpi__caption">{caption}</span>}
    </span>
  );
}

export type KpiSpark = { id: string; values: readonly number[]; label: string; tone?: SparkTone };

/** A sparkline is drawn only when something happened: fourteen zeros is not a line. */
function drawable(spark: KpiSpark | null | undefined): spark is KpiSpark {
  return Boolean(spark && spark.values.some((v) => v !== 0));
}

export type KpiItem = {
  key: string;
  icon: AdminIcon;
  label: string;
  /** Null when the figure has no source yet; the tile says so instead of a number. */
  value: string | null;
  delta?: Delta | null;
  caption?: string;
  spark?: KpiSpark | null;
  href?: string;
  /** Why there is no figure: the read failed, or the platform records nothing to read. */
  pending?: string;
  /** The word in place of the figure: "Unavailable" by default, "Not recorded" for a metric with no source. */
  missingWord?: string;
};

function Figure({ item, big }: { item: KpiItem; big: boolean }) {
  if (item.value === null) {
    return (
      <span className="nf-admin-kpi__unwired">
        <span className={big ? "nf-admin-kpi__value nf-admin-kpi__value--none" : "nf-admin-kpi__value nf-admin-kpi__value--none nf-admin-kpi__value--sm"}>
          {item.missingWord ?? "Unavailable"}
        </span>
        {item.pending && <span className="nf-admin-kpi__caption">{item.pending}</span>}
      </span>
    );
  }
  return <span className={`nf-admin-kpi__value${big ? "" : " nf-admin-kpi__value--sm"} nf-numeric`}>{item.value}</span>;
}

/** The renders' top strip: four figures in one lit pane, split by hairlines. */
export function KpiStrip({ items, label }: { items: readonly KpiItem[]; label: string }) {
  return (
    <section className="nf-admin-strip" aria-label={label}>
      {items.map((item) => (
        <div key={item.key} className="nf-admin-strip__cell">
          <IconPlate icon={item.icon} />
          <div className="nf-admin-strip__body">
            <span className="nf-admin-kpi__label">{item.label}</span>
            <span className="nf-admin-strip__line">
              <Figure item={item} big={false} />
              {item.value !== null && item.delta && <DeltaLine delta={item.delta} />}
            </span>
            {item.value !== null && !item.delta && item.caption && (
              <span className="nf-admin-kpi__caption">{item.caption}</span>
            )}
          </div>
          {item.value !== null && drawable(item.spark) && (
            <Sparkline {...item.spark} width={72} height={30} className="nf-admin-strip__spark" />
          )}
        </div>
      ))}
    </section>
  );
}

/**
 * One KPI card, as 5EAA44CB draws it: the plate top left, the title beside
 * it, the big figure under the title, the change and "vs last week" under
 * that, the sparkline anchored bottom right.
 */
export function KpiCard({ item }: { item: KpiItem }) {
  const body = (
    <>
      <IconPlate icon={item.icon} />
      <div className="nf-admin-kpi__body">
        <span className="nf-admin-kpi__label nf-admin-kpi__label--card">{item.label}</span>
        <Figure item={item} big />
        {item.value !== null && <DeltaLine delta={item.delta ?? null} caption={item.caption} />}
      </div>
      {item.value !== null && drawable(item.spark) && (
        <Sparkline {...item.spark} width={96} height={44} className="nf-admin-kpi__spark" />
      )}
    </>
  );
  return item.href ? (
    <Link href={item.href} className="nf-admin-kpi">
      {body}
    </Link>
  ) : (
    <div className="nf-admin-kpi">{body}</div>
  );
}

export function KpiGrid({ items, label }: { items: readonly KpiItem[]; label: string }) {
  return (
    <section className="nf-admin-kpis" aria-label={label}>
      {items.map((item) => (
        <KpiCard key={item.key} item={item} />
      ))}
    </section>
  );
}

/**
 * The panel state for a figure whose query does not exist yet. It names the
 * request that will wire it, so an operator reading an empty panel knows it
 * is empty because of the console, not because of the platform.
 */
export function NotWired({ what, request }: { what: string; request: string }) {
  return (
    <div className="nf-admin-state nf-admin-state--unwired" role="note">
      <UiIcon name="link" size={24} />
      <p className="nf-admin-state__title">Not wired yet</p>
      <p className="nf-admin-state__body">
        {what} {request}
      </p>
    </div>
  );
}

/** The panel state for a real read that came back with nothing in it. */
export function PanelEmpty({ title, body, icon = "info" }: { title: string; body: string; icon?: "info" | "verified" | "history" }) {
  return (
    <div className="nf-admin-state" role="note">
      <UiIcon name={icon} size={24} />
      <p className="nf-admin-state__title">{title}</p>
      <p className="nf-admin-state__body">{body}</p>
    </div>
  );
}

/** The panel state for a read that failed. */
export function PanelUnavailable({ what }: { what: string }) {
  return (
    <div className="nf-admin-state nf-admin-state--error" role="alert">
      <UiIcon name="close" size={24} />
      <p className="nf-admin-state__title">This did not load</p>
      <p className="nf-admin-state__body">{what} could not be read just now. Nothing has changed; reload to try again.</p>
    </div>
  );
}

/** A row of tabs that are links, so a tab is a URL and survives a reload. */
export function TabRow({
  items,
  label,
}: {
  items: readonly { key: string; href: string; label: string; active: boolean; count?: number }[];
  label: string;
}) {
  return (
    <nav className="nf-admin-seg" aria-label={label}>
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          scroll={false}
          aria-current={item.active ? "page" : undefined}
          className={`nf-admin-seg__item${item.active ? " nf-admin-seg__item--on" : ""}`}
        >
          {item.label}
          {typeof item.count === "number" && item.count > 0 && (
            <span className="nf-admin-seg__count nf-numeric">{item.count}</span>
          )}
        </Link>
      ))}
    </nav>
  );
}

/** The alert list rows the overview and operations share. */
export type AlertRow = {
  id: string;
  title: string;
  sub: string;
  when: string;
  tone: BadgeTone;
  word: string;
  icon: AdminIcon;
  href?: string;
};

export function AlertList({ rows }: { rows: readonly AlertRow[] }) {
  return (
    <ul className="nf-admin-alerts">
      {rows.map((row) => {
        const inner = (
          <>
            <IconPlate icon={row.icon} tone={row.tone} size="sm" />
            <span className="nf-admin-alerts__text">
              <span className="nf-admin-alerts__title">{row.title}</span>
              <span className="nf-admin-alerts__sub">{row.sub}</span>
            </span>
            <span className="nf-admin-alerts__when nf-numeric">{row.when}</span>
            <Badge tone={row.tone}>{row.word}</Badge>
          </>
        );
        return (
          <li key={row.id}>
            {row.href ? (
              <Link href={row.href} className="nf-admin-alerts__row">
                {inner}
              </Link>
            ) : (
              <div className="nf-admin-alerts__row">{inner}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
