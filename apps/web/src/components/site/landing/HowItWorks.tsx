import type { Dictionary } from "@naijafinds/i18n";
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
export function HowItWorks({ t }: { t: Dictionary }) {
  const steps: { icon: UiIconName; title: string; body: string }[] = [
    {
      icon: "search",
      /* The old body read "Hotels, apartments, homes, restaurants and
         experiences across Nigeria". Three of those five are categories this
         platform stopped having: the hero row, the product home, the search
         filters and now the footer all deal in Rent, Buy, Shortlets, Land and
         Commercial. A landing page that names a different set of things from
         the one the search returns is a page describing a different product. */
      title: "Search and discover",
      body: `${t.landing.hero.line1} Homes to rent, homes to buy, shortlets, land and commercial space, in one search.`,
    },
    {
      icon: "calendar-booking",
      title: "Book and pay securely",
      body: `${t.landing.hero.line2} Clear naira totals and secure payment before anything is confirmed.`,
    },
    {
      icon: "key",
      title: "Move in",
      /* Was "Live the experience", with a body about checking in and eating
         well, which is hotel copy on a page about renting a flat for a year. */
      body: `${t.landing.hero.line3} Keep the agreement, the payments and every message about the place in one account.`,
    },
  ];

  return (
    <section className="nf-shell py-12 sm:py-16">
      <Reveal className="mb-8 max-w-[52ch] sm:mb-10">
        <span className="nf-overline">Three steps</span>
        <h2 className="nf-h1 mt-3">
          <Words text="How it works" accentFrom={2} />
        </h2>
        <p className="nf-lede mt-4">
          From first search to checked in, the whole journey lives in one account.
        </p>
      </Reveal>

      <Reveal>
        <ol className="nf-card nf-cells nf-cells--trio">
          {steps.map((s, i) => (
            <li key={s.title} className="flex flex-col gap-4 p-7 sm:p-8">
              <div className="flex items-center gap-3">
                <UiIcon
                  name={s.icon}
                  size={28}
                  className="shrink-0 text-[var(--nf-content-primary)]"
                />
                <span className="nf-overline nf-numeric">
                  Step {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="nf-h4 text-[var(--nf-content-primary)]">{s.title}</h3>
              <p className="nf-body-sm max-w-[36ch] text-[var(--nf-content-secondary)]">
                {s.body}
              </p>
            </li>
          ))}
        </ol>
      </Reveal>
    </section>
  );
}
