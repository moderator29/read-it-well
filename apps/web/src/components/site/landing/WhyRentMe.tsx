import type { Dictionary } from "@naijafinds/i18n";
import { Reveal } from "@/components/site/Reveal";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { Words } from "@/components/site/Words";

/**
 * "Why RentMe" value band.
 *
 * ONE SURFACE, FOUR CELLS. It was four cards, two up on a phone and four across
 * on desktop, each one a bordered blurred container holding a 48px 3D object,
 * a 15px title and 13px of body. Four containers for four sentences that only
 * mean anything read together, and at phone width the four borders took more
 * of the row than the words inside them did.
 *
 * "VERIFIED EVERYTHING" IS GONE, and that is a copy fix rather than a layout
 * one. It was the platform's own version of the absolute claim both reference
 * platforms lead with and neither can support - "100 percent verified" over a
 * marketplace where verification is a queue somebody is standing in. What
 * replaces it says what is actually true: every agent goes through a check
 * before they can trade. That is a process, it is real, and it survives
 * somebody finding one listing they do not like.
 */
export function WhyRentMe({ t }: { t: Dictionary }) {
  const values: { icon: UiIconName; title: string; body: string }[] = [
    {
      icon: "verified",
      title: "Agents are checked",
      body: t.landing.vision.points.verified.body,
    },
    {
      icon: "wallet",
      title: "Honest naira pricing",
      body: t.landing.vision.points.naira.body,
    },
    {
      icon: "chat-bubble",
      title: "Four languages",
      /* Was `t.landing.trust.multiLanguage.body`, which is the string
         "EN / YO / HA / IG". That is a legend, not a sentence, and it was the
         only cell in the row that did not read as one. */
      body: "English, Yoruba, Hausa and Igbo, across every screen.",
    },
    {
      icon: "location",
      title: "Built for Nigeria",
      body: "Made here, for the way property is actually rented and sold here.",
    },
  ];

  return (
    <section className="nf-shell py-12 sm:py-16">
      <Reveal className="mb-8 max-w-[52ch] sm:mb-10">
        <h2 className="nf-h1">
          <Words text="Why RentMe" accentFrom={1} />
        </h2>
        {/* Was "every search, booking and stay". Nobody stays in a flat they
            have taken a year's lease on, and "stay" is the word this platform
            keeps borrowing from the hotel product it is not. */}
        <p className="nf-lede mt-4">
          What stands behind every search, every listing and every payment.
        </p>
      </Reveal>

      <Reveal>
        <ul className="nf-card nf-cells nf-cells--quad">
          {values.map((v) => (
            <li key={v.title} className="flex flex-col gap-3 p-6 sm:p-7">
              <UiIcon
                name={v.icon}
                size={28}
                className="shrink-0 text-[var(--nf-content-primary)]"
              />
              <h3 className="nf-body font-semibold text-[var(--nf-content-primary)]">
                {v.title}
              </h3>
              <p className="nf-body-sm text-[var(--nf-content-secondary)]">{v.body}</p>
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}
