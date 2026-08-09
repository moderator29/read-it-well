import Link from "next/link";
import type { Dictionary } from "@naijafinds/i18n";
import { Reveal } from "@/components/site/Reveal";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { ButtonLink } from "@/components/ui/Button";

/**
 * "For agents" band.
 *
 * THE FLOATING CLUSTER IS GONE. Three 3D objects sat at absolute positions in
 * the right-hand column, two of them drifting up and down on seven and eleven
 * second loops, at 90% and 80% opacity. Three problems in one device.
 *
 * It was the signature family on the marketing page, which is the thing the
 * whole pass is here to correct. It was decoration, so the objects meant
 * nothing, and a reader who meets three objects that mean nothing stops reading
 * the ones that do. And it drifted: a permanent loop in the corner of the eye
 * on a page somebody is trying to read, which is the single most common way a
 * site that wanted to feel alive ends up feeling restless instead.
 *
 * What takes the column is the three promises, moved out of the prose and drawn
 * as a row list with inset hairlines. They were already the most concrete thing
 * in the band and they were set as a bulleted afterthought under the paragraph.
 * Now they are the right-hand half, which is where the eye went anyway.
 */
export function AgentsBand({ t }: { t: Dictionary }) {
  const points = [
    { icon: "wallet", text: "Free to list, with no upfront fees." },
    { icon: "verified", text: "A checked badge that renters can see." },
    { icon: "arrow-right", text: "Payouts straight to your own bank account." },
  ] as const;

  return (
    <section className="nf-shell py-section">
      <Reveal>
        <div className="nf-card nf-card--live relative overflow-hidden">
          <div className="grid gap-block p-card-lg lg:grid-cols-[1fr_0.9fr] lg:items-center">
            <div>
              <span className="nf-overline">{t.landing.footer.becomeAgent}</span>
              <h2 className="nf-h1 mt-row max-w-[18ch]">
                List your property. Reach all of Nigeria.
              </h2>
              <p className="nf-lede mt-group max-w-[44ch]">{t.home.agentCard.body}</p>

              <div className="mt-block flex flex-wrap items-center gap-x-block gap-y-group">
                <ButtonLink href="/agents" variant="primary" size="lg">
                  {t.home.agentCard.action}
                </ButtonLink>
                <Link href="/docs" prefetch className="nf-link-quiet nf-body">
                  How listing works
                  <UiIcon name="arrow-right" size={16} />
                </Link>
              </div>
            </div>

            {/*
              The three promises as rows on their own hairlines.

              No second card around them. A card inside a card is two rims and
              two corner blooms a few pixels apart, and it is the fastest way to
              make a considered surface look like a stack of packaging. The rows
              are simply rows on the surface that is already here, and the
              dividers are inset off the leading glyph so the three read as one
              list rather than three strips.
            */}
            <ul className="nf-rows nf-rows--inset [--nf-row-divider-lead:2.5rem]">
              {points.map((p) => (
                <li key={p.text} className="nf-row">
                  <UiIcon
                    name={p.icon}
                    size={20}
                    className="shrink-0 text-[var(--nf-content-secondary)]"
                  />
                  <span className="nf-body text-[var(--nf-content-primary)]">{p.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
