import type { Dictionary } from "@vallo/i18n";
import { Reveal } from "@/components/site/Reveal";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";

/**
 * How Vallo works: Discover, Verify, Experience, Manage. Four orbs on a
 * hairline, a numbered title and one sentence each. Stroked glyphs here
 * because the render draws these as line icons in glass circles, and the
 * row is all one tier.
 */
export function HowVallo({ t }: { t: Dictionary }) {
  const h = t.landing.face.how;
  const steps: { key: keyof typeof h.steps; icon: UiIconName }[] = [
    { key: "discover", icon: "search" },
    { key: "verify", icon: "verified" },
    { key: "experience", icon: "key" },
    { key: "manage", icon: "wallet" },
  ];
  return (
    <section className="nf-shell py-section" aria-labelledby="nf-landing-how-title">
      <Reveal className="mx-auto mb-block max-w-measure-lede text-center">
        <span className="nf-overline text-[var(--nf-brand-secondary)]">{h.overline}</span>
        <h2 id="nf-landing-how-title" className="nf-h1 mt-row">
          {h.title}
        </h2>
        <p className="nf-lede mt-group">{h.body}</p>
      </Reveal>
      <ol className="nf-landing-steps">
        {steps.map((s, i) => (
          <Reveal as="li" key={s.key} delay={i * 60} className="nf-landing-step">
            <span className="nf-landing-orb nf-landing-orb--lg nf-landing-orb--stroke">
              <UiIcon name={s.icon} size={24} aria-hidden />
            </span>
            <h3 className="nf-body flex items-center gap-inline font-semibold text-[var(--nf-content-primary)]">
              <span className="nf-landing-step-num nf-numeric" aria-hidden="true">
                {i + 1}
              </span>
              {h.steps[s.key].title}
            </h3>
            <p className="nf-body-sm text-[var(--nf-content-secondary)]">{h.steps[s.key].body}</p>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}
