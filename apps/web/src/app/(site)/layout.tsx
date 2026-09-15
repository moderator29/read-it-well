import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

/**
 * Marketing site chrome.
 *
 * Every public content page (about, careers, contact, help centre, privacy,
 * terms) shares this frame: the marketing header on top, the aurora field
 * breathing behind the content, and the marketing footer to close. The footer
 * lives here and on the landing page only; it never appears inside the
 * signed-in platform or the agent workspace.
 */
export default async function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const t = getDictionary(locale);

  return (
    <>
      <SiteHeader t={t} locale={locale} />

      <main id="main" className="relative overflow-hidden">
        <div className="nf-aurora" aria-hidden="true" />
        <div className="nf-grid-veil" aria-hidden="true" />
        <div className="relative z-10">{children}</div>
      </main>

      <SiteFooter t={t} />
    </>
  );
}
