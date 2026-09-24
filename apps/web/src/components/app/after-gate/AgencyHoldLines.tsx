import { formatMoney, getDictionary, type Locale } from "@vallo/i18n";
import { agencySplit } from "@/lib/after-gate/money-holds";
import { agencyHoldIsOpen } from "@/lib/after-gate/money-holds-flags";
import { formatMoneyDate } from "@/lib/money/dates";

/**
 * V-56, to the boundary. The two lines under a move-in total once the agency
 * fee is held: what the agent is paid now, and what is set aside until the
 * keys. Renders NOTHING while `rent_agency_hold` or `held_payments` is off,
 * which is today, because the charge does not yet split: printing the lines
 * before the money moves that way would be a claim the ledger contradicts.
 */
export async function AgencyHoldLines({
  totalMinor,
  agencyMinor,
  moveIn,
  agentName,
  locale,
}: {
  totalMinor: number;
  agencyMinor: number | null;
  moveIn: string;
  agentName: string | null;
  locale: Locale;
}) {
  if (!(await agencyHoldIsOpen())) return null;
  const split = agencySplit({ totalMinor, agencyMinor, moveIn });
  if (!split) return null;
  const copy = getDictionary(locale).afterTheGate.holds;
  const name = agentName ?? copy.theAgent;
  return (
    <div className="mt-sm grid gap-2xs" data-testid="agency-hold-lines">
      <p className="nf-body-sm nf-numeric">{copy.paidNow.replace("{amount}", formatMoney(split.nowMinor, locale)).replace("{name}", name)}</p>
      <p className="nf-body-sm nf-numeric">
        {copy.setAside
          .replace("{amount}", formatMoney(split.heldMinor, locale))
          .replace("{date}", formatMoneyDate(split.releasesOn, locale) ?? split.releasesOn)}
      </p>
    </div>
  );
}
