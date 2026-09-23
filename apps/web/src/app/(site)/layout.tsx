import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteBackBar } from "./SiteBackBar";

/**
 * Marketing site chrome.
 *
 * Every public content page (about, careers, contact, help centre, privacy,
 * terms) shares this frame: the marketing header on top, the aurora field
 * breathing behind the content, and the marketing footer to close. The footer
 * lives here and on the landing page only; it never appears inside the
 * signed-in platform or the agent workspace.
 *
 * AND THE WAY BACK. `SiteBackBar` is the one mount that gives all fourteen
 * pages in this group the platform's back control, reading the parent out of
 * `lib/nav/route-parents.ts` rather than guessing at history. It draws nothing
 * on a route with no declared parent, so the frame stays honest; the landing
 * page is not in this group and is a declared ROOT, so it never gets one.
 */
export default async function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const t = getDictionary(locale);

  return (
    <>
      <SiteHeader t={t} locale={locale} />

      <main id="main" className="nf-site relative overflow-hidden">
        <div className="nf-aurora" aria-hidden="true" />
        <div className="nf-grid-veil" aria-hidden="true" />
        <div className="relative z-10">
          <SiteBackBar />
          {children}
        </div>
      </main>

      <SiteFooter t={t} />
    </>
  );
}
