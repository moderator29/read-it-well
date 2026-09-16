import type { Dictionary } from "@vallo/i18n";
import { Reveal } from "@/components/site/Reveal";
import { Words } from "@/components/site/Words";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * Where Vallo is going, labelled as a plan and never as a product.
 *
 * ---------------------------------------------------------------------------
 * THE ONLY SECTION ON THIS PAGE THAT DESCRIBES SOMETHING THAT DOES NOT EXIST,
 * AND THE RULES IT KEEPS IN EXCHANGE.
 * ---------------------------------------------------------------------------
 *
 * The founder's ambition for this platform is larger than what is built, and a
 * landing page that hides that describes a smaller company than the one being
 * made. A roadmap is a legitimate thing to publish. What is not legitimate is
 * the thing this repository has already been caught doing once, on this very
 * page: printing "17+ Verified listings" under a heading that promised real
 * numbers, when the true figure was zero.
 *
 * So the line is drawn, and it is drawn in the markup rather than in a
 * comment:
 *
 *  1. THE HEADING SAYS IT IS THE FUTURE, in the reader's own language, before
 *     any item is read. "What we are building next" cannot be misread as an
 *     inventory.
 *  2. EVERY ITEM IS A FUTURE TENSE SENTENCE. No item is phrased as a feature.
 *  3. NOTHING HERE IS A LINK. A roadmap item that is tappable implies a
 *     destination, and there is nothing to arrive at.
 *  4. NO DATES. A date is a promise, and the product decides its own dates.
 *  5. ANYTHING THAT SHIPS LEAVES THIS SECTION for a band that describes it in
 *     the present tense. This list should get shorter as often as it grows.
 *
 * `--nf-content-muted` throughout and no brand accent, deliberately: the eye
 * should read this after everything the platform can actually do today.
 */
export function NextBand({ t }: { t: Dictionary }) {
  const items: string[] = [
    t.landing.next.items.stablecoin,
    t.landing.next.items.chain,
    t.landing.next.items.instalments,
    t.landing.next.items.more,
  ];

  return (
    <section className="nf-shell py-section" aria-labelledby="nf-next-title">
      <Reveal className="max-w-[60ch]">
        <span className="nf-overline">{t.landing.next.overline}</span>
        <h2 id="nf-next-title" className="nf-h2 mt-row">
          <Words text={t.landing.next.title} accentFrom={3} />
        </h2>
        <p className="nf-lede mt-group">{t.landing.next.body}</p>
      </Reveal>

      <Reveal delay={70}>
        <ul className="mt-block grid gap-row sm:grid-cols-2">
          {items.map((item) => (
            <li key={item} className="flex items-start gap-inline">
              <UiIcon
                name="sparkle"
                size={16}
                className="mt-3xs shrink-0 text-[var(--nf-content-muted)]"
              />
              <span className="text-[0.875rem] leading-relaxed text-[var(--nf-content-muted)]">
                {item}
              </span>
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}
