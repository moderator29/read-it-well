import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { RowLink, RowValue, SettingsGroup } from "@/components/app/account/rows";
import { SupportChat } from "@/components/app/account/SupportChat";
import { loadMyReports } from "@/lib/reports/my-reports";
import { MyReports } from "./MyReports";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getDictionary(await getLocale()).settings.hub.help };
}

/**
 * Help & Support: the assistant, the help centre, the legal pages and the
 * about block, which were the last two cards of the old settings home.
 */
export default async function HelpSettingsPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const reports = await loadMyReports();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={t.settings.hub.help}
        subtitle={t.settings.hub.helpSub}
        fallback="/settings"
      />
      <div className="space-y-block">
        <section id="settings-help" className="scroll-mt-28">
          <SupportChat />
        </section>
        {/* V-89: what this person reported, where it stands, and a way to take it back. */}
        <section id="settings-reports" className="scroll-mt-28">
          <MyReports list={reports} locale={locale} />
        </section>
        <section id="settings-about" className="scroll-mt-28">
          <div id="legal">
            <SettingsGroup label={t.settings.about.label} note={t.settings.about.note}>
              <RowLink
                href="/help"
                icon="ticket"
                label={t.settings.about.help}
                sub={t.settings.about.helpSub}
              />
              <RowLink href="/terms" icon="grid" label={t.settings.about.terms} />
              <RowLink href="/privacy" icon="verified" label={t.settings.about.privacy} />
              <RowValue icon="sparkle" label={t.settings.about.version} value="0.1.0" />
              {/* The library names are the products' own names and are not
                  translated, in any language. */}
              <RowValue
                icon="share"
                label={t.settings.about.licences}
                value="Next.js, React, Tailwind CSS (MIT)"
              />
            </SettingsGroup>
          </div>
        </section>
      </div>
    </div>
  );
}
