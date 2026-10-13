import Link from "next/link";
import type { ReactNode } from "react";
import type { Dictionary, Locale } from "@vallo/i18n/core";
import { Icon3D } from "@/components/ui/Icon3D";
import { MotionReveal } from "@/components/motion/Reveal";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { NO_CUSTODY_SENTENCE, PAYMENT_GATE_SENTENCE } from "@/lib/money/copy";
import type { Door } from "./doors";
import { OsTabs, type OsLayer } from "./OsTabs";
import { SectionHead } from "./SectionHead";
import { landingMoments } from "./StackRoom";
import { BENTO_OBJECTS, LANDING_OBJECT_SIZE, OS_OBJECTS } from "./landing-objects";

type LayerKey = "trust" | "discover" | "intelligence" | "transactions" | "operations" | "ecosystem";

/**
 * THE PLATFORM BAND: the operating system for physical spaces, one layer at a
 * time (the handoff's Stage 3, "the Space OS narrative across Trust,
 * Discover, Intelligence, Transactions, Operations and ecosystem").
 *
 * WHY ONE BAND WITH SIX LAYERS AND NOT SIX ROOMS. The page used to say these
 * things in four rooms (the hands-on deck, the bento, the AI room and the
 * Property and Stays switch), 3,387px at 1440 between them, measured
 * before this pass with the height check's method. Said as
 * layers of one system they are one idea, which is the point an investor
 * should leave with, and the band is one screen tall. The rooms' words and
 * moments are kept: the deck's moments are the layers' moments
 * (`StackRoom.tsx`), the bento's doors are the ecosystem layer, and the AI
 * room's three truths are the intelligence layer's.
 *
 * TRUST LEADS. It is the foundation the other five stand on, and it is the
 * layer this market most needs: who is behind a listing, and the renter
 * passport, demonstrated on an example credential.
 *
 * THE TITLE IS THE POSITIONING LINE (D1: for investors, partners and press,
 * never the primary consumer line). The page's first line is the slogan, in
 * the hero; this band, a screen and a half down, is where the category
 * belongs. The lede says it in a reader's words.
 *
 * EACH LAYER: its name, one title, one or two sentences, a door, and its
 * moment drawn from the product's own components. The money sentences are
 * `lib/money/copy.ts` constants, verbatim. Every door is honest about where
 * it goes for a stranger (`doors.ts`).
 */
export function SpaceOsBand({
  t,
  locale,
  door,
  social = true,
}: {
  t: Dictionary;
  locale: Locale;
  door: Door;
  /** Whether Around is switched on (`isSocialEnabled`, read where the data is). When it is off the Around tile is not drawn, as the app's navigation drops it. */
  social?: boolean;
}) {
  const os = t.experienceLanding.os;
  const rooms = t.landingRooms;
  const moments = landingMoments(t, locale);
  const truths = t.home.aiCard.truths;
  const b = rooms.bento.cards;

  const allTiles: { key: keyof typeof BENTO_OBJECTS; href: string; title: string; body: string }[] = [
    { key: "rent", href: door("/search"), title: b.rent.title, body: b.rent.body },
    { key: "stays", href: door("/stays"), title: b.stays.title, body: b.stays.body },
    { key: "ai", href: door("/assistant"), title: b.ai.title, body: b.ai.body },
    { key: "price", href: door("/price"), title: b.price.title, body: b.price.body },
    { key: "messages", href: door("/messages"), title: b.messages.title, body: b.messages.body },
    { key: "feed", href: door("/around"), title: b.feed.title, body: b.feed.body },
  ];
  const tiles = allTiles.filter((tile) => social || tile.key !== "feed");

  const layer = (
    key: LayerKey,
    copy: { title: string; body: ReactNode; extra?: ReactNode; door?: { href: string; label: string } },
    stage: ReactNode,
  ): ReactNode => (
    <div className="nf-os__layer" data-layer={key}>
      <div className="nf-os__copy">
        {/* The layer's 3D object (the founder's art, 7 October), above its
            name; it lands with a small pop when the layer is chosen. */}
        <span className="nf-obj nf-os__obj" aria-hidden="true">
          <Icon3D name={OS_OBJECTS[key]} size={LANDING_OBJECT_SIZE.os} />
        </span>
        <p className="nf-section-label nf-os__name">{os.layers[key].tab}</p>
        <h3 className="nf-os__title">{copy.title}</h3>
        <div className="nf-os__body">{copy.body}</div>
        {copy.extra}
        {copy.door ? (
          <Link href={copy.door.href} prefetch={false} className="nf-room-link">
            {copy.door.label}
            <UiIcon name="arrow-right" size={16} aria-hidden />
          </Link>
        ) : null}
      </div>
      <div className="nf-os__moment nf-panel nf-panel--card">{stage}</div>
    </div>
  );

  const layers: OsLayer[] = [
    {
      key: "trust",
      label: os.layers.trust.tab,
      icon: "shield-check",
      panel: layer(
        "trust",
        {
          title: rooms.stack.cards.agent.title,
          body: <p>{rooms.stack.cards.agent.body}</p>,
          door: { href: "/check", label: t.publicDoors.nav.checkAgent },
        },
        moments.trust,
      ),
    },
    {
      key: "discover",
      label: os.layers.discover.tab,
      icon: "search",
      panel: layer(
        "discover",
        {
          title: rooms.journey.steps[0]?.title ?? "",
          body: <p>{rooms.journey.steps[0] && "body" in rooms.journey.steps[0] ? rooms.journey.steps[0].body : ""}</p>,
          door: { href: door("/search"), label: rooms.worlds.property.cta },
        },
        moments.discover,
      ),
    },
    {
      key: "intelligence",
      label: os.layers.intelligence.tab,
      icon: "bot",
      panel: layer(
        "intelligence",
        {
          title: rooms.ai.title,
          body: <p>{rooms.ai.body}</p>,
          extra: (
            <ul className="nf-os__points">
              {[truths.listings, truths.costs, truths.title].map((line) => (
                <li key={line}>
                  <UiIcon name="circle-check" size={16} aria-hidden />
                  {line}
                </li>
              ))}
            </ul>
          ),
          door: { href: door("/assistant"), label: rooms.ai.cta },
        },
        moments.intelligence,
      ),
    },
    {
      key: "transactions",
      label: os.layers.transactions.tab,
      icon: "banknote",
      panel: layer(
        "transactions",
        {
          title: rooms.stack.cards.pay.title,
          body: (
            <>
              <p>{PAYMENT_GATE_SENTENCE}</p>
              <p>{NO_CUSTODY_SENTENCE}</p>
            </>
          ),
          door: { href: "/safety", label: b.agree.title },
        },
        moments.transactions,
      ),
    },
    {
      key: "operations",
      label: os.layers.operations.tab,
      icon: "briefcase",
      panel: layer(
        "operations",
        {
          title: os.layers.operations.title,
          body: <p>{os.layers.operations.body}</p>,
          extra: (
            <p className="nf-os__doors">
              <Link href="/for-agents" prefetch={false} className="nf-room-link">
                {t.publicDoors.nav.forAgents}
                <UiIcon name="arrow-right" size={16} aria-hidden />
              </Link>
              <Link href="/for-hosts" prefetch={false} className="nf-room-link">
                {t.publicDoors.nav.forHosts}
                <UiIcon name="arrow-right" size={16} aria-hidden />
              </Link>
              <Link href="/for-landlords" prefetch={false} className="nf-room-link">
                {t.publicDoors.nav.forLandlords}
                <UiIcon name="arrow-right" size={16} aria-hidden />
              </Link>
            </p>
          ),
        },
        moments.operations,
      ),
    },
    {
      key: "ecosystem",
      label: os.layers.ecosystem.tab,
      icon: "grid",
      panel: layer(
        "ecosystem",
        { title: t.reel.places.title, body: <p>{t.reel.places.body}</p> },
        /* The bento's doors, as Plate rows: every one a real link to the
           surface it describes, honest for a stranger. */
        <ul className="nf-os__tiles">
          {tiles.map((tile) => (
            <li key={tile.key}>
              <Link href={tile.href} prefetch={false} className="nf-os__tile">
                <span className="nf-obj nf-os__tile-obj" aria-hidden="true">
                  <Icon3D name={BENTO_OBJECTS[tile.key]} size={LANDING_OBJECT_SIZE.tile} />
                </span>
                <span className="nf-os__tile-text">
                  <span className="nf-os__tile-title">{tile.title}</span>
                  <span className="nf-os__tile-body">{tile.body}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>,
      ),
    },
  ];

  return (
    <section className="nf-shell nf-room" data-chapter="os" aria-labelledby="nf-landing-os-title">
      <SectionHead id="nf-landing-os-title" eyebrow={os.overline} title={t.landing.positioning} lede={os.lede} align="center" />
      <MotionReveal>
        <OsTabs layers={layers} label={os.tabsLabel} />
      </MotionReveal>
    </section>
  );
}
