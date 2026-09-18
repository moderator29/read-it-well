import type { Dictionary } from "@vallo/i18n";
import { ButtonLink } from "@/components/ui/Button";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";

/**
 * The assistant's card on home.
 *
 * ------------------------------------------------------------------------
 * WHAT IT WAS
 * ------------------------------------------------------------------------
 *
 * A 1536 by 1024 render with "AI Assistant" and "Your smart travel buddy"
 * painted into its pixels, which meant three of the four languages saw
 * English, a screen reader heard only the button, and a property marketplace
 * advertised a travel buddy. That account is kept in `home.aiCard` in the
 * dictionary, where the copy now lives.
 *
 * ------------------------------------------------------------------------
 * WHY THE HONEST VERSION EARNS THE SLOT
 * ------------------------------------------------------------------------
 *
 * The assistant does three specific things nothing else on this platform
 * does, all three checkable against the rules it actually runs under in
 * app/api/assistant/route.ts rather than against a claim: it can only cite
 * listings the search tool returned (rule 1), it knows the Nigerian move-in
 * breakdown (rule 4), and it refuses to say a title is good (rule 5). A
 * product that states in plain type what its assistant will REFUSE to do is
 * making a promise it can keep.
 *
 * ------------------------------------------------------------------------
 * WHAT IT IS NOW
 * ------------------------------------------------------------------------
 *
 * One glass card in the home register with the concierge object from the
 * glass pack standing at its edge, the way the render's home puts an object
 * beside every promise. Real type from the locale files, the three claims as
 * an inset row group, the one action. The aurora that used to be mounted in
 * here is gone: `ambient.css` does not draw it inside a card anyway, and the
 * page already has its atmosphere.
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
    <section aria-labelledby="nf-ai-card-title" className="nf-card nf-card--live nf-home__ai">
      <span className="nf-home__ai-art" aria-hidden="true">
        <BrandIcon name="bot" fill />
      </span>

      <div className="relative z-10 p-card">
        <div className="nf-home__ai-body">
          <h2 id="nf-ai-card-title" className="nf-h3">
            {title}
          </h2>
          <p className="nf-body-sm mt-row text-[var(--nf-content-secondary)]">{body}</p>
        </div>

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
              <span className="nf-body-sm text-[var(--nf-content-secondary)]">{claim.text}</span>
            </li>
          ))}
        </ul>

        <div className="mt-heading">
          <ButtonLink href="/assistant" variant="primary" leadingIcon="sparkle">
            {action}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
