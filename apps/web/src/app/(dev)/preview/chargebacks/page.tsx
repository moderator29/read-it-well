import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { ChargebacksDesk } from "@/app/admin/chargebacks/ChargebacksDesk";
import { readChargebackQuery } from "@/lib/admin/reads/chargebacks-model";
import { readPage } from "@/lib/admin/reads/money-derive";
import { ConsoleFrame } from "../bd/ConsoleFrame";
import { DESK, NOW } from "./fixtures";

/**
 * Money > Chargebacks on the console frame, from fixture rows on the pinned
 * Tuesday 13 October 2026. The desk is `ChargebacksDesk` itself, fed what
 * `getChargebackDesk` would return; the query string drives it as on the real
 * desk (`?state=lost`, `?age=week`, `?min=100000`). `?empty=1` draws a desk
 * with no chargebacks, `?down=1` one whose read failed.
 */
export const dynamic = "force-dynamic";

export default async function PreviewChargebacks({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const locale = await getLocale();
  const t = getDictionary(locale);
  const empty = params.empty === "1";
  const read =
    params.down === "1"
      ? ({ state: "unavailable" } as const)
      : ({ state: "ok", data: empty ? { rows: [], counts: { ...DESK.counts, opened: 0, evidence_requested: 0, evidence_submitted: 0, won: 0, lost: 0, all: 0, owed: 0, undecided: 0 } } : DESK } as const);
  return (
    <ConsoleFrame t={t}>
      <ChargebacksDesk query={readChargebackQuery(params)} read={read} page={readPage(params.page)} now={NOW} copy={t.chargebacks.desk} locale={locale} />
    </ConsoleFrame>
  );
}
