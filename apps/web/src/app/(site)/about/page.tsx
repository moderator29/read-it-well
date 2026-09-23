import type { Metadata } from "next";
import { SiteHead } from "@/components/site/SiteHead";
import { Reveal } from "@/components/site/Reveal";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "About",
  description:
    "Vallo is one app with two sides: Property for renting, buying and selling, and Vallo Stays for hotels, apartments, guest houses, resorts and restaurant tables. Homes, land, hotels and shortlets across Nigeria, one account, one naira wallet, four languages.",
};

/**
 * About page.
 *
 * One narrative: what Vallo is, why it exists (mission), where it is going
 * (vision), and the values that shape every decision. Glass cards over the
 * aurora, mobile-first, in the same voice as the landing page.
 *
 * THE POSITION THIS PAGE NOW ARGUES, AND IT IS THE LANDING HEADLINE'S.
 * Vallo does not remove the agent. Vallo removes the runaround: agent fees
 * stacked on agent fees, chains of agents on one property, scattered listings
 * and costs nobody will state before you have spent a Saturday in traffic.
 * Every card below says one part of that, and none of them says it about a
 * continent. NIGERIA, NOT AFRICA, until the fact changes.
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
      body: "Nothing here came from a feed. Every listing was put up by a named person who applied to be here, and a lister climbs a verification ladder before any money can reach them. We would rather grow slowly than carry a place nobody can be held to.",
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
      body: "Listing is free and the platform charges no fee: not to look, not to book, not to be paid, in any market here. What anybody pays is what the lister receives, less only the payment processor's own charge. Where an agent charges a fee of their own, it is theirs and it is stated on the listing rather than met at the door.",
    },
    {
      icon: "house-sparkle",
      title: "Built for Nigerian reality",
      body: "Inspection before payment, naira pricing, Nigerian bank payouts, and support that understands Lagos traffic and Abuja weekends. Local is not a feature, it is the foundation.",
    },
  ];

  /* Until this pass the grid held Stays, Hotels, Food and Experiences: the
     product's earlier scope, with no property in it. It then carried the
     property markets and lost the Stays half again. It now carries BOTH
     SIDES, three cards each, and the sixth card no longer says "experiences",
     which is not a category this platform has and never was: it says
     restaurants, which is a shipped surface at /restaurants. */
  const categories: { icon: BrandIconName; title: string; body: string }[] = [
    { icon: "keys-home", title: "Rentals", body: "Annual homes and flats on the Property side. Message the lister, inspect, then pay." },
    { icon: "house-sparkle", title: "Property for sale", body: "Homes, apartments and villas, offered by the person accountable for them." },
    { icon: "home-search", title: "Commercial and land", body: "Shops, offices and plots, let on a tenancy or offered for sale." },
    { icon: "homes-sparkle", title: "Stays", body: "Shortlets, apartments, resorts and serviced flats on Vallo Stays, for a night or a season." },
    { icon: "hotel-star", title: "Hotels and guest houses", body: "From a guest house to a city landmark, listed by the people who run them." },
    { icon: "concierge-bell", title: "Restaurants", body: "Ask for a table, and the restaurant answers. No money moves for a reservation." },
  ];

  return (
    <>
      {/* The about page says what the company does; the slogan lives beside
          the logo, not here. See PRODUCT.md section 7. */}
      <SiteHead
        plate="skyline-bridge-dusk"
        icon="house-sparkle"
        chip="About Vallo"
        title="Rent, buy or stay. Without the runaround."
        lede="Vallo is one app with two sides. Property is renting, buying and selling: homes, shops, offices and land across Nigeria, with listers checked by a person and an inspection before any money moves. Vallo Stays is the nightly side: hotels, apartments, guest houses, resorts, serviced flats and restaurant tables. One account, one naira wallet, and the whole product working in the languages Nigerians actually speak."
      />
    <div className="nf-shell pb-section">
      <div className="mx-auto max-w-3xl">

        {/* ----------------------------------------------------- mission */}
        <Reveal as="section" className="mt-section">
          <div className="nf-panel nf-panel--card block p-card-lg">
            <h2 className="nf-overline">Our mission</h2>
            <p className="mt-row text-[1.0625rem] font-medium leading-relaxed sm:text-[1.125rem]">
              To make finding a place in Nigeria as safe and simple as messaging a
              friend, whether it is a flat for the year, a house to buy, a hotel room
              for Friday or a table for six, so that nobody pays for a room that does
              not exist, queues for an agent who never shows, or settles for less
              because the good options were hidden.
            </p>
            <p className="mt-row text-[0.9375rem] leading-relaxed text-[var(--nf-content-secondary)]">
              Too much of Nigerian renting still runs on hearsay, a chain of agents on
              one property and a cost nobody will state until you are standing in the
              flat. We are not removing the agent, who holds most of the supply in this
              market and earns their fee. We are removing the runaround: listers checked
              by a person, the move-in cost written down before you call anybody,
              payments that leave a reference, and reviews attached to stays that
              actually happened.
            </p>
          </div>
        </Reveal>

        {/* ------------------------------------------------------ vision */}
        <Reveal as="section" className="mt-heading">
          <div className="nf-panel nf-panel--card block p-card-lg">
            <h2 className="nf-overline">Our vision</h2>
            <p className="mt-row text-[1.0625rem] font-medium leading-relaxed sm:text-[1.125rem]">
              A Nigeria where anyone can find a place, see the whole cost of it and
              deal with whoever is actually behind it, from a Lagos flat let for the
              year to a Calabar kitchen held for one evening, in their own language
              and their own currency.
            </p>
          </div>
        </Reveal>

        {/* ------------------------------------------------- what we do */}
        <Reveal as="section" className="mt-section">
          <h2 className="nf-overline text-center">What lives on Vallo</h2>
          <ul className="mt-group grid grid-cols-2 gap-group">
            {categories.map((c, i) => (
              <Reveal key={c.title} as="li" delay={i * 70} className="h-full">
                <div className="nf-panel nf-panel--card flex h-full flex-col items-start gap-row p-card-sm">
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
                <div className="nf-panel nf-panel--card flex flex-row items-start gap-group p-card">
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
          <div className="nf-panel nf-panel--card block p-card text-center-lg">
            <h2 className="nf-h2 mx-auto max-w-[22ch]">Come and build this with us</h2>
            <p className="mx-auto mt-row max-w-[48ch] text-[0.9375rem] text-[var(--nf-content-secondary)]">
              Whether you are looking for your next place, want to list a property you
              own or manage, want to let a room by the night, or want to join the team,
              there is a place for you here.
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
    </>
  );
}
