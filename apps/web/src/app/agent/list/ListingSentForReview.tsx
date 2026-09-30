import type { Dictionary } from "@vallo/i18n/core";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { ButtonLink } from "@/components/ui/Button";
import { IconPlate } from "@/components/ui/IconPlate";
import { lineGlyphFor } from "@/design-system/icons/glass-to-line";

type WizardCopy = Dictionary["agentListings"];

/**
 * SENT FOR REVIEW: GOVERNING-08 SCREEN FOUR, DRAWN.
 *
 * Exported and standalone rather than inlined in the wizard's `submitted`
 * branch, for a plain reason: a screen that only appears after a real listing
 * has been sent to a real queue is a screen nobody can photograph, and an
 * unphotographable surface is one a sweep cannot close. It has no state of
 * its own, so lifting it out costs nothing and gives the preview harness a
 * door.
 *
 * It replaces a `ResultScreen`, which is the platform's one confirmation
 * component and was the right call when the choice was between it and a
 * forty-fourth bespoke moment screen. It is not the right call against this
 * render, which is not a generic confirmation: it is the object with its
 * tick, the verdict, a panel about the LISTING ID, and three promises under
 * "What happens next". None of those exist on `ResultScreen`, and adding them
 * there would push this one screen's anatomy onto forty-three others.
 *
 * THE LISTING ID, AND WHY THERE IS NO CODE IN THE BOX.
 *
 * The render prints `VL-7K4M-92` under "Your listing ID". Ours cannot, and
 * this is the one place in the three images where the drawing and the
 * database disagree about a FACT rather than about a shape. The `VL-` code is
 * minted by trigger at PUBLISH and never at draft, because a code is a public
 * handle and a listing in review has no public existence. Rule 15 forbids
 * printing a figure the database cannot produce, so the panel keeps the
 * render's anatomy, its heading and its sentence, and says the true thing in
 * the place the code will occupy. It is not an empty box and it is not an
 * invented code.
 *
 * `reference.copy` and `reference.copied` are therefore still undrawn, and
 * still worth keeping: they are the Copy control for the "your listing is
 * live" surface, which nobody has built yet.
 */
export function ListingSentForReview({
  copy,
  reference,
}: {
  copy: WizardCopy;
  reference: Dictionary["listingReference"];
}) {
  return (
      <div className="mx-auto max-w-2xl px-gutter py-3xl">
        <div className="nf-lw-done">
          <IconPlate size="lg" tone="success">
            <UiIcon name="circle-check" size={24} />
          </IconPlate>
          <h1 className="nf-lw-done__verdict">{copy.submitted.title}</h1>
          <p className="nf-lw-done__body">{copy.submitted.body}</p>

          <div className="nf-lw-id">
            <p className="nf-lw-id__label">{reference.yours}</p>
            <p className="nf-lw-id__body">
              {reference.issuedWhenLive} {reference.explain}
            </p>
          </div>

          <div className="nf-lw-next">
            <p className="nf-label">{copy.drawn.done.nextTitle}</p>
            {(
              [
                { key: "one", object: "doc-review", text: copy.drawn.done.one },
                { key: "two", object: "id-card-check", text: copy.drawn.done.two },
                { key: "three", object: "bell-badge", text: copy.drawn.done.three },
              ] as const
            ).map((row) => (
              <p key={row.key} className="nf-lw-next__row">
                <IconPlate size="sm" className="nf-lw-next__plate">
                  <UiIcon name={lineGlyphFor(row.object)} size={20} />
                </IconPlate>
                <span>{row.text}</span>
              </p>
            ))}
          </div>

          <div className="mt-heading grid w-full gap-row">
            <ButtonLink href="/agent/listings" variant="primary" full>
              {copy.submitted.goToListings}
            </ButtonLink>
            {/* "List another" is the one control on the platform that means a
                blank wizard and nothing else, so it says so. Bare /agent/list
                resumes an open draft now, which is right for the navigation
                entry and would be wrong here. */}
            <ButtonLink href="/agent/list?new=1" variant="secondary" full>
              {copy.submitted.another}
            </ButtonLink>
          </div>
        </div>
      </div>
  );
}
