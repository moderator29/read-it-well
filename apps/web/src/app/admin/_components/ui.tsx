import type { CSSProperties, ReactNode } from "react";
import { formatDate, type Dictionary, type Locale } from "@vallo/i18n";
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
 * Vallo, not a separate product.
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

/*
 * `WARNING_WASH` IS GONE, AND ITS ABSENCE IS THE POINT.
 *
 * It was `--nf-state-warning-surface`, and `--nf-state-warning` is defined as
 * `var(--nf-cyan-400)` while `--nf-status-pending` is defined as
 * `var(--nf-state-warning)`. They are the same value under two names. Both
 * users of this wash in this file were FAILURES - a queue that could not be
 * read, and an admission check that did not pass - so both were drawn in the
 * colour the product reserves for "still going through". Neither is. If a
 * genuinely in-flight console state ever needs a wash, it takes the pending
 * token by its own name rather than borrowing the warning one.
 */

/** Nothing has happened here. Not good news, not bad news, not a state. */
const NEUTRAL_WASH: CSSProperties = {
  background: "var(--nf-surface-inset)",
  color: "var(--nf-content-muted)",
};

const DANGER_WASH: CSSProperties = {
  background: "var(--nf-state-error-surface)",
  color: "var(--nf-state-error)",
};

/** What a metric tile is telling you. Not a status; a temperature. */
export type StatTone = "neutral" | "warning" | "danger" | "success";

/**
 * The tone, in words, for anybody who cannot see the colour or the rule.
 *
 * English, because `t.admin.common` has no keys for these and adding them
 * belongs to whoever owns the dictionary. It is stated here rather than left
 * out, because the alternative is a flagged figure that is flagged only to
 * people who can see hue.
 */
const STAT_TONE_WORD: Record<StatTone, string> = {
  neutral: "",
  warning: "needs a look",
  danger: "needs action",
  success: "healthy",
};

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
  /**
   * A metric tile.
   *
   * THE TONE WAS CARRIED IN COLOUR AND NOTHING ELSE. A `danger` stat was a rose
   * number and a `warning` stat a cyan one, with nothing else different, and on
   * the money and payments screens these are the headline figures an operator
   * scans. Rule 13: colour is never the only signal.
   *
   * A left rule in the tone answers it, because it survives greyscale, it costs
   * no layout, and it reads down a row of tiles as a shape rather than a hue.
   * The screen-reader name says the same thing in words, so a figure that is
   * flagged is flagged in three ways and not one.
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
    const flagged = tone !== "neutral";
    return (
      <div
        className={`nf-card p-card${flagged ? " border-l-4" : ""}`}
        style={flagged ? { borderLeftColor: STAT_VALUE_COLOUR[tone] } : undefined}
      >
        <p className="nf-overline">{label}</p>
        <p
          className="nf-numeric nf-h3 mt-inline-tight"
          style={{ color: STAT_VALUE_COLOUR[tone] }}
        >
          {value}
          {flagged && <span className="sr-only"> {STAT_TONE_WORD[tone]}</span>}
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

  /**
   * An empty queue, and there are TWO of those.
   *
   * This drew a green circle with a verified tick and the words "all clear" on
   * every one of the nineteen console destinations. Checked against the
   * database: `agent_applications` 0, `reports` 0, `risk_alerts` 0,
   * `message_flags` 0, `escrows` 0, `bookings` 0, `transactions` 0,
   * `payout_accounts` 0, `agent_documents` 0. Not one of those tables has ever
   * held a row. So on day one an operator opens the console and is congratulated
   * nineteen times for clearing work that never arrived.
   *
   * "Nothing has ever arrived here" and "you have cleared everything" are
   * different facts and the second one is a CLAIM. A tick is earned by somebody
   * having done something; it does not belong on a queue nobody has ever used.
   *
   * The never-used state is neutral, carries no tick, and says what will appear
   * here and what puts it there, because that is the primary state of the
   * entire console today and it deserves to be designed as such rather than
   * inherited from the good-news one.
   *
   * `everHadRows` defaults to true so the nineteen call sites that have not
   * been told which state they are in keep the behaviour they had, and a page
   * that can answer the question opts into the honest one.
   */
  function QueueEmpty({
    title,
    body,
    everHadRows = true,
  }: {
    title: string;
    body: string;
    /** False when this table has never held a row for this queue. */
    everHadRows?: boolean;
  }) {
    return (
      <div className="nf-card p-card-lg text-center">
        <span
          className="mx-auto grid h-14 w-14 place-items-center rounded-full"
          style={everHadRows ? SUCCESS_WASH : NEUTRAL_WASH}
        >
          <UiIcon name={everHadRows ? "verified" : "history"} size={28} />
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
      /*
        A READ FAILURE IS ROSE AND IT IS A CROSS.

        This was a BELL in a cyan wash. `WARNING_WASH` is
        `--nf-state-error-surface`'s cyan sibling, `--nf-state-warning-surface`,
        and `--nf-state-warning` is the same token `--nf-status-pending` is
        defined as, so a queue that could not load was drawn in the colour that
        means "in flight" with a glyph that means "you have a notification".
        `DANGER_WASH` was already in this file and was used by one component.
      */
      <div className="nf-card p-card-lg text-center">
        <span
          className="mx-auto grid h-14 w-14 place-items-center rounded-full"
          style={DANGER_WASH}
        >
          <UiIcon name="close" size={28} />
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
        {/* Rose and a cross, for the same reason as `QueueUnavailable`: a
            check that did not pass is a failure, and a bell in the pending
            colour said neither. */}
        <span
          aria-hidden="true"
          className="grid h-6 w-6 shrink-0 place-items-center rounded-full"
          style={pass ? SUCCESS_WASH : DANGER_WASH}
        >
          <UiIcon name={pass ? "verified" : "close"} size={14} />
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="nf-body-sm block font-semibold text-content">{label}</span>
          {/* THE EVIDENCE IS NEVER CLIPPED. This row's own name for `detail` is
              the evidence, and it carried `truncate`: an operator deciding
              whether to admit an agent could not read the thing the decision
              rests on. */}
          <span className="nf-caption block [overflow-wrap:anywhere]">{detail}</span>
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
