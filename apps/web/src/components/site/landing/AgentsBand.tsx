import Link from "next/link";
import type { Dictionary } from "@naijafinds/i18n";
import { Reveal } from "@/components/site/Reveal";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * "For agents" band.
 *
 * A split card: the pitch and three concrete promises on the left, and on the
 * right a floating cluster of the objects an agent lives with, the apartment,
 * the wallet and the verified badge, drifting on the existing float animations.
 * The cluster is decorative and hidden from assistive technology.
 */
export function AgentsBand({ t }: { t: Dictionary }) {
  const points = [
    "Free to list, no upfront fees.",
    "A verified badge guests can trust.",
    "Secure payouts straight to your bank.",
  ];

  return (
    <section className="nf-shell py-10 sm:py-14">
      <Reveal>
        <div className="nf-card nf-card--live relative overflow-hidden">
          <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center md:p-10">
            <div>
              <span className="nf-overline">{t.landing.footer.becomeAgent}</span>
              <h2 className="nf-h1 mt-3 max-w-[18ch]">
                List your property. Reach all of Nigeria.
              </h2>
              <p className="mt-4 max-w-[46ch] text-[var(--nf-content-secondary)]">
                {t.home.agentCard.body}
              </p>

              <ul className="mt-5 space-y-2.5">
                {points.map((p) => (
                  <li key={p} className="flex items-start gap-2.5">
                    <UiIcon
                      name="verified"
                      size={18}
                      className="mt-0.5 shrink-0 text-[var(--nf-content-primary)]"
                    />
                    <span className="text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)] sm:text-[0.9375rem]">
                      {p}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-7">
                <Link href="/agents" className="nf-btn nf-btn--primary nf-btn--lg">
                  {t.home.agentCard.action}
                </Link>
              </div>
            </div>

            {/* Floating object cluster. Decorative. */}
            <div
              aria-hidden="true"
              className="relative mx-auto h-44 w-full max-w-[18rem] sm:h-52 lg:h-64"
            >
              <span className="nf-float absolute left-[6%] top-[8%] h-20 w-20 sm:h-24 sm:w-24 lg:h-28 lg:w-28">
                <BrandIcon name="homes-sparkle" fill />
              </span>
              <span className="nf-float-slow absolute bottom-[6%] left-[38%] h-16 w-16 opacity-90 sm:h-20 sm:w-20">
                <BrandIcon name="wallet-secure" fill />
              </span>
              <span className="nf-float-slow absolute right-[6%] top-[16%] h-14 w-14 opacity-80 sm:h-16 sm:w-16">
                <BrandIcon name="shield-check" fill />
              </span>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
