import type { CSSProperties, ReactNode } from "react";
import { formatDate, type Dictionary, type Locale } from "@naijafinds/i18n";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { StatusPill, toneForStatus, type StatusTone } from "@/components/ui/StatusPill";
import { fill, type AdminCommon } from "./copy";

/**
 * The console's shared furniture.
 *
 * Server-safe on purpose: no hooks, no client boundary, so a queue page can
 * render its whole list on the server and only hand the decision controls to
 * the browser. Everything here reuses the platform's own glass, chip and badge
 * classes rather than inventing an admin look, because the console is part of
 * RentMe, not a separate product.
 *
 * The pieces are handed out by `adminUi(t, locale)` rather than exported one by
 * one. Every one of them carries copy, and a page that had to thread "Not
 * given" through twenty `DetailRow` call sites would sooner or later miss one.
 * One call at the top of a page binds the locale and the dictionary to all of
 * them at once, which is what keeps a queue from ending up half translated.
 *
 * ----------------------------------------------------------------------------
 * WHY THIS FILE MOVED TO THE SPACING AND TYPE SCALES FIRST.
 *
 * Every screen in the console draws its heading, its empty state, its detail
 * rows and its metric tiles from here. Twenty pages were carrying `mb-5`,
 * `p-4`, `gap-3` and `text-[0.875rem]` because those were the values this file
 * handed them, so the console's rhythm was set in one place and it was set
 * against no scale at all. Moving this file moves all twenty at once, and every
 * page that stops hand-rolling a tile stops inventing a fifth padding value for
 * it.
 *
 * The type went UP a tier across the board. `text-[0.875rem]` on a detail value
 * and `text-[0.75rem]` on its label is a reading size chosen for a dense table,
 * and this console is not a dense table: it is where somebody decides whose
 * money moves, at eleven at night, and the old sizes made that decision harder
 * to read than the marketing pages that carry no consequence at all. Detail
 * values are `nf-body` now, labels are `nf-overline`, and the icons that go
 * with them grew to match.
 * ----------------------------------------------------------------------------
 */

/**
 * The console no longer owns a status vocabulary.
 *
 * `Tone`, `statusTone` and `TONE_STYLE` used to live here, and were one of four
 * competing implementations across the platform, so the same MORE_INFO_REQUIRED
 * row was one colour in the admin queue and another in the agent's workspace.
 * Everything now routes through `toneForStatus` and `<StatusPill>`, which is the
 * single map; the console's job is to name a status, not to colour it.
 *
 * The two washes below are NOT a status vocabulary. They tint the round glyph
 * on an empty-queue panel and a checklist row, where the meaning is "this is
 * fine" / "this needs a look" and no status is being reported at all.
 */
const SUCCESS_WASH: CSSProperties = {
  background: "var(--nf-state-success-surface)",
  color: "var(--nf-state-success)",
};

const WARNING_WASH: CSSProperties = {
  background: "var(--nf-state-warning-surface)",
  color: "var(--nf-state-warning)",
};

const DANGER_WASH: CSSProperties = {
  background: "var(--nf-state-error-surface)",
  color: "var(--nf-state-error)",
};

/** What a metric tile is telling you. Not a status; a temperature. */
export type StatTone = "neutral" | "warning" | "danger" | "success";

const STAT_VALUE_COLOUR: Record<StatTone, string> = {
  neutral: "var(--nf-content-primary)",
  warning: "var(--nf-state-warning)",
  danger: "var(--nf-state-error)",
  success: "var(--nf-state-success)",
};

export type AdminUi = ReturnType<typeof adminUi>;

export function adminUi(t: Dictionary, locale: Locale) {
  const c: AdminCommon = t.admin.common;
  // The status vocabulary is keyed by the machine values the queries return,
  // which arrive as plain strings, so the lookup is widened deliberately and
  // falls back to the raw value rather than to a blank chip.
  const statusNames = c.status as Record<string, string | undefined>;

  /**
   * Lagos time, always, so the server and the browser never disagree on a
   * date, and in the reader's language so the month reads to them. The shared
   * formatter does the work; nothing here reimplements one.
   */
  function when(iso: string | null): string {
    if (!iso) return c.notRecorded;
    const parsed = Date.parse(iso);
    if (Number.isNaN(parsed)) return c.notRecorded;
    return formatDate(new Date(parsed), locale, {
      timeZone: "Africa/Lagos",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  /**
   * A calendar date with no clock on it.
   *
   * A check-in is a day, not a moment. Running one through `when` above prints
   * "01:00" beside it, because a bare date parses as UTC midnight and Lagos is
   * an hour ahead, which reads to an operator as a time the guest agreed to.
   * Anchoring at midday Lagos removes the question entirely.
   */
  function day(iso: string | null): string {
    if (!iso) return c.notRecorded;
    const parsed = Date.parse(iso.length <= 10 ? `${iso}T12:00:00+01:00` : iso);
    if (Number.isNaN(parsed)) return c.notRecorded;
    return formatDate(new Date(parsed), locale, {
      timeZone: "Africa/Lagos",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  /** Human wording for the canonical machine values. */
  function statusLabel(status: string): string {
    return statusNames[status] ?? status;
  }

  function StatusChip({
    status,
    label,
    tone,
  }: {
    status?: string;
    label?: string;
    tone?: StatusTone;
  }) {
    return (
      <StatusPill tone={tone ?? toneForStatus(status ?? "")} className="shrink-0">
        {label ?? statusLabel(status ?? "")}
      </StatusPill>
    );
  }

  /** The heading every queue page opens with. */
  function QueueHeader({
    title,
    lede,
    count,
  }: {
    title: string;
    lede: string;
    count?: number;
  }) {
    return (
      <header className="mb-heading">
        <div className="flex flex-wrap items-center gap-inline">
          <h1 className="nf-h1">{title}</h1>
          {typeof count === "number" && count > 0 && (
            <span className="nf-badge nf-badge--brand nf-numeric">
              {fill(c.waiting, { count })}
            </span>
          )}
        </div>
        <p className="nf-lede mt-row max-w-[68ch]">{lede}</p>
      </header>
    );
  }

  /**
   * A section of a page, with its heading and the air under it.
   *
   * Every console page was writing `<h2 className="mb-2 text-[1rem] ...">` by
   * hand and then a list under it, which is how one page ended up with 8px of
   * air under a heading and the next with 12px. One interval, named for the
   * relationship it expresses, decided once.
   */
  function Section({
    title,
    hint,
    action,
    children,
  }: {
    title: string;
    hint?: string;
    action?: ReactNode;
    children: ReactNode;
  }) {
    return (
      <section className="nf-section--tight">
        <div className="flex flex-wrap items-baseline justify-between gap-inline">
          <h2 className="nf-h4">{title}</h2>
          {action}
        </div>
        {hint && <p className="nf-body-sm mt-inline-tight max-w-[68ch] text-content-2">{hint}</p>}
        <div className="mt-heading">{children}</div>
      </section>
    );
  }

  /**
   * One number, named, with a temperature.
   *
   * The escrow, money and payments screens each hand-rolled this tile with
   * their own padding and their own type sizes. A number an operator is meant
   * to scan is the one thing on these pages that should be big, so the value
   * is `nf-h3` rather than the 1.25rem the hand-rolled versions used.
   */
  function Stat({
    label,
    value,
    hint,
    tone = "neutral",
  }: {
    label: string;
    value: string;
    hint?: string;
    tone?: StatTone;
  }) {
    return (
      <div className="nf-card p-card">
        <p className="nf-overline">{label}</p>
        <p
          className="nf-numeric nf-h3 mt-inline-tight"
          style={{ color: STAT_VALUE_COLOUR[tone] }}
        >
          {value}
        </p>
        {hint && <p className="nf-caption mt-inline-tight">{hint}</p>}
      </div>
    );
  }

  /** A row of metric tiles, which is how every money screen opens. */
  function StatRow({ children }: { children: ReactNode }) {
    return (
      <div className="mb-block grid gap-row sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    );
  }

  /** A clear queue is good news and should read like it. */
  function QueueEmpty({ title, body }: { title: string; body: string }) {
    return (
      <div className="nf-card p-card-lg text-center">
        <span
          className="mx-auto grid h-14 w-14 place-items-center rounded-full"
          style={SUCCESS_WASH}
        >
          <UiIcon name="verified" size={28} />
        </span>
        <p className="nf-h4 mt-group">{title}</p>
        <p className="nf-body mx-auto mt-row max-w-[48ch] text-content-2">{body}</p>
      </div>
    );
  }

  /**
   * The honest alternative to a fake empty state: when the platform data cannot
   * be reached, say so rather than showing a queue that claims to be clear.
   */
  function QueueUnavailable() {
    return (
      <div className="nf-card p-card-lg text-center">
        <span
          className="mx-auto grid h-14 w-14 place-items-center rounded-full"
          style={WARNING_WASH}
        >
          <UiIcon name="bell" size={28} />
        </span>
        <p className="nf-h4 mt-group">{c.unavailableTitle}</p>
        <p className="nf-body mx-auto mt-row max-w-[48ch] text-content-2">{c.unavailableBody}</p>
      </div>
    );
  }

  /**
   * A panel that says something is wrong, rather than that nothing is there.
   *
   * `QueueEmpty` is good news and `QueueUnavailable` is a read failure. Neither
   * fits "the ledger is short by 4,000 naira", which is a finding: real,
   * readable, and the reason somebody is on this screen.
   */
  function QueueAlarm({ title, body }: { title: string; body: string }) {
    return (
      <div className="nf-card p-card-lg text-center">
        <span
          className="mx-auto grid h-14 w-14 place-items-center rounded-full"
          style={DANGER_WASH}
        >
          <UiIcon name="shield-stop" size={28} />
        </span>
        <p className="nf-h4 mt-group">{title}</p>
        <p className="nf-body mx-auto mt-row max-w-[48ch] text-content-2">{body}</p>
      </div>
    );
  }

  /** Label and value, stacked on a phone, paired on wider screens. */
  function DetailRow({ label, value }: { label: string; value: ReactNode }) {
    return (
      <div className="flex flex-col gap-inline-tight border-t border-[var(--nf-border-subtle)] py-row sm:flex-row sm:gap-group">
        <dt className="nf-overline shrink-0 sm:w-48">{label}</dt>
        <dd className="nf-body min-w-0 break-words text-content">
          {value === null || value === "" ? (
            <span className="text-muted">{c.notGiven}</span>
          ) : (
            value
          )}
        </dd>
      </div>
    );
  }

  function DetailSection({ title, children }: { title: string; children: ReactNode }) {
    return (
      <section className="mt-group first:mt-0">
        <h3 className="nf-overline">{title}</h3>
        <dl className="mt-inline">{children}</dl>
      </section>
    );
  }

  /** One line of the admission checklist: a tick, a cross, and the evidence. */
  function CheckRow({ label, pass, detail }: { label: string; pass: boolean; detail: string }) {
    return (
      <li className="flex items-start gap-inline border-t border-[var(--nf-border-subtle)] py-row">
        <span
          aria-hidden="true"
          className="grid h-6 w-6 shrink-0 place-items-center rounded-full"
          style={pass ? SUCCESS_WASH : WARNING_WASH}
        >
          <UiIcon name={pass ? "verified" : "bell"} size={14} />
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="nf-body-sm block font-semibold text-content">{label}</span>
          <span className="nf-caption block truncate">{detail}</span>
        </span>
        <span className="sr-only">{pass ? c.passes : c.needsAttention}</span>
      </li>
    );
  }

  return {
    when,
    day,
    statusLabel,
    StatusChip,
    QueueHeader,
    Section,
    Stat,
    StatRow,
    QueueEmpty,
    QueueUnavailable,
    QueueAlarm,
    DetailRow,
    DetailSection,
    CheckRow,
  };
}
