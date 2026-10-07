import { UiIcon } from "@/design-system/icons/UiIcon";
import { PRO_COPY } from "./pro-copy";

/**
 * THE PRO EXPLAINER (the founder's reference 9, "Withdraw anytime", 7 October).
 *
 * A phone frame, its top drawn and its foot dissolving, holds a dim
 * workspace; a smoked-glass card (D74) breaks out of it towards the viewer,
 * wider than the phone. No 3D object: under the governing level the one
 * material object on this screen is the platinum card fan below. The card is a
 * real fragment of the product: the Pro view switch as `ProToggle` draws it
 * in a workspace header, already on, with the three things it deepens as soft
 * chips. Nothing on it is a figure, because there is no figure to show
 * honestly: Pro has no member yet.
 *
 * THE SEQUENCE ("crazy clean animations on pro"), one orchestrated moment and
 * then stillness, all in `pro-page.css` (`nf-pro-x-*` keyframes):
 *   0ms     the phone rises and settles (entrance ease, 620ms)
 *   180ms   the card lifts out of the screen: it starts inside the phone,
 *           smaller and lower, and lands above it, wider than it
 *   500ms   the chips rise, 60ms apart
 *   720ms   the switch turns on: the track fills with brand light, the thumb
 *           slides, then one pop (1 to 1.04 to 1, the unlock payoff of
 *           MOTION_SYSTEM section 2)
 *
 * CSS rather than framer-motion, on purpose: keyframes run from the first
 * painted frame, so the server's HTML is the start of the sequence and there
 * is no jump at hydration, and the component stays server-safe. Reduced
 * motion, Calm, Off and save-data get the last frame (the rules at the foot
 * of the stylesheet). Transform and opacity only.
 *
 * Decorative: `aria-hidden`, because the headline and body under it say
 * everything it shows.
 */
export function ProExplainer() {
  const f = PRO_COPY.hero.fragment;
  return (
    <div className="nf-pro-x" aria-hidden="true" data-testid="pro-explainer">
      <div className="nf-pro-x__glow" />

      <div className="nf-pro-x__phone">
        <div className="nf-pro-x__screen">
          <span className="nf-pro-x__bar nf-pro-x__bar--title" />
          <span className="nf-pro-x__bar" />
          <span className="nf-pro-x__row" />
          <span className="nf-pro-x__row" />
          <span className="nf-pro-x__row nf-pro-x__row--short" />
        </div>
      </div>

      <div className="nf-pro-x__card">
        <span className="nf-pro-x__source">
          <UiIcon name="chart-bar" size={14} />
          {f.source}
        </span>
        <span className="nf-pro-x__head">
          <span className="nf-pro-x__title">{f.title}</span>
          {/* A drawing of the switch, not a control: nothing here is pressable. */}
          <span className="nf-pro-x__capsule-art">
            <span className="nf-pro-x__track" />
            <span className="nf-pro-x__thumb" />
          </span>
        </span>
        <span className="nf-pro-x__line">{f.line}</span>
        <span className="nf-pro-x__words">
          {f.words.map((chip) => (
            <span key={chip} className="nf-pro-x__word">
              {chip}
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}
