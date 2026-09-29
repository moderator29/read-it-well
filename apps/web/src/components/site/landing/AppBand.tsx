import type { Dictionary } from "@vallo/i18n/core";
import { MotionReveal } from "@/components/motion/Reveal";
import { Logo } from "@/design-system/brand/Logo";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { storeBadges } from "./store-badges";
import { StoreBadges } from "./StoreBadges";
import { SectionHead } from "./SectionHead";

/**
 * Take Vallo with you: one branded panel, no device frame (the founder's
 * ruling of 29 September removed the drawn phones).
 *
 * The panel is a night island (`data-theme="dark"`) in both themes, the same
 * navy block the header is in light mode, so it reads as the brand speaking
 * rather than one more card. On it: the app promise, the store badges, and
 * three short points on what the phone gives you.
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
        <div className="nf-app-panel" data-theme="dark">
          <div className="nf-app-panel__copy">
            <SectionHead id="nf-landing-app-title" eyebrow={a.eyebrow} title={a.title} lede={a.body} />
            {badges.length > 0 ? (
              /* The official artwork, drawn inline (StoreBadges.tsx). */
              <StoreBadges badges={badges} labels={t.landingRooms.badges} className="nf-app-panel__badges" />
            ) : (
              <div className="nf-app-panel__install">
                <UiIcon name="share" size={20} aria-hidden />
                <div>
                  <p className="nf-app-panel__install-title">{a.installTitle}</p>
                  <p className="nf-app-panel__install-body">{a.installBody}</p>
                </div>
              </div>
            )}
          </div>
          <div className="nf-app-panel__aside">
            <span className="nf-app-panel__mark" aria-hidden="true">
              <Logo size={40} wordSize={18} />
            </span>
            <p className="nf-app-panel__aside-title">{a.rightTitle}</p>
            <ul className="nf-app-panel__points">
              {points.map((p) => (
                <li key={p.key}>
                  <span className="nf-app-panel__tick" aria-hidden="true">
                    <UiIcon name={p.icon} size={18} />
                  </span>
                  {p.label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </MotionReveal>
    </section>
  );
}
