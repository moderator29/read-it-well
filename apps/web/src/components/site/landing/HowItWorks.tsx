import type { Dictionary } from "@vallo/i18n";
import { Reveal } from "@/components/site/Reveal";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { Words } from "@/components/site/Words";

/**
 * "How it works" band.
 *
 * ONE SURFACE, THREE CELLS. It was three cards.
 *
 * Three separate `nf-card`s is three borders, three corner blooms and three
 * shadows for one idea that happens to have three parts, and it needed a
 * decorative hairline drawn BEHIND the row plus a connector stub between each
 * pair on phones to put back the relationship the three containers had taken
 * apart. One surface with a rule between the cells says the same thing with
 * nothing drawn to say it: the parts are inside the group, so the group does
 * not have to be re-asserted.
 *
 * The step numbers moved out of the glass pip that used to float in each card's
 * top right corner and became the first thing in the cell, set as an overline
 * beside the glyph. A number in a circle in a corner is a badge, which is what
 * you use when the number is a status; these are an ORDER, and an order is read
 * at the start of the line.
 *
 * Vector glyphs rather than the 3D family, because this is the marketing page.
 * See the note on `categories` in app/page.tsx.
 */
/**
 * THREE ON ONE LINE, ON EVERY WIDTH, AND THE COPY IS CUT TO FIT.
 *
 * The trio stacked into a column below 768px, so on a phone the three steps
 * were three full-width panels each carrying a two-line title and a
 * three-line paragraph: a band about how simple this is, taking most of a
 * screen to say it. The whole point of "three steps" is that you can see that
 * there are three, at a glance, without scrolling.
 *
 * So the grid is three across at every width and the copy is written to that
 * column instead of being squeezed into it. One word or two in the title, one
 * short line under it. The longer sentences did not move anywhere clever, they
 * were deleted: a step that needs a paragraph is not a step.
 */
export function HowItWorks({ t }: { t: Dictionary }) {
  const steps: { icon: UiIconName; title: string; body: string }[] = [
    { icon: "search", title: t.landing.hero.line1, body: "Rent, buy, shortlet, land and commercial, in one search." },
    { icon: "calendar-booking", title: t.landing.hero.line2, body: "Naira totals in full, paid safely, before anything is confirmed." },
    { icon: "key", title: t.landing.hero.line3, body: "Agreement, payments and messages, all in one account." },
  ];

  return (
    <section className="nf-shell py-section">
      <Reveal className="mb-block max-w-[52ch]">
        <span className="nf-overline">Three steps</span>
        <h2 className="nf-h1 mt-row">
          <Words text="How it works" accentFrom={2} />
        </h2>
      </Reveal>

      <Reveal>
        <ol className="nf-card nf-cells nf-cells--trio">
          {steps.map((s, i) => (
            <li key={s.title} className="flex flex-col gap-row p-cell">
              <div className="flex items-center gap-inline">
                <UiIcon name={s.icon} size={20} className="shrink-0 text-[var(--nf-brand-secondary)]" />
                <span className="nf-caption nf-numeric text-[var(--nf-content-muted)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="nf-body font-semibold leading-snug text-[var(--nf-content-primary)]">
                {s.title}
              </h3>
              <p className="nf-caption leading-snug text-[var(--nf-content-secondary)]">{s.body}</p>
            </li>
          ))}
        </ol>
      </Reveal>
    </section>
  );
}
