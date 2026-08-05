import type { Metadata } from "next";
import { Reveal } from "@/components/site/Reveal";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "About",
  description:
    "RentMe is a Nigeria-first platform for discovering and booking verified homes, hotels, restaurants and experiences, in the languages Nigerians actually speak.",
};

/**
 * About page.
 *
 * One narrative: what RentMe is, why it exists (mission), where it is going
 * (vision), and the values that shape every decision. Glass cards over the
 * aurora, mobile-first, in the same voice as the landing page.
 */
export default function AboutPage() {
  const values: { icon: BrandIconName; title: string; body: string }[] = [
    {
      icon: "shield-check",
      title: "Trust before traffic",
      body: "Every listing is checked and every agent is identity-verified before a single guest sees them. We would rather grow slowly than list a place we cannot stand behind.",
    },
    {
      icon: "globe-pin",
      title: "Speak people's language",
      body: "RentMe works in English, Yoruba, Hausa and Igbo, because booking a home for your family should never require translating your own country.",
    },
    {
      icon: "wallet-secure",
      title: "Fair to both sides",
      body: "Guests pay securely and agents get paid promptly. Listing is free, and we earn only when a booking completes, so our incentives sit exactly where yours do.",
    },
    {
      icon: "house-sparkle",
      title: "Built for Nigerian reality",
      body: "Inspection before payment, naira pricing, Nigerian bank payouts, and support that understands Lagos traffic and Abuja weekends. Local is not a feature, it is the foundation.",
    },
  ];

  const categories: { icon: BrandIconName; title: string; body: string }[] = [
    { icon: "homes-sparkle", title: "Stays", body: "Shortlets, apartments and homes for a night or a season." },
    { icon: "hotel-star", title: "Hotels", body: "From boutique guesthouses to city landmarks." },
    { icon: "gift", title: "Food", body: "Restaurants and kitchens worth crossing town for." },
    { icon: "luggage-check", title: "Experiences", body: "Events, outings and adventures across the country." },
  ];

  return (
    <div className="nf-shell py-12 sm:py-16">
      <div className="mx-auto max-w-3xl">
        {/* -------------------------------------------------------- hero */}
        <div className="nf-rise text-center">
          <span className="nf-chip mx-auto">
            <span className="inline-grid h-4 w-4 place-items-center">
              <BrandIcon name="house-sparkle" fill />
            </span>
            About RentMe
          </span>
          <h1 className="nf-h1 mx-auto mt-5 max-w-[16ch]">Find it. Rent it. Love it.</h1>
          <p className="mx-auto mt-4 max-w-[56ch] text-[var(--nf-content-secondary)]">
            RentMe is a Nigeria-first platform for discovering and booking places to
            stay, eat and explore. We bring verified homes, hotels, restaurants and
            experiences into one trusted place, in the languages Nigerians actually speak.
          </p>
        </div>

        {/* ----------------------------------------------------- mission */}
        <Reveal as="section" className="mt-14">
          <div className="nf-card p-6 sm:p-8">
            <h2 className="nf-overline">Our mission</h2>
            <p className="mt-3 text-[1.0625rem] font-medium leading-relaxed sm:text-[1.125rem]">
              To make finding and booking a place in Nigeria as safe and simple as
              messaging a friend, so that nobody pays for a room that does not exist,
              queues for an agent who never shows, or settles for less because the good
              options were hidden.
            </p>
            <p className="mt-3 text-[0.9375rem] leading-relaxed text-[var(--nf-content-secondary)]">
              Too much of Nigerian renting and travel still runs on hearsay, unverified
              middlemen and payments made on trust alone. We are replacing that with
              verified listings, secure payments and honest reviews, one booking at a
              time.
            </p>
          </div>
        </Reveal>

        {/* ------------------------------------------------------ vision */}
        <Reveal as="section" className="mt-6">
          <div className="nf-card p-6 sm:p-8">
            <h2 className="nf-overline">Our vision</h2>
            <p className="mt-3 text-[1.0625rem] font-medium leading-relaxed sm:text-[1.125rem]">
              A Nigeria, and eventually an Africa, where anyone can discover, trust and
              book any space, from a Lagos shortlet to a Calabar kitchen, in their own
              language and their own currency.
            </p>
          </div>
        </Reveal>

        {/* ------------------------------------------------- what we do */}
        <Reveal as="section" className="mt-14">
          <h2 className="nf-overline text-center">What lives on RentMe</h2>
          <ul className="mt-4 grid grid-cols-2 gap-4 sm:gap-4">
            {categories.map((c, i) => (
              <Reveal key={c.title} as="li" delay={i * 70} className="h-full">
                <div className="nf-card flex h-full flex-col items-start gap-3 p-4 sm:p-5">
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
        <Reveal as="section" className="mt-14">
          <h2 className="nf-overline text-center">What we stand for</h2>
          <div className="mt-4 space-y-3">
            {values.map((v, i) => (
              <Reveal key={v.title} delay={i * 60}>
                <div className="nf-card flex items-start gap-4 p-5 sm:p-6">
                  <span className="inline-grid h-16 w-16 shrink-0 place-items-center">
                    <BrandIcon name={v.icon} fill />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold">{v.title}</span>
                    <span className="mt-1 block text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
                      {v.body}
                    </span>
                  </span>
                </div>
              </Reveal>
            ))}
          </div>
        </Reveal>

        {/* -------------------------------------------------- final call */}
        <Reveal as="section" className="mt-14">
          <div className="nf-card p-7 text-center sm:p-9">
            <h2 className="nf-h2 mx-auto max-w-[22ch]">Come and build this with us</h2>
            <p className="mx-auto mt-3 max-w-[48ch] text-[0.9375rem] text-[var(--nf-content-secondary)]">
              Whether you are looking for your next stay, want to list a property, or
              want to join the team, there is a place for you here.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
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
