import type { Dictionary } from "@vallo/i18n";
import { Reveal } from "@/components/site/Reveal";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import { Words } from "@/components/site/Words";

/**
 * "Why Vallo" value band.
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
/**
 * TWO PER LINE, SHORTER, AND THE OBJECTS ARE OURS.
 *
 * Two changes, both asked for and both the same idea: this band was taking a
 * full phone screen to say four short things. The bodies were two and three
 * lines each at a column width of about 150px, so every cell wrapped four or
 * five times and the row read as a wall. They are one line now, written to the
 * column rather than crammed into it.
 *
 * And the glyphs are the commissioned blue-and-white objects rather than
 * stroked vectors. The usual rule on the marketing page is the opposite - see
 * the note on `categories` in app/page.tsx, which argues that a row of rendered
 * toys reads as an app-store listing rather than as a company. That rule is
 * about a ROW OF FIVE at the top of the page. This is four cells further down,
 * at 32px, one per idea, and the owner is right that the objects are the thing
 * that makes this platform look like itself.
 *
 * "Agents are checked" still says what is true and now says it in the same
 * words the product does: the tick arrives after a person here has looked, not
 * before the listing goes live. That claim used to read "Every listing and
 * agent is checked before it goes live", which was false in both halves.
 */
export function WhyVallo({ t }: { t: Dictionary }) {
  void t;
  const values: { icon: BrandIconName; title: string; body: string }[] = [
    { icon: "user-verified", title: "Agents are checked", body: "A person here checks the agent before the tick appears." },
    { icon: "naira-hand", title: "Honest naira pricing", body: "The move-in total in full. No hidden charges." },
    { icon: "chat-duo", title: "Four languages", body: "English, Yoruba, Hausa and Igbo." },
    { icon: "map-spot", title: "Built for Nigeria", body: "Light, water and the gate, answered on every listing." },
  ];

  return (
    <section className="nf-shell py-section">
      <Reveal className="mb-block max-w-[52ch]">
        <h2 className="nf-h1">
          <Words text="Why Vallo" accentFrom={1} />
        </h2>
        <p className="nf-lede mt-group">
          What stands behind every search, every listing and every payment.
        </p>
      </Reveal>

      <Reveal>
        <ul className="nf-card nf-cells nf-cells--quad">
          {values.map((v) => (
            <li key={v.title} className="flex flex-col gap-inline p-cell">
              <span className="block h-8 w-8">
                <BrandIcon name={v.icon} fill />
              </span>
              <h3 className="nf-body-sm font-semibold leading-snug text-[var(--nf-content-primary)]">
                {v.title}
              </h3>
              <p className="nf-caption leading-snug text-[var(--nf-content-secondary)]">{v.body}</p>
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}
