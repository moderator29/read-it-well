import { plural, type Locale } from "@vallo/i18n/core";
import type { Dictionary } from "@vallo/i18n/core";
import type { DiscoveryCard, DiscoveryRow, DiscoverySection } from "@/lib/social/people-discovery-model";
import type { FollowSuggestion } from "@/lib/social/follow-suggestions";
import { PersonCard, PersonRowItem, type PersonCardData } from "./PersonCards";
import "./people-v2.css";

type Words = Dictionary["feedV2"]["people"];

const TITLES: Record<DiscoverySection, keyof Words> = {
  "top-landlords": "topLandlords",
  "top-agents": "topAgents",
  "top-hotels": "topHotels",
  "most-followed": "mostFollowed",
};

/** A discovery card as the card component draws it. Every figure is a count the database holds. */
export function cardOfDiscovery(card: DiscoveryCard, w: Words, locale: Locale): PersonCardData {
  const roleWord =
    card.role === "landlord" ? w.roleLandlord : card.role === "agent" ? w.roleAgent : card.role === "hotel" ? w.roleHotel : null;
  const facts: string[] = [];
  if (card.followers !== null) facts.push(plural(card.followers, w.followers, locale));
  if (card.metric) facts.push(plural(card.metric.count, w[card.metric.kind], locale));
  return {
    key: card.key,
    href: card.href,
    name: card.name,
    handle: card.handle,
    avatarUrl: card.avatarUrl,
    tier: card.tier,
    roleWord,
    facts,
    action: card.isViewer
      ? { kind: "you", label: w.you }
      : card.followable && card.handle
        ? { kind: "follow", handle: card.handle, following: card.viewerFollows }
        : {
            kind: "view",
            label: w.viewHotel,
            ariaLabel: w.viewHotelAria.replace("{name}", card.name),
            href: card.href,
          },
  };
}

/** A suggestion as a row of the "People to follow" list. */
export function cardOfSuggestion(person: FollowSuggestion, w: Words): PersonCardData {
  const roleWord = {
    agent: w.roleAgent,
    agency: w.roleAgency,
    landlord: w.roleLandlord,
    hotel: w.roleHotel,
    restaurant: w.roleRestaurant,
  }[person.kind];
  return {
    key: person.userId,
    href: `/u/${person.handle}`,
    name: person.displayLabel,
    handle: person.handle,
    avatarUrl: person.avatarUrl || null,
    tier: person.tier,
    roleWord,
    facts: person.city ? [person.city] : [],
    action: { kind: "follow", handle: person.handle, following: false },
  };
}

/**
 * THE ROWS AND THE LIST UNDER THE SEARCH. A row with nobody in it is not
 * drawn (the rows arrive already filtered: `visibleRows`), and the list is
 * absent when there is nobody to suggest, so the page never shows a heading
 * over nothing.
 */
export function PeopleSections({
  rows,
  suggestions,
  signedIn,
  words,
  locale,
}: {
  rows: DiscoveryRow[];
  suggestions: FollowSuggestion[];
  signedIn: boolean;
  words: Words;
  locale: Locale;
}) {
  return (
    <>
      {rows.map((row) => {
        const id = `nf-ppl-${row.id}`;
        return (
          <section key={row.id} className="nf-ppl__section" aria-labelledby={id} data-testid={`people-row-${row.id}`}>
            <h2 id={id} className="nf-ppl__title">
              {words[TITLES[row.id]] as string}
            </h2>
            <ul className="nf-ppl__row">
              {row.cards.map((card) => (
                <PersonCard
                  key={card.key}
                  card={cardOfDiscovery(card, words, locale)}
                  signedIn={signedIn}
                  openLabel={words.openProfile.replace("{name}", card.name)}
                />
              ))}
            </ul>
          </section>
        );
      })}

      {suggestions.length > 0 ? (
        <section className="nf-ppl__section" aria-labelledby="nf-ppl-suggested" data-testid="people-to-follow">
          <h2 id="nf-ppl-suggested" className="nf-ppl__title">
            {words.peopleToFollow}
          </h2>
          <ul className="nf-ppl__list">
            {suggestions.map((person) => (
              <PersonRowItem
                key={person.userId}
                card={cardOfSuggestion(person, words)}
                signedIn={signedIn}
                openLabel={words.openProfile.replace("{name}", person.displayLabel)}
              />
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
