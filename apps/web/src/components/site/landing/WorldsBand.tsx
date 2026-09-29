import type { Dictionary, Locale } from "@vallo/i18n/core";
import type { ListingKind } from "@/lib/listings/types";
import type { MiniListing } from "@/lib/site/listing-card";
import type { Door } from "./doors";
import { SectionHead } from "./SectionHead";
import { TwoWorlds } from "./TwoWorlds";

const STAY_KINDS: ReadonlySet<ListingKind> = new Set(["shortlet", "hotel", "villa", "apartment"]);

/** The Property / Stays room (Track M, second pass); the switch is TwoWorlds. */
export function WorldsBand({ t, locale, cards, door }: { t: Dictionary; locale: Locale; cards: MiniListing[]; door: Door }) {
  const w = t.landingRooms.worlds;
  const stays = cards.filter((c) => STAY_KINDS.has(c.kind)).slice(0, 3);
  const property = cards.filter((c) => !STAY_KINDS.has(c.kind)).slice(0, 3);
  return (
    <section className="nf-shell nf-room" data-chapter="worlds" aria-labelledby="nf-landing-worlds-title">
      <SectionHead id="nf-landing-worlds-title" eyebrow={w.overline} title={`${w.property.label}. ${w.stays.label}.`} align="center" />
      <TwoWorlds
        property={w.property}
        stays={w.stays}
        listings={{ property, stays }}
        locale={locale}
        verifiedLabel={t.landing.face.card.verified}
        exampleLabel={t.landing.face.card.example}
        hrefs={{ property: door("/search"), stays: door("/stays") }}
      />
    </section>
  );
}
