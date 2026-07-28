import type { Dictionary } from "@naijafinds/i18n";
import { Reveal } from "@/components/site/Reveal";
import { Icon, type IconName } from "@/design-system/icons/Icon";

/**
 * "Why NaijaFinds" value band.
 *
 * Four cards stating what the platform stands for. Bodies reuse dictionary
 * copy where a matching line already exists; the rest is plain English.
 * Two up on phones, four up on desktop.
 */
export function WhyNaijaFinds({ t }: { t: Dictionary }) {
  const values: { icon: IconName; title: string; body: string }[] = [
    {
      icon: "verified",
      title: "Verified everything",
      body: t.landing.vision.points.verified.body,
    },
    {
      icon: "wallet",
      title: "Honest naira pricing",
      body: t.landing.vision.points.naira.body,
    },
    {
      icon: "language",
      title: "Four languages",
      body: t.landing.trust.multiLanguage.body,
    },
    {
      icon: "map",
      title: "Built for Africa",
      body: "Made in and for the continent, starting with Nigeria.",
    },
  ];

  return (
    <section className="nf-shell py-10 sm:py-14">
      <Reveal className="mb-6 max-w-[52ch] sm:mb-8">
        <h2 className="nf-h1">Why NaijaFinds</h2>
        <p className="mt-3 text-[var(--nf-content-secondary)]">
          The promises behind every search, booking and stay.
        </p>
      </Reveal>

      <ul className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        {values.map((v, i) => (
          <Reveal as="li" key={v.title} delay={i * 70}>
            <div className="nf-card nf-card--interactive flex h-full flex-col p-4 sm:p-5">
              <span className="mb-3 block h-10 w-10 sm:h-12 sm:w-12">
                <Icon name={v.icon} fill />
              </span>
              <span className="block text-[0.875rem] font-semibold text-[var(--nf-content-primary)] sm:text-[0.9375rem]">
                {v.title}
              </span>
              <span className="mt-1 block text-[0.75rem] leading-relaxed text-[var(--nf-content-muted)] sm:text-[0.8125rem]">
                {v.body}
              </span>
            </div>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
