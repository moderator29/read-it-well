import type { Dictionary } from "@vallo/i18n/core";
import { MotionReveal } from "@/components/motion/Reveal";
import { StoreBadges } from "./StoreBadges";
import { storeBadges } from "./store-badges";

/**
 * THE CLOSE: THE APP (P7, 7 October 2026; cut down the same evening).
 *
 * It used to be the founder's store-screenshot headline ("Find. Agree. Move
 * in."), a white "Create your account" capsule and a quiet "Sign in", with
 * the app under a hairline. The founder took the call to action off the page
 * on 7 October: Sign in and Sign up now live in the top capsule
 * (`SiteHeader.tsx`, `LandingCapsule`), so a second pair at the bottom only
 * repeated them. What stays is the app: "On your phone" and the store badges,
 * honest about a store that is not live yet (`store-badges.ts`), and nothing
 * at all inside a native shell (STORE-06, App Store 2.3.10), where the room
 * would have nothing left to say.
 */
export function FinalCta({ t, native = false }: { t: Dictionary; native?: boolean }) {
  const p = t.experienceLanding.plasma.close;
  /* `NEXT_PUBLIC_*` is inlined at build time. */
  const badges = storeBadges({
    appStoreUrl: process.env.NEXT_PUBLIC_APP_STORE_URL,
    playStoreUrl: process.env.NEXT_PUBLIC_PLAY_STORE_URL,
    native,
  });
  if (badges.length === 0) return null;
  return (
    /* No longer a night island: with the headline gone it is a quiet band
       that follows the reader's theme, like the FAQ above it and the footer
       below, so light mode does not get a lone dark slab. */
    <section className="nf-pl-close nf-pl-close--app" data-chapter="close" aria-labelledby="nf-landing-close-title">
      <div className="nf-shell">
        <MotionReveal className="nf-pl-close__stage">
          <div className="nf-pl-close__app">
            <h2 id="nf-landing-close-title" className="nf-pl-overline">
              {p.app}
            </h2>
            <StoreBadges badges={badges} labels={t.landingRooms.badges} className="nf-pl-close__badges" />
          </div>
        </MotionReveal>
      </div>
    </section>
  );
}
