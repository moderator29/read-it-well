import "./rewards.css";
import { intlTag, type Dictionary, type Locale } from "@vallo/i18n/core";
import { ListGroup, ListRow } from "@/components/ui/ListGroup";
import { InitialsTile } from "@/components/ui/InitialsTile";
import { IconPlate } from "@/components/ui/IconPlate";
import { StatusChip, type ChipState } from "@/components/ui/StatusChip";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { countByStatus, REFERRAL_STATUSES, type ReferralRow, type ReferralStatus } from "@/lib/referral/rewards";
import { dayLabel } from "./format";

type Copy = Dictionary["experienceRewards"]["referrals"];

/** The chip each status is drawn with. Under review is pending's look: it is waiting, never an error. */
export const REFERRAL_CHIP: Readonly<Record<ReferralStatus, ChipState>> = {
  joined: "neutral",
  pending: "pending",
  under_review: "pending",
  qualified: "success",
};

/**
 * THE PEOPLE A MEMBER INVITED, AND WHERE EACH ONE STANDS (D51).
 *
 * A summary of the four statuses, then one row per person: first name at most
 * (what the invite door already shows), the day they joined, and the status as
 * a word, a shape and a colour. Then what each status means.
 *
 * WHAT IT NEVER SHOWS. No risk reason, check, score or fraud signal: the row
 * type has no field for one, so a referral under review says only that a
 * person is looking. No second level: every row is somebody this member
 * invited, never anybody they invited, so nothing here can read as a downline
 * or a tree. No comparison with any other member. Server-safe.
 */
export function ReferralList({ rows, copy, locale }: { rows: readonly ReferralRow[]; copy: Copy; locale: Locale }) {
  const counts = countByStatus(rows);
  const number = new Intl.NumberFormat(intlTag[locale]);
  return (
    <div className="nf-rewards" data-testid="rewards-referrals">
      <section aria-label={copy.summary}>
        <dl className="nf-rewards-counts" data-testid="rewards-referral-counts">
          {REFERRAL_STATUSES.map((status) => (
            <div key={status} data-status={status}>
              <dt>{copy.status[status]}</dt>
              <dd>{number.format(counts[status])}</dd>
            </div>
          ))}
        </dl>
      </section>

      <ListGroup label={copy.title} labelAs="h2">
        {rows.map((row) => {
          const name = row.firstName?.trim() || copy.unnamed;
          const when =
            row.status === "qualified" && row.qualifiedOn
              ? copy.qualifiedOn.replace("{date}", dayLabel(row.qualifiedOn, locale))
              : copy.joinedOn.replace("{date}", dayLabel(row.joinedOn, locale));
          return (
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
              title={name}
              sub={when}
              status={<StatusChip state={REFERRAL_CHIP[row.status]}>{copy.status[row.status]}</StatusChip>}
              data-testid={`rewards-referral-${row.id}`}
            />
          );
        })}
      </ListGroup>

      <section aria-labelledby="rewards-meanings">
        <h2 id="rewards-meanings" className="nf-rewards-figures__label">
          {copy.meaningsLabel}
        </h2>
        <dl className="nf-rewards-meanings mt-sm">
          {REFERRAL_STATUSES.map((status) => (
            <div key={status}>
              <dt>{copy.status[status]}</dt>
              <dd>{copy.meaning[status]}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
