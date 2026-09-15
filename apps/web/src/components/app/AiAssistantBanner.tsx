import type { Dictionary } from "@vallo/i18n";
import { ButtonLink } from "@/components/ui/Button";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";

/**
 * The assistant's door on the product home.
 *
 * ------------------------------------------------------------------------
 * WHAT THIS REPLACED, AND WHY IT COULD NOT BE PATCHED
 * ------------------------------------------------------------------------
 *
 * It was a 1536x1024 AI-generated render of a robot, with the words "AI
 * Assistant" and "Your smart travel buddy" BAKED INTO THE IMAGE AS PIXELS,
 * sitting on the best screen we have. Four separate faults, and every one of
 * them is a thing we identified in the reference platforms and said out loud
 * we would beat:
 *
 *   TEXT AS PIXELS. The headline could not be translated, because a PNG has no
 *   locale. Three of our four languages saw English no matter what the reader
 *   had chosen. It could not be selected, searched, zoomed or reflowed, and at
 *   2x on a 390px phone the baked type was softer than every real glyph beside
 *   it.
 *
 *   INVISIBLE TO A SCREEN READER. The image carried alt="", correctly, since
 *   the alternative would have been reading a decorative robot aloud. So the
 *   only text in the whole component was the button label, and the entire
 *   proposition, the headline and the sentence under it, reached exactly none
 *   of the people who navigate by voice. The `aria-label` on the wrapper was
 *   doing the job the markup should have been doing, which is the tell.
 *
 *   AN AI-GENERATED HERO RENDER. On a platform asking somebody to send a
 *   year's rent through it, a generated robot is the visual grammar of a demo.
 *   It was also the one asset on the screen depicting something that does not
 *   exist, beside a dozen that depict things that do.
 *
 *   IT SAID TRAVEL. "Your smart travel buddy", on a property marketplace,
 *   above an assistant whose actual operating rules are about caution
 *   deposits, agency fees and certificates of occupancy.
 *
 * ------------------------------------------------------------------------
 * WHY THE HONEST VERSION EARNS THE SLOT
 * ------------------------------------------------------------------------
 *
 * The brief allowed for the answer being "delete it". It is not, and the
 * reason is that the assistant does three specific things nothing else on this
 * platform does, all three checkable against the rules it actually runs under
 * in app/api/assistant/route.ts rather than against a claim:
 *
 *   It can only cite listings the search tool returned (rule 1), so it cannot
 *   invent a flat. It knows the Nigerian move-in breakdown (rule 4), which is
 *   the difference between the price on the card and the money somebody has to
 *   find, and no card, filter or search result anywhere on this platform says
 *   that. And it refuses to say a title is good (rule 5): it names the
 *   document the listing claims and sends you to a lawyer at the land
 *   registry.
 *
 * That third one is why this card exists at all. A product that states in
 * plain type what its assistant will REFUSE to do is making a promise it can
 * keep, in a market where people lose deposits to forged certificates of
 * occupancy. It is worth more than another sentence about how clever the
 * assistant is, and it is the exact opposite of what a generated robot
 * communicates.
 *
 * ------------------------------------------------------------------------
 * WHAT IT IS NOW
 * ------------------------------------------------------------------------
 *
 * One surface, no picture. Real HTML type from the four locale files, so the
 * proposition translates, reads aloud, selects, and scales with the reader's
 * own font size. The three claims are a `.nf-rows--inset` group, which is the
 * platform's grouped-surface pattern: one container with hairlines between the
 * parts, so three claims read as one idea rather than as three tiles. Spacing
 * comes from the scale, so the card keeps the same rhythm as everything above
 * and below it on the home screen.
 *
 * The material is `nf-card--live` over an aurora, the same treatment the
 * landing page's closing card and the agents band already carry. Deliberately
 * not a new one: this is the assistant, not a new product, and inventing a
 * bespoke surface for it would have been the render's mistake again in CSS.
 *
 * `/brand/ai-banner.png` has no other reader after this change.
 */
export function AiAssistantBanner({ t }: { t: Dictionary }) {
  const { title, body, action, truths } = t.home.aiCard;

  /*
   * Three claims, each mapped to the rule in the assistant's system prompt
   * that makes it true. `shield-stop` is the deliberate one: a glyph for the
   * thing it will not do, drawn at the same weight as the two it will.
   */
  const claims: { icon: UiIconName; text: string }[] = [
    { icon: "search", text: truths.listings },
    { icon: "wallet", text: truths.costs },
    { icon: "shield-stop", text: truths.title },
  ];

  return (
    <section
      aria-labelledby="nf-ai-card-title"
      className="nf-card nf-card--live relative overflow-hidden"
    >
      <div className="nf-aurora opacity-60" aria-hidden="true" />

      <div className="relative z-10 p-cell">
        <h2 id="nf-ai-card-title" className="nf-h3">
          {title}
        </h2>
        <p className="nf-body-sm mt-row max-w-[56ch] text-[var(--nf-content-secondary)]">
          {body}
        </p>

        {/*
          The divider indent is inherited rather than restated. `.nf-rows--inset`
          defaults it to a 32px leading tile plus the row gap, which is exactly
          the glyph column below, so the hairlines start where the text starts
          and the three rows read as one object with parts.
        */}
        <ul className="nf-rows nf-rows--inset mt-heading">
          {claims.map((claim) => (
            <li key={claim.icon} className="nf-row">
              <span
                aria-hidden="true"
                className="grid h-8 w-8 shrink-0 place-items-center text-[var(--nf-brand-secondary)]"
              >
                <UiIcon name={claim.icon} size={20} />
              </span>
              <span className="nf-body-sm text-[var(--nf-content-secondary)]">
                {claim.text}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-heading">
          <ButtonLink href="/assistant" variant="primary">
            {action}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
