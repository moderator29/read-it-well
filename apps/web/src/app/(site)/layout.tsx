import { headers } from "next/headers";
import { getDictionary } from "@vallo/i18n";
import { isShellUserAgent } from "@/lib/native/shell";
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
  /* V-11: inside the store shell the marketing header and footer are never
     drawn. The pages themselves (privacy, terms, help) are still reachable
     from the app, framed by the back bar alone. */
  const shell = isShellUserAgent((await headers()).get("user-agent"));

  return (
    <>
      {!shell && <SiteHeader t={t} locale={locale} />}

      {/* overflow-clip, not hidden: it clips the aurora the same way but is
          not a scroll container, so `position: sticky` inside works (the
          guide's contents column, the move-in calculator's result). */}
      <main id="main" className="nf-site relative overflow-clip">
        <div className="nf-aurora" aria-hidden="true" />
        <div className="nf-grid-veil" aria-hidden="true" />
        <div className="relative z-10">
          <SiteBackBar />
          {children}
        </div>
      </main>

      {!shell && <SiteFooter t={t} />}
    </>
  );
}
