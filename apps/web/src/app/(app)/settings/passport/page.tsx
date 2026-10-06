import type { Metadata } from "next";
import { formatDate, getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState, TYPE } from "@/components/app/Screen";
import { ButtonLink } from "@/components/ui/Button";
import { RowLink, SettingsGroup } from "@/components/app/account/rows";
import { SettingsLede } from "@/components/app/account/SettingsLede";
import { PassportCredential } from "@/components/app/account/PassportCredential";
import { PassportShareButton } from "@/components/app/account/PassportShareButton";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { gateFirstRun } from "@/components/app/feature-onboarding/first-run-store";
import { resolveSession } from "@/lib/actions/session";
import { sharedInLine } from "@/lib/trust/passport";
import { readMyPassport } from "@/lib/trust/passport-read";
import { PassportSwitch } from "./PassportSwitch";
import { factValue, factViews, type FactKey } from "./passport-facts";
import { readPhoneConfirmedAt } from "./passport-reads";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getDictionary(await getLocale()).trustVisible.passport.title };
}

const FACT_ICON: Record<FactKey, UiIconName> = {
  identity: "id-card",
  phone: "phone",
  attended: "key",
  tenancies: "house",
  since: "calendar-booking",
};

/**
 * SETTINGS, RENTER PASSPORT (V-100), REBUILT AS THE SPACE PASSPORT (W6; north
 * star 10 F and 16.6). Off by default, never asked for.
 *
 * ONE SUBJECT: the credential (the screen's one Island). Under it, what it
 * says: each fact with its DATE where Vallo holds one, never a tick, and each
 * one opens an inner page with its own evidence (D25). Then the one switch, and
 * what is shown where. The tier slot in the credential is empty until a tier
 * exists (see `PassportCredential`).
 *
 * STREAKS: none drawn. D17 wants on-time rent and the other standing streaks on
 * the passport, but Session 2's counting does not exist (no table, no function),
 * and a streak with no data behind it would be invented standing. Request
 * R-W6-4 asks for it; the row slot is a one-line addition when it lands.
 *
 * States: signed out (sign in), a failed read (said, nothing changed), and the
 * page, with an honest empty line when Vallo has recorded nothing yet. Loading
 * is `loading.tsx` beside this file.
 */
export default async function PassportSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const legacy = t.trustVisible.passport;
  const copy = t.experienceAccount.passport;
  const lede = t.experienceAccount.settings.lede;
  const session = await resolveSession();
  const header = <PageHeader title={legacy.title} subtitle={legacy.subtitle} fallback="/settings" />;

  if (session.state !== "signed-in") {
    return (
      <div className="mx-auto max-w-2xl">
        {header}
        <EmptyState
          icon="user-verified"
          art="id-check"
          title={legacy.signedOut}
          body={legacy.lede}
          action={
            <ButtonLink href="/sign-in?next=%2Fsettings%2Fpassport" variant="primary" size="lg">
              {legacy.signIn}
            </ButtonLink>
          }
        />
      </div>
    );
  }

  /* THE PASSPORT'S FIRST RUN (north star 14.1, D11): once, after the sign-in
     check and before anything is read. Fails towards drawing the page. */
  await gateFirstRun("passport", "/settings/passport", await searchParams);

  const [mine, phoneAt] = await Promise.all([readMyPassport(), readPhoneConfirmedAt()]);
  if (!mine) {
    return (
      <div className="mx-auto max-w-2xl">
        {header}
        <p role="status" className={TYPE.body}>
          {legacy.readFailed}
        </p>
      </div>
    );
  }

  const views = factViews(mine.facts, phoneAt);
  const since = mine.facts.memberSince
    ? copy.credentialSince.replace(
        "{month}",
        formatDate(new Date(mine.facts.memberSince), locale, { month: "long", year: "numeric", timeZone: "Africa/Lagos" }),
      )
    : null;

  return (
    <div className="mx-auto max-w-2xl">
      {header}
      <SettingsLede label={lede.what} what={lede.passport.what} who={lede.passport.who} />
      <div className="space-y-block">
        <PassportCredential
          copy={copy}
          enabled={mine.enabled}
          since={since}
          action={
            mine.enabled ? <PassportShareButton copy={copy} dismissLabel={t.experienceUi.notNow} /> : undefined
          }
        />

        <SettingsGroup label={copy.factsLabel} note={views.length === 0 ? undefined : `${copy.factsLede} ${copy.cardLede}`}>
          {views.length === 0 ? (
            <p className={`${TYPE.body} px-md py-sm`} data-testid="passport-preview-empty">
              {copy.factsEmpty}
            </p>
          ) : (
            views.map((view) => (
              <RowLink
                key={view.key}
                href={`/settings/passport/${view.key}`}
                glyph={<UiIcon name={FACT_ICON[view.key]} size={20} />}
                label={copy.facts[view.key].title}
                value={factValue(view, locale) ?? undefined}
                testId={`passport-fact-${view.key}`}
              />
            ))
          )}
        </SettingsGroup>

        <PassportSwitch
          key={String(mine.enabled)}
          copy={copy}
          legacy={legacy}
          initialEnabled={mine.enabled}
          sharedLine={mine.enabled ? sharedInLine(mine.sharedIn, legacy) : null}
        />
      </div>
    </div>
  );
}
