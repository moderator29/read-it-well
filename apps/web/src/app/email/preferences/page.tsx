import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { ButtonLink } from "@/components/ui/Button";
import { IconPlate } from "@/components/ui/IconPlate";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Logo } from "@/design-system/brand/Logo";
import { readEmailPreferences } from "@/lib/email/preferences";
import { readUnsubscribe, unsubscribeKey } from "@/lib/email/unsubscribe-token";
import { PreferencesForm } from "./PreferencesForm";

export const dynamic = "force-dynamic";

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export async function generateMetadata(): Promise<Metadata> {
  // `metaTitle` was written for this tab and never read: it said English to
  // every reader.
  return {
    title: getDictionary(await getLocale()).publicDoors.prefs.metaTitle,
    robots: { index: false, follow: false },
    referrer: "no-referrer",
  };
}

/**
 * A12. `/email/preferences?token=`: the member's email switches with no
 * sign-in. The signed token from the email's own link is the authority
 * (`lib/email/unsubscribe-token.ts`); the page shows the address masked and
 * nothing else about the account. Security mail is outside it and says so.
 *
 * Outside `(site)` on purpose: no marketing chrome, no links that would
 * carry the token in a Referer, and `referrer: no-referrer` besides.
 */
export default async function EmailPreferencesPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const copy = getDictionary(await getLocale()).publicDoors.prefs;
  const { token = "" } = await searchParams;
  const key = unsubscribeKey();
  const claims = key ? readUnsubscribe(key, token, nowSeconds()) : null;
  const prefs = claims ? await readEmailPreferences(claims.userId) : null;

  return (
    <main id="main" className="nf-shell">
      <div className="nf-door-page">
        <Logo size={40} wordSize={18} />
        {claims && prefs ? (
          <>
            <h1 className="nf-door-page__title">{copy.title}</h1>
            <p className="nf-door-page__lede">{copy.lede.replace("{email}", prefs.masked)}</p>
            <PreferencesForm copy={copy} token={token} initial={prefs.notifications} />
            <p className="nf-caption text-[var(--nf-content-muted)]">{copy.alwaysSent}</p>
          </>
        ) : (
          <>
            <IconPlate size="lg" shape="round" tone="warning">
              <UiIcon name="mail" size={24} />
            </IconPlate>
            <h1 className="nf-door-page__title">{copy.invalidTitle}</h1>
            <p className="nf-door-page__lede">{copy.invalidBody}</p>
            <ButtonLink href="/settings/notifications" variant="primary" size="lg" full>
              {copy.signInLink}
            </ButtonLink>
          </>
        )}
      </div>
    </main>
  );
}
