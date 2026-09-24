import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState, TYPE } from "@/components/app/Screen";
import { ButtonLink } from "@/components/ui/Button";
import { panelClass } from "@/components/ui/Panel";
import { resolveSession } from "@/lib/actions/session";
import { passportLines, sharedInLine } from "@/lib/trust/passport";
import { readMyPassport } from "@/lib/trust/passport-read";
import { PassportSwitch } from "./PassportSwitch";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getDictionary(await getLocale()).trustVisible.passport.title };
}

/**
 * SETTINGS, RENTER PASSPORT (V-100). Off by default, never asked for.
 *
 * States: signed out (sign in), a failed read (said, nothing changed), and the
 * page: the switch, where it is shown, and exactly what a lister would see,
 * with an honest empty line when Vallo has recorded nothing yet. Loading is
 * `loading.tsx` beside this file.
 */
export default async function PassportSettingsPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const copy = t.trustVisible.passport;
  const session = await resolveSession();
  const header = <PageHeader title={copy.title} subtitle={copy.subtitle} fallback="/settings" />;

  if (session.state !== "signed-in") {
    return (
      <div className="mx-auto max-w-2xl">
        {header}
        <EmptyState
          icon="user-verified"
          title={copy.signedOut}
          body={copy.lede}
          action={
            <ButtonLink href="/sign-in?next=%2Fsettings%2Fpassport" variant="primary" size="lg">
              {copy.signIn}
            </ButtonLink>
          }
        />
      </div>
    );
  }

  const mine = await readMyPassport();
  if (!mine) {
    return (
      <div className="mx-auto max-w-2xl">
        {header}
        <p role="status" className={TYPE.body}>
          {copy.readFailed}
        </p>
      </div>
    );
  }

  const lines = passportLines(mine.facts, copy, locale);
  return (
    <div className="mx-auto max-w-2xl">
      {header}
      <div className="space-y-block">
        <p className={TYPE.body}>{copy.lede}</p>
        <PassportSwitch copy={copy} initialEnabled={mine.enabled} />
        {mine.enabled && (
          <p className={TYPE.body} data-testid="passport-shared-in">
            {sharedInLine(mine.sharedIn, copy)}
          </p>
        )}
        <section className={panelClass({ variant: "card", className: "block p-card" })} aria-label={copy.preview}>
          <h2 className={TYPE.rowTitle}>{copy.preview}</h2>
          {lines.length === 0 ? (
            <p className={`${TYPE.body} mt-inline`}>{copy.previewEmpty}</p>
          ) : (
            <ul className="mt-inline grid gap-inline" data-testid="passport-preview">
              {lines.map((line) => (
                <li key={line.key} className={TYPE.body}>
                  {line.text}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
