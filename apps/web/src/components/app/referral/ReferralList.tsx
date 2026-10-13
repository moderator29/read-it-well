import "./rewards.css";
import { intlTag, type Dictionary, type Locale } from "@vallo/i18n/core";
import { ListGroup, ListRow } from "@/components/ui/ListGroup";
import { InitialsTile } from "@/components/ui/InitialsTile";
import { IconPlate } from "@/components/ui/IconPlate";
import { StatusChip, type ChipState } from "@/components/ui/StatusChip";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { countByStage, REFERRAL_STAGES, type ReferralRow, type ReferralStage } from "@/lib/referral/rewards";
import { dayLabel, money } from "./format";
import { fill } from "./money-words";

type Copy = Dictionary["experienceRewards"]["referrals"];

/** The chip each stage is drawn with. A review is pending's look: it is waiting, never an error. */
export const REFERRAL_CHIP: Readonly<Record<ReferralStage, ChipState>> = {
  signing_up: "neutral",
  counting: "pending",
  in_review: "pending",
  earned: "success",
  not_eligible: "neutral",
};

/**
 * THE ONE LINE UNDER A PERSON (D85): where their referral stands, in the
 * founder's words. Signed up and waiting for email confirmation; finishing
 * sign-up; in review until a date; earned (Available, on its way, paid); not
 * eligible with a plain reason. A review never says why. Pure.
 */
export function referralLine(row: ReferralRow, copy: Copy, locale: Locale): string {
  const joined = fill(copy.joinedOn, { date: dayLabel(row.joinedOn, locale) });
  const earned = row.rewardMinor ? fill(copy.earnedAmount, { amount: money(row.rewardMinor, locale) }) : null;
  switch (row.stage) {
    case "signing_up":
      return `${joined} · ${copy.waiting[row.waitingOn ?? "other_step"]}`;
    case "counting":
      return `${joined} · ${copy.waiting[row.waitingOn ?? "counting"]}`;
    case "in_review": {
      const review = row.reviewUntil ? fill(copy.inReviewUntil, { date: dayLabel(row.reviewUntil, locale) }) : copy.inReviewChecking;
      return earned ? `${earned} · ${review}` : review;
    }
    case "earned": {
      const state = copy.earned[row.earnedState ?? "available"];
      return earned ? `${earned} · ${state}` : state;
    }
    case "not_eligible":
      return copy.notEligible[row.notEligibleReason ?? "reversed"];
  }
}

/** The rows alone: for the dashboard and the invite hub, which show the first few. Server-safe. */
export function ReferralRows({
  rows,
  copy,
  locale,
  label,
  more,
}: {
  rows: readonly ReferralRow[];
  copy: Copy;
  locale: Locale;
  label: string;
  /** A last row that opens the full list, when there are more than shown. */
  more?: { href: string; label: string } | null;
}) {
  return (
    <ListGroup label={label} labelAs="h2">
      {rows.map((row) => (
        <ListRow
          key={row.id}
          leading={
            row.firstName?.trim() ? (
              <InitialsTile name={row.firstName} />
            ) : (
              <IconPlate shape="round" size="sm">
                <UiIcon name="user" size={20} />
              </IconPlate>
            )
          }
          title={row.firstName?.trim() || copy.unnamed}
          sub={referralLine(row, copy, locale)}
          status={<StatusChip state={REFERRAL_CHIP[row.stage]}>{copy.status[row.stage]}</StatusChip>}
          data-testid={`rewards-referral-${row.id}`}
        />
      ))}
      {more ? <ListRow href={more.href} title={more.label} chevron data-testid="rewards-referrals-more" /> : null}
    </ListGroup>
  );
}

/**
 * THE PEOPLE A MEMBER INVITED, AND WHERE EACH ONE STANDS (D51, D85).
 *
 * A summary of the five stages, then one row per person: first name at most
 * (what the invite door already shows), the stage as a word, a shape and a
 * colour, and the line that says what it waits on or what it earned. Then
 * what each stage means.
 *
 * WHAT IT NEVER SHOWS. No risk reason, check, score or fraud signal: the row
 * type has no field for one, so a referral a person is looking at says only
 * that. No second level: every row is somebody this member invited, never
 * anybody they invited. No comparison with any other member. Server-safe.
 */
export function ReferralList({ rows, copy, locale }: { rows: readonly ReferralRow[]; copy: Copy; locale: Locale }) {
  const counts = countByStage(rows);
  const number = new Intl.NumberFormat(intlTag[locale]);
  return (
    <div className="nf-rewards" data-testid="rewards-referrals">
      <section aria-label={copy.summary}>
        <dl className="nf-rewards-counts" data-testid="rewards-referral-counts">
          {REFERRAL_STAGES.map((stage) => (
            <div key={stage} data-status={stage}>
              <dt>{copy.status[stage]}</dt>
              <dd>{number.format(counts[stage])}</dd>
            </div>
          ))}
        </dl>
      </section>

      <ReferralRows rows={rows} copy={copy} locale={locale} label={copy.title} />

      <section aria-labelledby="rewards-meanings">
        <h2 id="rewards-meanings" className="nf-rewards-figures__label">
          {copy.meaningsLabel}
        </h2>
        <dl className="nf-rewards-meanings mt-sm">
          {REFERRAL_STAGES.map((stage) => (
            <div key={stage}>
              <dt>{copy.status[stage]}</dt>
              <dd>{copy.meaning[stage]}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
