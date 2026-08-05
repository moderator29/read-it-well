import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { LogoMark } from "@/design-system/brand/Logo";
import { LanguageSwitcher } from "@/components/site/LanguageSwitcher";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { ApplyWizard } from "@/components/agent/ApplyWizard";

export const metadata: Metadata = {
  title: "Agent application",
  robots: { index: false, follow: false },
};

/**
 * Become an Agent, application wizard.
 *
 * A focused shell, not the marketing chrome: the applicant should be
 * concentrating on the form. Back returns to the pitch page.
 */
export default async function AgentApplyPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);

  return (
    <main id="main" className="relative min-h-dvh overflow-hidden px-5 py-8">
      <div className="nf-aurora opacity-60" aria-hidden="true" />

      <div className="relative z-10">
        <header className="nf-shell mb-8 flex items-center justify-between">
          <Link href="/agents" className="nf-tap flex items-center gap-2 text-[0.875rem] font-semibold text-[var(--nf-content-secondary)] hover:text-[var(--nf-content-primary)]">
            <UiIcon name="arrow-right" size={16} className="rotate-180" />
            {t.agent.apply.title}
          </Link>
          <div className="flex items-center gap-4">
            <LanguageSwitcher current={locale} label={t.a11y.languageSwitcher} compact />
            <Link href="/" aria-label={t.a11y.logoHome} className="nf-tap">
              <LogoMark size={34} />
            </Link>
          </div>
        </header>

        <ApplyWizard t={t} />
      </div>
    </main>
  );
}
