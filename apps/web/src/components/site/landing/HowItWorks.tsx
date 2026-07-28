import type { Dictionary } from "@naijafinds/i18n";
import { Reveal } from "@/components/site/Reveal";
import { Icon, type IconName } from "@/design-system/icons/Icon";

/**
 * "How it works" band.
 *
 * Three steps rendered as connected cards: a vertical spine of cards on phones
 * with short connector strokes between them, opening into a horizontal row on
 * desktop where a single hairline runs behind the step badges. Presentational
 * only; the copy that exists in the dictionary is reused, the rest is plain
 * English until keys land.
 */
export function HowItWorks({ t }: { t: Dictionary }) {
  const steps: { icon: IconName; title: string; body: string }[] = [
    {
      icon: "search",
      title: "Search and discover",
      body: `${t.landing.hero.line1} Hotels, apartments, homes, restaurants and experiences across Nigeria, in one search.`,
    },
    {
      icon: "booking",
      title: "Book and pay securely",
      body: `${t.landing.hero.line2} Clear naira totals and secure payment before anything is confirmed.`,
    },
    {
      icon: "experience",
      title: "Live the experience",
      body: `${t.landing.hero.line3} Check in, eat well, explore, and keep every booking in one place.`,
    },
  ];

  return (
    <section className="nf-shell py-10 sm:py-14">
      <Reveal className="mb-7 max-w-[52ch] sm:mb-9">
        <span className="nf-overline">Three steps</span>
        <h2 className="nf-h1 mt-3">How it works</h2>
        <p className="mt-3 text-[var(--nf-content-secondary)]">
          From first search to checked in, the whole journey lives in one account.
        </p>
      </Reveal>

      <div className="relative">
        {/* Connecting line behind the step badges on desktop. Decorative. */}
        <div
          aria-hidden="true"
          className="absolute left-[16%] right-[16%] top-9 hidden h-px bg-gradient-to-r from-transparent via-[var(--nf-border-subtle)] to-transparent lg:block"
        />

        <ol className="relative flex flex-col gap-0 lg:grid lg:grid-cols-3 lg:gap-4">
          {steps.map((s, i) => (
            <Reveal as="li" key={s.title} delay={i * 90} className="flex flex-col">
              {i > 0 && (
                <span
                  aria-hidden="true"
                  className="mx-auto block h-6 w-px bg-[var(--nf-border-subtle)] lg:hidden"
                />
              )}
              <div className="nf-card nf-card--interactive relative flex h-full flex-col items-center gap-3 p-5 text-center sm:p-6">
                <span className="nf-glass nf-numeric absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-[0.8125rem] font-bold text-[var(--nf-content-primary)]">
                  {i + 1}
                </span>
                <span className="h-12 w-12 sm:h-14 sm:w-14">
                  <Icon name={s.icon} fill />
                </span>
                <span className="text-[0.9375rem] font-semibold text-[var(--nf-content-primary)] sm:text-[1rem]">
                  {s.title}
                </span>
                <span className="max-w-[34ch] text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)] sm:text-[0.875rem]">
                  {s.body}
                </span>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
