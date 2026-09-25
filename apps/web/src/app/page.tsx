import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDictionary, type Locale } from "@vallo/i18n";
import { isShellUserAgent, SHELL_START } from "@/lib/native/shell";
import { getLocale } from "@/lib/locale";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { LandingBody, landingData } from "@/components/site/landing/LandingBody";
import { requestSurface } from "@/lib/auth/surface";
import { NONCE_HEADER } from "@/lib/security/csp";

/*
 * THE INTRO PLAYS ONCE PER VISIT, AND ON A SLOW DEVICE WITHOUT THE BLUR
 * (Track M). This runs while the parser is still above the hero, so the
 * decision is made before the first frame of the headline:
 *
 *   `data-intro="seen"`   the headline has assembled once this session, so
 *                         it is simply there (landing-rooms.css);
 *   `data-motion-lite`    two cores or less, or two gigabytes or less of
 *                         memory: the depth arrival keeps its scale and fade
 *                         and drops the blur, as data saver does.
 *
 * Both are wrapped in try: storage can throw in a private window, and the
 * answer then is the full intro, which is the harmless default.
 */
const INTRO_SCRIPT =
  "try{var d=document.documentElement,n=navigator;if(sessionStorage.getItem('nf-intro'))d.dataset.intro='seen';else sessionStorage.setItem('nf-intro','1');if((n.hardwareConcurrency&&n.hardwareConcurrency<=2)||(n.deviceMemory&&n.deviceMemory<=2))d.dataset.motionLite='on'}catch(e){}";

/*
 * The landing page: the true face.
 *
 * Built to the two governing images in docs/design/references, desktop
 * first and derived down to 390px (docs/DESIGN_DIRECTION.md section 2).
 * The section order is the fullpage render's, exactly:
 *
 *   1. The hero: the villa plate, the breadcrumb, the gradient headline, two
 *      CTAs, the city capsules, the floating listing card, the search pill.
 *   2. The stats band, printing only what `platform_stats()` returns.
 *   3. Everything you need in one platform: the ten-tile grid.
 *   4. The six-cell feature chip row.
 *   5. The community band with the layered cards and the Third party label.
 *   6. How Vallo works, four steps.
 *   7. Explore by category on the photo plates.
 *   8. The Stays band.
 *   9. Take Vallo with you.
 *  10. The footer with the newsletter field.
 *
 * What the renders show and this page does NOT: "10K+" and every other
 * invented count; "100% verified"; five social icons with no accounts
 * behind them; store badges linking to stores that do not exist; a partner
 * hotel dressed as a listing; and the garbled copy, none of which was
 * transcribed. Each omission is explained beside the section that would
 * have carried it.
 *
 * Product links go straight to the product. Browsing (`/search`, `/stays`,
 * `/listing`) is open to a stranger; the surfaces that need an account
 * (`/wallet`, `/messages`, `/assistant`) are guarded by `middleware.ts`,
 * which sends a stranger to sign in and back again with the destination
 * kept. The old `gatedHref` wrapper described a lock that no longer sits
 * where it said and is no longer used here.
 *
 * The sections and the data read live in `LandingBody.tsx`, shared with the
 * dev preview harness, so the page proven in a sandbox is the page shipped.
 */

export default async function LandingPage() {
  /* V-11. The store shell loads this origin's `/` and must never be shown
     the marketing page: it announces itself in its user agent and is sent to
     its own start, which answers home, welcome or sign in. A browser is
     untouched. See `lib/native/shell.ts`. */
  const head = await headers();
  if (isShellUserAgent(head.get("user-agent"))) redirect(SHELL_START);
  const nonce = head.get(NONCE_HEADER) ?? undefined;
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  const data = await landingData(t);
  const native = (await requestSurface()) !== "web";

  return (
    /* The landing is a night stage in both themes, like the auth screen: its
       hero is built from night photography and lit type, governed by the
       landing renders. Light mode (reintroduced 25 September 2026) starts at
       the product, not at the poster. `nf-landing--stage` paints the ground. */
    <div className="nf-landing nf-landing--stage" data-theme="dark">
      <script nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: INTRO_SCRIPT }} />
      <SiteHeader t={t} locale={locale} variant="landing" />
      <LandingBody t={t} locale={locale} data={data} native={native} nonce={nonce} />
      <SiteFooter t={t} />
    </div>
  );
}
