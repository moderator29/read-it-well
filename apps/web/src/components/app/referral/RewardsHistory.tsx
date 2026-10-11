import "./rewards.css";
import type { Dictionary, Locale } from "@vallo/i18n/core";
import { ListGroup, ListRow } from "@/components/ui/ListGroup";
import { IconPlate } from "@/components/ui/IconPlate";
import { StatusChip, type ChipState } from "@/components/ui/StatusChip";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { entryDirection, newestFirst, type RewardsEntry, type RewardsEntryKind } from "@/lib/referral/rewards";
import { momentLabel, money, monthOf } from "./format";

type Copy = Dictionary["experienceRewards"]["history"];

const GLYPH: Readonly<Record<RewardsEntryKind, UiIconName>> = {
  referral: "ticket",
  bonus: "gift",
  withdrawal: "bank",
  reversal: "repost",
};

const STATE_CHIP: Readonly<Record<RewardsEntry["state"], ChipState>> = {
  done: "success",
  processing: "pending",
  failed: "failed",
};

/**
 * THE REWARDS HISTORY, READ LIKE A STATEMENT (D51).
 *
 * Newest first, grouped by month, one row per movement: what it was, the day,
 * and the amount signed by which way it moved, tabular so a column of figures
 * lines up. A withdrawal also says where it went and the fee the provider
 * read back, so the figure that left the balance and the figure that arrived
 * are both on the row. A state is drawn only where it is not simply done:
 * processing until the provider confirms, or did not go through. Never
 * "successful" before the provider has said so. Server-safe.
 */
export function RewardsHistory({ entries, copy, locale }: { entries: readonly RewardsEntry[]; copy: Copy; locale: Locale }) {
  const groups: { key: string; label: string; rows: RewardsEntry[] }[] = [];
  for (const entry of newestFirst(entries)) {
    const month = monthOf(entry.at, locale);
    const last = groups[groups.length - 1];
    if (last && last.key === month.key) last.rows.push(entry);
    else groups.push({ ...month, rows: [entry] });
  }

  return (
    <div className="nf-rewards" data-testid="rewards-history">
      {groups.map((group) => (
        <ListGroup key={group.key} label={group.label} labelAs="h2">
          {group.rows.map((entry) => {
            const out = entryDirection(entry.kind) === "out";
            const title =
              entry.kind === "referral" && entry.firstName
                ? copy.referralNamed.replace("{name}", entry.firstName)
                : copy.kind[entry.kind];
            const parts = [momentLabel(entry.at, locale)];
            if (entry.withdrawal) {
              parts.push(
                copy.to.replace("{bank}", entry.withdrawal.bankName).replace("{last4}", entry.withdrawal.accountLast4),
                copy.fee.replace("{amount}", money(entry.withdrawal.feeMinor, locale)),
              );
            }
            return (
              <ListRow
                key={entry.id}
                leading={
                  <IconPlate shape="round" size="sm">
                    <UiIcon name={GLYPH[entry.kind]} size={20} />
                  </IconPlate>
                }
                title={title}
                sub={parts.join(" · ")}
                value={
                  <span className="nf-rewards-amount" data-direction={out ? "out" : "in"}>
                    <span className="sr-only">{out ? copy.takenOut : copy.added} </span>
                    <span aria-hidden="true">{out ? "−" : "+"}</span>
                    {money(entry.amountMinor, locale)}
                  </span>
                }
                status={
                  entry.state === "done" ? undefined : (
                    <StatusChip state={STATE_CHIP[entry.state]}>{copy.state[entry.state]}</StatusChip>
                  )
                }
                data-testid={`rewards-entry-${entry.id}`}
              />
            );
          })}
        </ListGroup>
      ))}
    </div>
  );
}
