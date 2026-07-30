import type { ReactNode } from "react";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * The console's shared furniture.
 *
 * Server-safe on purpose: no hooks, no client boundary, so a queue page can
 * render its whole list on the server and only hand the decision controls to
 * the browser. Everything here reuses the platform's own glass, chip and badge
 * classes rather than inventing an admin look, because the console is part of
 * RentMe, not a separate product.
 */

/** Lagos time, fixed, so the server and the browser never disagree on a date. */
const WHEN = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Lagos",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const DAY = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Lagos",
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function formatWhen(iso: string | null): string {
  if (!iso) return "Not recorded";
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return "Not recorded";
  return WHEN.format(new Date(parsed));
}

export function formatDay(iso: string | null): string {
  if (!iso) return "Not recorded";
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return "Not recorded";
  return DAY.format(new Date(parsed));
}

export type Tone = "success" | "warning" | "info" | "danger" | "neutral";

/** One status vocabulary, one colour vocabulary, across every queue. */
export function statusTone(status: string): Tone {
  switch (status) {
    case "open":
    case "SUBMITTED":
    case "UNDER_REVIEW":
    case "pending":
      return "warning";
    case "reviewed":
    case "resolved":
    case "APPROVED":
    case "PUBLISHED":
      return "success";
    case "MORE_INFO_REQUIRED":
    case "reviewing":
      return "info";
    case "REJECTED":
    case "SUSPENDED":
      return "danger";
    default:
      return "neutral";
  }
}

/** Human wording for the canonical machine values. */
export function statusLabel(status: string): string {
  switch (status) {
    case "open":
      return "Open";
    case "reviewed":
      return "Reviewed";
    case "reviewing":
      return "In review";
    case "resolved":
      return "Resolved";
    case "dismissed":
      return "Dismissed";
    case "pending":
      return "Awaiting reply";
    case "closed":
      return "Closed";
    case "DRAFT":
      return "Draft";
    case "SUBMITTED":
      return "Submitted";
    case "UNDER_REVIEW":
      return "In review";
    case "MORE_INFO_REQUIRED":
      return "Changes requested";
    case "APPROVED":
      return "Approved";
    case "PUBLISHED":
      return "Live";
    case "REJECTED":
      return "Not approved";
    case "SUSPENDED":
      return "Suspended";
    default:
      return status;
  }
}

const TONE_STYLE: Record<Tone, { background: string; color: string }> = {
  success: { background: "var(--nf-state-success-surface)", color: "var(--nf-state-success)" },
  warning: { background: "var(--nf-state-warning-surface)", color: "var(--nf-state-warning)" },
  info: { background: "var(--nf-state-info-surface)", color: "var(--nf-state-info)" },
  danger: { background: "var(--nf-state-error-surface)", color: "var(--nf-state-error)" },
  neutral: {
    background: "color-mix(in oklab, var(--nf-content-primary) 10%, transparent)",
    color: "var(--nf-content-secondary)",
  },
};

export function StatusChip({
  status,
  label,
  tone,
}: {
  status?: string;
  label?: string;
  tone?: Tone;
}) {
  const resolvedTone = tone ?? statusTone(status ?? "");
  return (
    <span className="nf-badge shrink-0" style={TONE_STYLE[resolvedTone]}>
      {label ?? statusLabel(status ?? "")}
    </span>
  );
}

/** The heading every queue page opens with. */
export function QueueHeader({
  title,
  lede,
  count,
}: {
  title: string;
  lede: string;
  count?: number;
}) {
  return (
    <header className="mb-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="nf-h1 text-[1.5rem] sm:text-[1.75rem]">{title}</h1>
        {typeof count === "number" && count > 0 && (
          <span className="nf-badge nf-badge--brand nf-numeric">{count} waiting</span>
        )}
      </div>
      <p className="mt-1.5 max-w-[62ch] text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
        {lede}
      </p>
    </header>
  );
}

/** A clear queue is good news and should read like it. */
export function QueueEmpty({ title, body }: { title: string; body: string }) {
  return (
    <div className="nf-card p-6 text-center sm:p-8">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full" style={TONE_STYLE.success}>
        <UiIcon name="verified" size={22} strokeWidth={2} />
      </span>
      <p className="mt-3 text-[1rem] font-semibold text-[var(--nf-content-primary)]">{title}</p>
      <p className="mx-auto mt-1.5 max-w-[44ch] text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
        {body}
      </p>
    </div>
  );
}

/**
 * The honest alternative to a fake empty state: when the platform data cannot
 * be reached, say so rather than showing a queue that claims to be clear.
 */
export function QueueUnavailable() {
  return (
    <div className="nf-card p-6 text-center sm:p-8">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full" style={TONE_STYLE.warning}>
        <UiIcon name="bell" size={22} strokeWidth={2} />
      </span>
      <p className="mt-3 text-[1rem] font-semibold text-[var(--nf-content-primary)]">
        This queue could not be loaded
      </p>
      <p className="mx-auto mt-1.5 max-w-[46ch] text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
        The console could not reach the platform data just now, so it is not
        showing you a queue it cannot vouch for. Reload in a moment.
      </p>
    </div>
  );
}

/** Label and value, stacked on a phone, paired on wider screens. */
export function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-t border-[var(--nf-border-subtle)] py-2 sm:flex-row sm:gap-4 sm:py-2.5">
      <dt className="shrink-0 text-[0.75rem] uppercase tracking-wide text-[var(--nf-content-muted)] sm:w-44">
        {label}
      </dt>
      <dd className="min-w-0 break-words text-[0.875rem] text-[var(--nf-content-primary)]">
        {value === null || value === "" ? (
          <span className="text-[var(--nf-content-muted)]">Not given</span>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

export function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-4 first:mt-0">
      <h3 className="text-[0.75rem] font-bold uppercase tracking-wide text-[var(--nf-content-muted)]">
        {title}
      </h3>
      <dl className="mt-1">{children}</dl>
    </section>
  );
}

/** One line of the admission checklist: a tick, a cross, and the evidence. */
export function CheckRow({ label, pass, detail }: { label: string; pass: boolean; detail: string }) {
  return (
    <li className="flex items-start gap-2.5 border-t border-[var(--nf-border-subtle)] py-2">
      <span
        aria-hidden="true"
        className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full"
        style={pass ? TONE_STYLE.success : TONE_STYLE.warning}
      >
        <UiIcon name={pass ? "verified" : "bell"} size={12} strokeWidth={2.4} />
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block text-[0.8125rem] font-semibold text-[var(--nf-content-primary)]">
          {label}
        </span>
        <span className="block truncate text-[0.75rem] text-[var(--nf-content-muted)]">{detail}</span>
      </span>
      <span className="sr-only">{pass ? "Passes" : "Needs attention"}</span>
    </li>
  );
}
