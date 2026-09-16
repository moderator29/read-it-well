import Image from "next/image";
import type { Dictionary } from "@vallo/i18n";
import { Reveal } from "@/components/site/Reveal";
import { Words } from "@/components/site/Words";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * The Vallo standard: the five answers this platform structures that nobody
 * else does, each one a real column on every listing rather than a promise.
 *
 * This band replaces two that are gone. `WhyVallo` made the same case in
 * generic terms ("verified", "secure"), and the trust strip beneath it said
 * "Secure & Trusted / Your safety is our priority" with a heart emoji, which
 * is the exact grammar of every template site on earth. What separates Vallo
 * is not that it says trustworthy things, it is that the questions a Nigerian
 * renter actually asks, about the light, the water and the gate, are answered
 * ON THE LISTING, as data. So the band lists those questions and where the
 * answers live, and claims nothing it cannot show.
 *
 * The scene on the right is `hero-protected` from the commissioned hero set:
 * a shield with a house and a tick on a lit glass plinth. It is the one hero
 * scene whose copy has to stay away from custody language, and this band's
 * copy is about verification and inspection, never about holding money,
 * because the platform holds nobody's money and the terms say so.
 */
export function StandardBand({ t }: { t: Dictionary }) {
  /*
   * Every point carries the same tick, deliberately. A different object per
   * point was tried first and the vocabulary does not exist: there is no glass
   * object that means electricity or water, and pressing a boat house into
   * service as "the water" is the kind of near-miss a reader feels without
   * being able to name. Five ticks read as what this band is: a standard,
   * being met, item by item.
   */
  const points: { title: string; body: string }[] = [
    t.landing.standard.points.power,
    t.landing.standard.points.water,
    t.landing.standard.points.gate,
    t.landing.standard.points.checked,
    t.landing.standard.points.inside,
  ];

  return (
    <section className="nf-shell py-section" aria-labelledby="nf-standard-title">
      <div className="grid gap-block lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <Reveal className="max-w-[52ch]">
            <span className="nf-overline">{t.landing.standard.overline}</span>
            <h2 id="nf-standard-title" className="nf-h1 mt-row">
              <Words text={t.landing.standard.title} accentFrom={3} />
            </h2>
          </Reveal>

          <ul className="mt-block grid gap-group sm:grid-cols-2">
            {points.map((p, i) => (
              <Reveal as="li" key={p.title} delay={i * 50} className="flex items-start gap-group">
                <span className="mt-3xs grid h-8 w-8 shrink-0 place-items-center rounded-[var(--nf-radius-control)] bg-[var(--nf-brand-primary-soft)]">
                  <UiIcon name="verified" size={16} className="text-[var(--nf-brand-secondary)]" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[0.9375rem] font-semibold text-[var(--nf-content-primary)]">
                    {p.title}
                  </span>
                  <span className="mt-3xs block text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]">
                    {p.body}
                  </span>
                </span>
              </Reveal>
            ))}
          </ul>
        </div>

        <Reveal delay={120} className="order-first mx-auto w-full max-w-[300px] lg:order-none lg:max-w-[440px]">
          {/* The scene carries its own plinth and its own light: no card, no
              border, no tile. A glass container around a glass plinth is the
              nested chrome this revamp exists to remove. */}
          <Image
            src="/brand/glass/hero/hero-protected.png"
            alt=""
            aria-hidden="true"
            width={557}
            height={470}
            sizes="(max-width: 1024px) 300px, 440px"
            className="nf-float-slow h-auto w-full"
          />
        </Reveal>
      </div>
    </section>
  );
}
