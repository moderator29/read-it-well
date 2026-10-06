import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { forLanguage } from "@/components/app/account/settings-copy";
import { PageHeader } from "@/components/app/PageHeader";
import { LanguageRow } from "@/components/app/account/SettingsGroups";
import { RowValue, SettingsGroup } from "@/components/app/account/rows";
import { formatMoneyDate } from "@/lib/money/dates";
import {
  REGION_CURRENCY,
  REGION_CURRENCY_SUB,
  REGION_CURRENCY_VALUE,
  REGION_DATES,
  REGION_DATES_SUB,
  REGION_LANGUAGE,
  REGION_MONEY,
  REGION_NUMBERS,
  REGION_NUMBERS_SUB,
  REGION_SUB,
  REGION_TITLE,
} from "@/lib/settings/region-copy";

export const metadata: Metadata = { title: REGION_TITLE };
/* Today's date is printed, so the page is rendered per request. */
export const dynamic = "force-dynamic";

/**
 * /settings/region (R3-16): the language, and how money and dates are
 * displayed, instead of a read-only "₦ NGN" with no explanation.
 *
 * The currency is a fact, not a preference: every price is set and paid in
 * naira, and a converted view needs a real, timestamped rate (FL section 4.10,
 * Session 2's multi-currency model; C2 REQUEST 12). So it is stated, with the
 * reason, and there is no control that would pretend otherwise. The date line
 * prints today in the member's language and Lagos time, which is the format
 * every money screen uses.
 */
export default async function RegionSettingsPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const today = formatMoneyDate(new Date(), locale) ?? "";
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={REGION_TITLE} subtitle={REGION_SUB} fallback="/settings" />
      <section id="settings-language" className="mb-block scroll-mt-28">
        <SettingsGroup label={REGION_LANGUAGE}>
          <LanguageRow t={forLanguage(t)} current={locale} />
        </SettingsGroup>
      </section>
      <section id="settings-money-display" className="scroll-mt-28">
        <SettingsGroup label={REGION_MONEY}>
          <RowValue icon="banknote" label={REGION_CURRENCY} sub={REGION_CURRENCY_SUB} value={REGION_CURRENCY_VALUE} testId="region-currency" />
          <RowValue icon="calendar-check" label={REGION_DATES} sub={`${REGION_DATES_SUB} ${today}.`} testId="region-dates" />
          <RowValue icon="coins" label={REGION_NUMBERS} sub={REGION_NUMBERS_SUB} />
        </SettingsGroup>
      </section>
    </div>
  );
}
