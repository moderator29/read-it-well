import type { Metadata } from "next";
import { Reveal } from "@/components/site/Reveal";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "About",
  description:
    "Vallo is Nigeria's all-in-one property marketplace: homes, shortlets, hotels, shops, offices and land, listed by verified people, in the languages Nigerians actually speak.",
};

/**
 * About page.
 *
 * One narrative: what Vallo is, why it exists (mission), where it is going
 * (vision), and the values that shape every decision. Glass cards over the
 * aurora, mobile-first, in the same voice as the landing page.
 */
export default function AboutPage() {
  const values: { icon: BrandIconName; title: string; body: string }[] = [
    {
      icon: "shield-check",
      title: "Trust before traffic",
      /* This card claimed every listing is checked and every agent is
         identity-verified. Zero listings are verified, which a check constraint
         enforces, so the sentence was not merely optimistic, it was a
         verification claim the database is built to refuse. What follows is
         what is actually true and it is a stronger thing to say: the ladder
         exists, it gates being paid, and nothing arrives from an outside feed. */
      body: "Nothing here came from a feed. Every listing was put up by a named person who applied to be here, and an agent climbs a verification ladder before any money can reach them. We would rather grow slowly than carry a place nobody can be held to.",
    },
    {
      icon: "globe-pin",
      title: "Speak people's language",
      body: "Vallo works in English, Yorùbá, Hausa and Igbo, because renting a flat, buying a house or taking a shop should never require translating your own country.",
    },
    {
      /* This card used to say "we earn only when a booking completes", which
         promised a commission the platform does not charge. The fee position
         (PRODUCT.md section 3) is that Vallo charges nothing, so the card now
         says that. */
      icon: "wallet-secure",
      title: "Fair to both sides",
      body: "Listing is free and the platform charges no fee: not to look, not to book, not to be paid, in any market here. What anybody pays is what the agent receives, less only the payment processor's own charge.",
    },
    {
      icon: "house-sparkle",
      title: "Built for Nigerian reality",
      body: "Inspection before payment, naira pricing, Nigerian bank payouts, and support that understands Lagos traffic and Abuja weekends. Local is not a feature, it is the foundation.",
    },
  ];

  /* Until this pass the grid held Stays, Hotels, Food and Experiences: the
     product's earlier scope, with no property in it. It now carries the whole
     marketplace. Six cards, because four could not hold nine markets without
     lying by omission. */
  const categories: { icon: BrandIconName; title: string; body: string }[] = [
    { icon: "keys-home", title: "Rentals", body: "Annual homes and flats. Message the agent, inspect, then pay." },
    { icon: "house-sparkle", title: "Property for sale", body: "Homes, apartments and villas, offered by the person accountable for them." },
    { icon: "home-search", title: "Commercial and land", body: "Shops, offices and plots, let on a tenancy or offered for sale." },
    { icon: "homes-sparkle", title: "Stays", body: "Shortlets, apartments and villas for a night or a season." },
    { icon: "hotel-star", title: "Hotels", body: "From guesthouses to city landmarks, listed by the people who run them." },
    { icon: "gift", title: "Food and experiences", body: "Restaurants worth crossing town for, and things worth leaving the house for." },
  ];

  return (
    <div className="nf-shell py-section">
      <div className="mx-auto max-w-3xl">
        {/* -------------------------------------------------------- hero */}
        <div className="nf-rise text-center">
          <span className="nf-chip mx-auto">
            <span className="inline-grid h-4 w-4 place-items-center">
              <BrandIcon name="house-sparkle" fill />
            </span>
            About Vallo
          </span>
          {/* The about page says what the company does; the slogan lives beside
              the logo, not here. See PRODUCT.md section 7. */}
          <h1 className="nf-h1 mx-auto mt-heading max-w-[24ch]">
            Rent, buy or sell property, with the fear taken out.
          </h1>
          <p className="mx-auto mt-group max-w-[56ch] text-[var(--nf-content-secondary)]">
            Vallo is Nigeria&apos;s all-in-one property marketplace: homes to rent or
            buy, shortlets and hotels, shops, offices and land, with a naira wallet
            and the areas around them. Every listing was put up by a real person we
            have checked, and the whole product works in the languages Nigerians
            actually speak.
          </p>
        </div>

        {/* ----------------------------------------------------- mission */}
        <Reveal as="section" className="mt-section">
          <div className="nf-card p-card-lg">
            <h2 className="nf-overline">Our mission</h2>
            <p className="mt-row text-[1.0625rem] font-medium leading-relaxed sm:text-[1.125rem]">
              To make finding and booking a place in Nigeria as safe and simple as
              messaging a friend, so that nobody pays for a room that does not exist,
              queues for an agent who never shows, or settles for less because the good
              options were hidden.
            </p>
            <p className="mt-row text-[0.9375rem] leading-relaxed text-[var(--nf-content-secondary)]">
              Too much of Nigerian renting and travel still runs on hearsay, unverified
              middlemen and payments made on trust alone. We are replacing that with
              verified listings, secure payments and honest reviews, one booking at a
              time.
            </p>
          </div>
        </Reveal>

        {/* ------------------------------------------------------ vision */}
        <Reveal as="section" className="mt-heading">
          <div className="nf-card p-card-lg">
            <h2 className="nf-overline">Our vision</h2>
            <p className="mt-row text-[1.0625rem] font-medium leading-relaxed sm:text-[1.125rem]">
              A Nigeria, and eventually an Africa, where anyone can discover, trust and
              book any space, from a Lagos shortlet to a Calabar kitchen, in their own
              language and their own currency.
            </p>
          </div>
        </Reveal>

        {/* ------------------------------------------------- what we do */}
        <Reveal as="section" className="mt-section">
          <h2 className="nf-overline text-center">What lives on Vallo</h2>
          <ul className="mt-group grid grid-cols-2 gap-group">
            {categories.map((c, i) => (
              <Reveal key={c.title} as="li" delay={i * 70} className="h-full">
                <div className="nf-card flex h-full flex-col items-start gap-row p-card-sm">
                  <span className="inline-grid h-13 w-13 place-items-center">
                    <BrandIcon name={c.icon} fill />
                  </span>
                  <span className="font-semibold">{c.title}</span>
                  <span className="text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
                    {c.body}
                  </span>
                </div>
              </Reveal>
            ))}
          </ul>
        </Reveal>

        {/* ------------------------------------------------------ values */}
        <Reveal as="section" className="mt-section">
          <h2 className="nf-overline text-center">What we stand for</h2>
          <div className="mt-group space-y-row">
            {values.map((v, i) => (
              <Reveal key={v.title} delay={i * 60}>
                <div className="nf-card flex items-start gap-group p-card">
                  <span className="inline-grid h-16 w-16 shrink-0 place-items-center">
                    <BrandIcon name={v.icon} fill />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold">{v.title}</span>
                    <span className="mt-inline-tight block text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
                      {v.body}
                    </span>
                  </span>
                </div>
              </Reveal>
            ))}
          </div>
        </Reveal>

        {/* -------------------------------------------------- final call */}
        <Reveal as="section" className="mt-section">
          <div className="nf-card p-card text-center-lg">
            <h2 className="nf-h2 mx-auto max-w-[22ch]">Come and build this with us</h2>
            <p className="mx-auto mt-row max-w-[48ch] text-[0.9375rem] text-[var(--nf-content-secondary)]">
              Whether you are looking for your next stay, want to list a property, or
              want to join the team, there is a place for you here.
            </p>
            <div className="mt-heading flex flex-wrap items-center justify-center gap-group">
              <ButtonLink
                href="/agents"
                variant="primary"
                size="lg"
                trailingIcon="arrow-right"
              >
                Become an agent
              </ButtonLink>
              <ButtonLink href="/careers" variant="secondary" size="lg">
                See careers
              </ButtonLink>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
