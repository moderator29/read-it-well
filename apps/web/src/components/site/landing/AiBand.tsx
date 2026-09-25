import type { Dictionary, Locale } from "@vallo/i18n/core";
import { ButtonLink } from "@/components/ui/Button";
import { MotionReveal } from "@/components/motion/Reveal";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import type { ListingKind } from "@/lib/listings/types";
import type { MiniListing } from "@/lib/site/listing-card";
import { AiShowcase, type ShowcaseScript } from "./AiShowcase";
import type { GlassMotion } from "./glass-motion";
import { SectionHead } from "./SectionHead";
import { Sweep } from "./Sweep";

const TRUTH_OBJECTS: readonly BrandIconName[] = ["listing-search", "coin-naira", "doc-review"];
const TRUTH_MOTION: readonly GlassMotion[] = ["rise", "turn", "tilt"];
const RENT_KINDS: ReadonlySet<ListingKind> = new Set(["rental"]);
const STAY_KINDS: ReadonlySet<ListingKind> = new Set(["shortlet", "hotel", "villa", "apartment"]);

/**
 * Two real listings of the kind a script asks about, or none. A script whose
 * reply says "here are two" is only played when two such listings exist; a
 * card that does not answer the question would be the dishonest part.
 */
function pick(cards: MiniListing[], kinds: ReadonlySet<ListingKind>): MiniListing[] {
  const fit = cards.filter((c) => kinds.has(c.kind));
  return fit.length >= 2 ? fit.slice(0, 2) : [];
}

/**
 * The AI room: what the assistant does, in three sentences taken from the
 * rules it runs under (`home.aiCard.truths`), beside the scripted example.
 */
export function AiBand({ t, locale, cards }: { t: Dictionary; locale: Locale; cards: MiniListing[] }) {
  const a = t.landingRooms.ai;
  const truths = t.home.aiCard.truths;
  const [one, two, three] = a.scripts;
  const rent = pick(cards, RENT_KINDS);
  const stay = pick(cards, STAY_KINDS);
  const candidates: (ShowcaseScript | null)[] = [
    rent.length === 2 ? { user: one?.user ?? "", reply: one?.reply ?? "", cards: rent } : null,
    stay.length === 2 ? { user: two?.user ?? "", reply: two?.reply ?? "", cards: stay } : null,
    { user: three?.user ?? "", reply: three?.reply ?? "", cards: [], note: a.lawyer },
  ];
  const scripts = candidates.filter((s): s is ShowcaseScript => s !== null && Boolean(s.user && s.reply));

  return (
    <section className="nf-shell nf-room" data-chapter="ai" aria-labelledby="nf-landing-ai-title">
      <div className="nf-ai-room">
        <MotionReveal className="flex flex-col gap-heading">
          <div>
            <SectionHead id="nf-landing-ai-title" eyebrow={a.overline} title={a.title} lede={a.body} />
          </div>
          <MotionReveal as="ul" stagger className="nf-ai-truths">
            {[truths.listings, truths.costs, truths.title].map((line, i) => (
              <li key={line} className="nf-fx-host">
                <span className="nf-glass-fx nf-feature-glass nf-feature-glass--sm" data-motion={TRUTH_MOTION[i] ?? "rise"}>
                  <BrandIcon name={TRUTH_OBJECTS[i] ?? "bot"} fill />
                </span>
                <span>{line}</span>
              </li>
            ))}
          </MotionReveal>
          <div>
            <ButtonLink href="/assistant" variant="primary" size="md" trailingIcon="arrow-right" className="nf-magnetic">
              <Sweep />
              {a.cta}
            </ButtonLink>
          </div>
        </MotionReveal>
        <MotionReveal>
          <AiShowcase
            scripts={scripts}
            locale={locale}
            labels={{
              caption: a.caption,
              replay: a.replay,
              you: a.you,
              name: a.name,
              verified: t.landing.face.card.verified,
              script: a.caption,
            }}
          />
        </MotionReveal>
      </div>
    </section>
  );
}
