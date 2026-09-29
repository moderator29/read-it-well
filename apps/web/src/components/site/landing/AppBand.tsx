import type { Dictionary } from "@vallo/i18n/core";
import { MotionReveal } from "@/components/motion/Reveal";
import { HeroBand } from "@/components/ui/HeroBand";
import { IconPlate, ICON_PLATE_GLYPH } from "@/components/ui/IconPlate";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { storeBadges } from "./store-badges";
import { StoreBadges } from "./StoreBadges";

/**
 * Take Vallo with you: one branded panel, no device frame (the founder's
 * ruling of 29 September removed the drawn phones).
 *
 * The panel is the shared `HeroBand` (navy on paper, a raised night surface
 * at night), so it reads as the brand speaking rather than one more card.
 * On it: the app promise, the store badges or the install line, and three
 * short points on what the phone gives you, divided by hairlines.
 *
 * STORE-06 (also UI-07, UX-26). The store badges:
 *
 *   - each renders ONLY when its store URL is set and is that store's own
 *     address (`storeBadges` in `store-badges.ts`);
 *   - neither renders inside a native shell, whatever is set (`LandingBody`
 *     passes the surface the server read from the shell's User-Agent, and
 *     leaves this band out entirely there);
 *   - "Full access to all features" and "Secure and fast" are gone.
 *
 * With no badge live the panel prints how to install from the browser
 * instead, which is what the FAQ's "Is there an app?" answer says, so the
 * slot is never empty and never a badge that leads nowhere.
 */
export function AppBand({
  t,
  native = false,
}: {
  t: Dictionary;
  /** True when the server is rendering for a native shell. */
  native?: boolean;
}) {
  const a = t.landing.face.app;
  const points: { key: string; icon: UiIconName; label: string }[] = [
    { key: "notify", icon: "bell", label: a.points.notify },
    { key: "sides", icon: "home", label: a.points.sides },
    { key: "record", icon: "document", label: a.points.record },
  ];
  /* `NEXT_PUBLIC_*` is inlined at build time. */
  const badges = storeBadges({
    appStoreUrl: process.env.NEXT_PUBLIC_APP_STORE_URL,
    playStoreUrl: process.env.NEXT_PUBLIC_PLAY_STORE_URL,
    native,
  });
  return (
    <section className="nf-shell nf-room" data-chapter="app" aria-labelledby="nf-landing-app-title">
      <MotionReveal>
        {/* THE NAVY HERO BAND (spec section 16, Q2 as the founder widened
            it): the light theme's one signature block, flat, no glass, the
            same band Home and the desks open on. One panel, two columns, no
            card inside it (UIUX item 11). */}
        <HeroBand
          as="div"
          className="nf-app-band"
          label={a.eyebrow}
          title={<span id="nf-landing-app-title">{a.title}</span>}
          sub={a.body}
        >
          <div className="nf-app-band__cols">
            <div className="nf-app-band__store">
              {badges.length > 0 ? (
                /* The official artwork, drawn inline (StoreBadges.tsx). */
                <StoreBadges badges={badges} labels={t.landingRooms.badges} className="nf-app-panel__badges" />
              ) : (
                <div className="nf-app-band__install">
                  <IconPlate size="sm" tone="neutral">
                    <UiIcon name="share" size={ICON_PLATE_GLYPH.sm} />
                  </IconPlate>
                  <div>
                    <p className="nf-app-band__install-title">{a.installTitle}</p>
                    <p className="nf-app-band__install-body">{a.installBody}</p>
                  </div>
                </div>
              )}
            </div>
            <div className="nf-app-band__aside">
              <p className="nf-section-label">{a.rightTitle}</p>
              <ul className="nf-app-band__points">
                {points.map((p) => (
                  <li key={p.key}>
                    <UiIcon name={p.icon} size={20} aria-hidden />
                    {p.label}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </HeroBand>
      </MotionReveal>
    </section>
  );
}
