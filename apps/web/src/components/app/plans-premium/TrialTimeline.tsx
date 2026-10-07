import "./plans-premium.css";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { trialDates } from "./plan-rules";

/**
 * THE THREE-STEP TRIAL TIMELINE (north star 15.6, founder directive D21,
 * reference 7034 and the earlier-round 42). REQUIRED WHEREVER A TRIAL EXISTS.
 *
 *   Today            everything unlocked, nothing charged
 *   The day before   we remind you          <- the honest step most omit
 *   The last day     the trial ends; cancelling before it costs nothing
 *
 * The labels are frame words; each step's sentence is a MONEY SENTENCE the
 * caller reads from `lib/money/copy.ts` (Session 2, request W7-R5), because
 * "nothing is charged today" is a claim about money. The dates are computed
 * from the server's end date (`trialDates`), the reminder always the day
 * before; with no date, the step says so rather than inventing one.
 *
 * Drawn as a vertical path: a filled node for today (it is happening), hollow
 * nodes for the two to come, joined by a hairline. State by shape and words,
 * never colour alone. Server-safe, no motion: it is a statement of what will
 * happen, read once, and nothing about it changes while it is read.
 */
export function TrialTimeline({
  endsOn,
  locale,
  lines,
  copy,
}: {
  /** The trial's last day, YYYY-MM-DD, from the server. */
  endsOn: string | null;
  locale: string;
  /** One money sentence per step, from `lib/money/copy.ts`. */
  lines: { today: string; remind: string; end: string };
  copy: { trialTitle: string; today: string; remindStep: string; endStep: string; dateUnknown: string };
}) {
  const tag = locale === "en" ? "en-NG" : locale;
  const dates = trialDates(endsOn);
  const day = (iso: string | null) =>
    iso
      ? new Intl.DateTimeFormat(tag, { weekday: "short", day: "numeric", month: "long", timeZone: "Africa/Lagos" }).format(
          new Date(`${iso}T12:00:00Z`),
        )
      : copy.dateUnknown;

  const steps: { key: string; icon: UiIconName; label: string; when: string | null; line: string; now: boolean }[] = [
    { key: "today", icon: "circle-check", label: copy.today, when: null, line: lines.today, now: true },
    { key: "remind", icon: "bell", label: copy.remindStep, when: day(dates.remindOn), line: lines.remind, now: false },
    { key: "end", icon: "calendar-check", label: copy.endStep, when: day(dates.endsOn), line: lines.end, now: false },
  ];

  return (
    <section className="nf-trial">
      <h2 className="nf-trial__title">
        {copy.trialTitle}
      </h2>
      <ol className="nf-trial__steps">
        {steps.map((step) => (
          <li key={step.key} className="nf-trial__step" data-now={step.now ? "" : undefined}>
            <span className="nf-trial__node" aria-hidden="true">
              <UiIcon name={step.icon} size={16} />
            </span>
            <div className="nf-trial__text">
              <p className="nf-trial__label">
                {step.label}
                {step.when ? <span className="nf-trial__when nf-numeric">{step.when}</span> : null}
              </p>
              <p className="nf-trial__line">{step.line}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
