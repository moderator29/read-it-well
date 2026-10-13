import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { ChargebackCase } from "@/app/admin/chargebacks/ChargebackCase";
import { ConsoleFrame } from "../../bd/ConsoleFrame";
import { LOST_DETAIL, NOW, OPEN_DETAIL } from "../fixtures";

/**
 * One chargeback on the console frame, from fixtures. Default: a lost case
 * still owed, part recovered, with the full timeline and notes open.
 * `?case=open` draws an undecided one read from the audit log (the draft
 * timeline not applied, notes closed).
 */
export const dynamic = "force-dynamic";

export default async function PreviewChargebackCase({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const locale = await getLocale();
  const t = getDictionary(locale);
  const detail = params.case === "open" ? OPEN_DETAIL : LOST_DETAIL;
  return (
    <ConsoleFrame t={t}>
      <ChargebackCase detail={detail} now={NOW} copy={t.chargebacks.desk} locale={locale} />
    </ConsoleFrame>
  );
}
