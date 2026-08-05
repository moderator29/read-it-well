import type { Locale } from "@naijafinds/i18n";
import { getPlatformReviews } from "@/lib/reviews/queries";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Reveal } from "@/components/site/Reveal";

/**
 * What guests actually said.
 *
 * The audit's largest open finding on the marketing site was that it carries
 * ZERO social proof - no ratings, no quotes, no faces, nothing that says
 * anybody has ever used this. References 14 and 15 both lead their credibility
 * section with real customer voices, and this is that section.
 *
 * The hard rule, and the reason this component is shaped the way it is: every
 * word on it is a real database row. The rating a guest gave, the sentence they
 * wrote, the shortened public name the database derives. Nothing is composed,
 * sampled, or "illustrative".
 *
 * When there are no reviews yet, this renders NOTHING - not a placeholder, not
 * a skeleton, not an encouraging empty state. A marketplace with no reviews has
 * no testimonials, and a landing page that invents them is not exaggerating
 * about itself, it is lying about other people. That is a different kind of
 * wrong from an inflated statistic, and it is the one thing on a marketing page
 * that can never be walked back.
 *
 * So the section simply is not there until somebody has spoken, and it appears
 * on its own the moment the first review lands.
 */
export async function VoicesBand({ locale }: { locale: Locale }) {
  const reviews = await getPlatformReviews(locale, 6);
  if (reviews.length === 0) return null;

  return (
    <section aria-labelledby="nf-voices-title" className="nf-shell py-14 sm:py-20">
      <Reveal>
        <p className="nf-overline">In their words</p>
        <h2 id="nf-voices-title" className="nf-h2 mt-2 max-w-[18ch]">
          What guests said after they stayed
        </h2>
      </Reveal>

      {/*
        A masonry-ish column layout rather than a carousel: every voice is
        visible at once and none is hidden behind an interaction. Quotes differ
        wildly in length, and columns absorb that where a row of equal-height
        cards would pad the short ones into awkward boxes.
      */}
      <ul className="mt-8 gap-4 sm:columns-2 lg:columns-3 [&>li]:mb-4 [&>li]:break-inside-avoid">
        {reviews.map((review, i) => (
          <li key={review.id}>
            <Reveal delay={Math.min(i * 60, 240)}>
              <figure className="nf-card p-5">
                <div
                  className="flex items-center gap-1"
                  role="img"
                  aria-label={`${review.rating} out of 5`}
                >
                  {Array.from({ length: 5 }, (_, star) => (
                    <UiIcon
                      key={star}
                      name="star"
                      size={14}
                      filled={star < Math.round(review.rating)}
                      className={
                        star < Math.round(review.rating)
                          ? "text-[var(--nf-rating)]"
                          : "text-[var(--nf-content-muted)] opacity-40"
                      }
                    />
                  ))}
                </div>

                <blockquote className="mt-3 text-[0.9375rem] leading-relaxed text-[var(--nf-content-secondary)]">
                  {review.body}
                </blockquote>

                <figcaption className="mt-4 flex items-center gap-3">
                  {/*
                    An initial, not a photograph. The database returns a
                    shortened public name and no avatar, and pulling a stock
                    face in beside a real person's words would attach a
                    stranger's identity to their sentence.
                  */}
                  <span
                    aria-hidden="true"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[0.8125rem] font-bold text-[var(--nf-content-on-brand)]"
                    style={{ background: "var(--nf-gradient-brand)" }}
                  >
                    {review.author.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0 leading-tight">
                    <span className="block truncate text-[0.875rem] font-semibold">
                      {review.author}
                    </span>
                    <span className="nf-numeric block text-[0.75rem] text-[var(--nf-content-muted)]">
                      {review.when}
                    </span>
                  </span>
                </figcaption>
              </figure>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  );
}
