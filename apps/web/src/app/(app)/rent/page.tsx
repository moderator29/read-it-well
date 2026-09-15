import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary, type Locale } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { getListingRepository } from "@/lib/listings/repository";
import { getMessageRepository } from "@/lib/messages/repository";
import { ListingCard } from "@/components/app/ListingCard";
import { PageHeader } from "@/components/app/PageHeader";
import { PageScene } from "@/components/app/PageScene";
import { SceneBanner } from "@/components/app/SceneBanner";
import { Reveal } from "@/components/site/Reveal";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Rent",
  robots: { index: false, follow: false },
};

/**
 * The rent market. Annual tenancies, not lodging: real homes at real yearly
 * rent. There is no Reserve here by design. The path is message the agent,
 * inspect the property, then pay, and every step stays inside the platform
 * where the trust pipeline can protect it.
 */

const CITIES = ["Lagos", "Abuja", "Port Harcourt", "Enugu"];

export default async function RentPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  const { q } = await searchParams;

  const repo = getListingRepository();
  const messages = getMessageRepository();
  const rentals = await repo.search({ q, kind: "rental" });

  // Each card's message button deep links into the existing thread about
  // that listing when one exists, otherwise into the conversation list.
  const messageHrefs = new Map<string, string>();
  for (const r of rentals) {
    const conversationId = await messages.conversationIdForListing(r.id);
    messageHrefs.set(r.id, conversationId ? `/messages/${conversationId}` : "/messages");
  }

  return (
    <>
      <div className="relative">
        <PageScene art="/brand/story-search.png" />
      <PageHeader title={t.nav.rent} />
      </div>

      <Reveal as="section" className="mt-2">
        <p className="max-w-[52ch] text-[0.9375rem] leading-relaxed text-[var(--nf-content-secondary)]">
          Homes for real rent, priced per year. Message the agent, inspect the
          property, then pay. Verified listings only.
        </p>

        {/* The safety rule of the rent market, stated up front. */}
        <div className="nf-card mt-4 flex items-start gap-4 p-4">
          <UiIcon
            name="verified"
            size={20}
            className="mt-0.5 shrink-0 text-[var(--nf-state-success)]"
          />
          <p className="text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]">
            For your safety, keep every chat and payment inside Vallo. Deals
            made outside the platform are not protected by us. Pay only after
            you have inspected the property.
          </p>
        </div>

        <SceneBanner
          art="/brand/story-shield.png"
          alt="The Vallo shield mark with a verification check"
          stage="paper"
          title="Every rental here is checked"
          body="Listings and agents are verified before they go live, and the whole conversation stays inside Vallo."
          href="/help"
          action="How we protect you"
          className="mt-4"
        />

        <nav aria-label="Rent by city" className="nf-scroll-x -mx-5 mt-4 md:-mx-8">
          <ul className="flex gap-2 px-5 md:px-8">
            {CITIES.map((city) => {
              const active = q?.trim().toLowerCase() === city.toLowerCase();
              return (
                <li key={city} className="shrink-0">
                  <Link
                    href={active ? "/rent" : `/rent?q=${encodeURIComponent(city)}`}
                    prefetch
                    aria-current={active ? "true" : undefined}
                    className={`nf-chip whitespace-nowrap transition-transform active:scale-[0.96] ${
                      active ? "nf-chip--active" : ""
                    }`}
                  >
                    <UiIcon name="location" size={12} className="shrink-0 opacity-70" />
                    {city}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </Reveal>

      <Reveal className="mt-5" delay={60}>
        {rentals.length === 0 ? (
          <div className="nf-card p-10 text-center">
            <span className="nf-story-art mx-auto block h-20 w-20">
              <BrandIcon name="keys-home" fill />
            </span>
            <p className="mt-4 font-semibold">No rentals matched</p>
            <p className="mt-1 text-[0.875rem] text-[var(--nf-content-muted)]">
              Try another city, or browse everything for rent.
            </p>
            <ButtonLink href="/rent" variant="secondary" className="mt-6">
              {t.nav.rent}
            </ButtonLink>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {rentals.map((r) => (
              <li key={r.id} className="flex flex-col gap-3">
                <ListingCard listing={r} locale={locale} t={t} />
                <ButtonLink
                  href={messageHrefs.get(r.id) ?? "/messages"}
                  variant="primary"
                  full
                  leadingIcon="chat-bubble"
                >
                  Message agent
                </ButtonLink>
              </li>
            ))}
          </ul>
        )}
      </Reveal>
    </>
  );
}
